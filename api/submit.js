const https = require('https');
const querystring = require('querystring');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : {};
      const {
        name = '',
        plz = '',
        telefon = '',
        email = '',
        groesse = '',
        grundstueck = '',
        interesse = '',
        kontakt = '',
        source = 'Website',
        utm = '',
        url = ''
      } = data;

      if (data.zustimmung !== 'ja' && !kontakt) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Zustimmung erforderlich' }));
        return;
      }

      const contact = email || telefon || kontakt || '';
      if (!contact) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Kontaktdaten erforderlich' }));
        return;
      }

      const intArr = Array.isArray(interesse) ? interesse.join(', ') : interesse;
      const text = [
        '*Neue Haus-Anfrage*',
        `Quelle: ${source}`,
        `Größe: ${groesse || '-'}`,
        `Grundstück: ${grundstueck || '-'}`,
        `Interessen: ${intArr || '-'}`,
        `Name: ${name || '-'}`,
        `PLZ: ${plz || '-'}`,
        `Telefon: ${telefon || '-'}`,
        `E-Mail: ${email || '-'}`,
        `Kontakt: ${kontakt || '-'}`,
        `UTM: ${utm || '-'}`,
        `URL: ${url || '-'}`
      ].join('\n');

      if (!token || !chatId) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Telegram nicht konfiguriert' }));
        return;
      }

      const q = querystring.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' });
      const tReq = https.request(
        `https://api.telegram.org/bot${token}/sendMessage?${q}`,
        { method: 'GET' },
        tRes => {
          let tBody = '';
          tRes.on('data', c => { tBody += c; });
          tRes.on('end', () => {
            if (tRes.statusCode >= 200 && tRes.statusCode < 300) {
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true }));
            } else {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: 'Telegram-Fehler' }));
            }
          });
        }
      );
      tReq.on('error', () => {
        res.statusCode = 502;
        res.end(JSON.stringify({ error: 'Verbindungsfehler' }));
      });
      tReq.end();
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Ungültige Daten' }));
    }
  });
};
