(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Testumgebung: keine echten Anfragen senden (nur Produktion sendet an /api/submit)
  const PROD_HOSTS = ['servushaus.de', 'www.servushaus.de', 'servus-haus-eight.vercel.app'];
  const IS_TEST = !PROD_HOSTS.includes(window.location.hostname);

  function track(name, params = {}) {
    if (typeof gtag === 'function') gtag('event', name, params);
  }

  function setUtmAndUrl() {
    const params = new URLSearchParams(window.location.search);
    const utm = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']
      .map(k => `${k}=${params.get(k) || ''}`).join('&');
    const url = window.location.href;
    $$('.utm-field').forEach(el => el.value = utm);
    $$('.url-field').forEach(el => el.value = url);
  }
  setUtmAndUrl();

  $$('a[data-cta], button[data-cta]').forEach(el => {
    el.addEventListener('click', () => {
      track('cta_click', { cta_label: el.dataset.cta });
      const size = el.dataset.setSize;
      if (size) {
        const radio = $(`input[name="groesse"][value="${size}"]`);
        if (radio) radio.checked = true;
      }
    });
  });

  const menuToggle = $('.menu-toggle');
  const mobileMenu = $('#mobile-menu');
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!open));
      menuToggle.setAttribute('aria-label', open ? 'Menü öffnen' : 'Menü schließen');
      mobileMenu.hidden = open;
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !mobileMenu.hidden) {
        mobileMenu.hidden = true;
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Menü öffnen');
        menuToggle.focus();
      }
    });
    $$('#mobile-menu a').forEach(a => a.addEventListener('click', () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      mobileMenu.hidden = true;
    }));
  }

  $$('details').forEach(d => {
    d.addEventListener('toggle', () => {
      track('faq_toggle', { open: d.open });
    });
  });

  const successDialog = $('#success-dialog');
  const successDialogClose = $('#success-dialog-close');
  if (successDialog && successDialogClose) {
    successDialogClose.addEventListener('click', () => successDialog.close());
    successDialog.addEventListener('click', (e) => {
      if (e.target === successDialog) successDialog.close();
    });
  }

  function handleForm(form) {
    if (!form) return;
    const message = form.querySelector('.form-message');
    const inputs = [...form.querySelectorAll('input, select, textarea')];
    const submit = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (message) {
        message.hidden = false;
        message.className = 'form-message';
      }
      track('form_submit', { source: form.querySelector('input[name="source"]')?.value });

      if (!form.checkValidity()) {
        form.reportValidity();
        if (message) {
          message.textContent = 'Bitte füllen Sie alle markierten Felder aus.';
          message.classList.add('error');
        }
        return;
      }

      const data = {};
      const formData = new FormData(form);
      const multi = ['interesse'];
      for (const [k, v] of formData.entries()) {
        if (multi.includes(k)) {
          data[k] = data[k] ? (Array.isArray(data[k]) ? [...data[k], v] : [data[k], v]) : [v];
        } else {
          data[k] = v;
        }
      }

      try {
        if (IS_TEST) {
          await new Promise(r => setTimeout(r, 300));
          if (message) {
            message.textContent = 'Testmodus: Anfrage wurde NICHT gesendet.';
            message.classList.add('success');
          }
          form.reset();
          setUtmAndUrl();
          if (successDialog) successDialog.showModal();
          return;
        }
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || 'Fehler beim Senden');
        if (message) {
          message.textContent = 'Vielen Dank. Wir melden uns persönlich bei Ihnen.';
          message.classList.add('success');
        }
        form.reset();
        setUtmAndUrl();
        if (successDialog) successDialog.showModal();
      } catch (err) {
        if (message) {
          message.textContent = 'Das hat leider nicht geklappt. Bitte versuchen Sie es erneut oder rufen Sie uns an.';
          message.classList.add('error');
        }
      }
    });

    inputs.forEach(input => {
      input.addEventListener('focus', () => track('form_start', { field: input.name }));
      input.addEventListener('change', () => track('form_step', { field: input.name }));
    });
  }

  handleForm($('#final-form'));

  const fPhoneMobil = $('#f-telefon-mobil');
  const fEmail = $('#f-email');
  if (fPhoneMobil && fEmail) {
    const validateContact = () => {
      const hasPhone = fPhoneMobil.value.trim();
      const hasEmail = fEmail.value.trim();
      fPhoneMobil.required = !hasEmail;
      fEmail.required = !hasPhone;
    };
    fPhoneMobil.addEventListener('input', validateContact);
    fEmail.addEventListener('input', validateContact);
    validateContact();
  }

  document.querySelectorAll('a[href^="tel:"]').forEach(a => a.addEventListener('click', () => track('phone_click')));
  document.querySelectorAll('a[href^="mailto:"]').forEach(a => a.addEventListener('click', () => track('email_click')));
  document.querySelectorAll('a[href*="wa.me"]').forEach(a => a.addEventListener('click', () => track('whatsapp_click')));
})();
