(() => {
  const SUBMISSION_EMAIL = 'Waimarinoshears@gmail.com';
  const DRAFT_KEY = typeof STORAGE_KEY === 'undefined'
    ? 'waimarinoSpeedShearBookingPackDraftV1'
    : STORAGE_KEY;

  let clearInProgress = false;

  if (typeof saveDraft === 'function') {
    const previousSaveDraft = saveDraft;
    saveDraft = function clearAwareSaveDraft(...args) {
      if (clearInProgress) return;
      return previousSaveDraft.apply(this, args);
    };
  }

  function clearForm() {
    const submitted = typeof state !== 'undefined' && state.booking?.status === 'submitted';
    const message = submitted
      ? `Clear this form from this browser and return to a blank form?\n\nThis does not cancel or change the booking you already submitted. If you need to change that submitted booking, email ${SUBMISSION_EMAIL} and quote your Booking Reference.`
      : 'Clear this form and start again?\n\nThis will remove all information entered and saved in this browser. This cannot be undone.';

    if (!window.confirm(message)) return;

    clearInProgress = true;
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
    window.location.reload();
  }

  function installClearButton() {
    const actions = document.querySelector('.header-actions');
    if (!actions || document.getElementById('clearBookingFormBtn')) return;

    const button = document.createElement('button');
    button.id = 'clearBookingFormBtn';
    button.className = 'button secondary';
    button.type = 'button';
    button.textContent = 'Clear Form';
    button.title = 'Clear the information saved in this browser and return to a blank form.';
    button.addEventListener('click', clearForm);
    actions.appendChild(button);
  }

  function installPresentationPolish() {
    if (!document.querySelector('link[data-header-intro-polish]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'header-intro-polish.css?v=1.0.0';
      stylesheet.dataset.headerIntroPolish = 'true';
      document.head.appendChild(stylesheet);
    }

    const header = document.querySelector('.site-header');
    const headerInner = header?.querySelector('.header-inner');
    const visibleBrandName = header?.querySelector('.brand-copy .eyebrow');
    if (header && headerInner && visibleBrandName) {
      visibleBrandName.textContent = 'Waimarino Shears';
      visibleBrandName.className = 'header-brand-name';
      header.insertBefore(visibleBrandName, headerInner);
    }
    header?.querySelector('.subtitle')?.remove();

    const stepFourButton = document.querySelector('.step-button[data-step="4"]');
    if (stepFourButton) stepFourButton.innerHTML = '<span>4</span> Review &amp; Submit';

    const stepFourPanel = document.querySelector('.step-panel[data-panel="4"]');
    const stepFourHeading = stepFourPanel?.querySelector('.panel-heading h2');
    if (stepFourHeading) stepFourHeading.textContent = 'Review & Submit';

    const hirePanel = document.querySelector('.step-panel[data-panel="1"]');
    const hireHeading = hirePanel?.querySelector('.panel-heading');
    if (hireHeading && !document.getElementById('hireIntroduction')) {
      const intro = document.createElement('article');
      intro.id = 'hireIntroduction';
      intro.className = 'card hire-intro';
      intro.setAttribute('aria-label', 'Introduction');
      intro.innerHTML = `
        <p><strong>Tēnā koutou.</strong></p>
        <p>Thank you for considering the Waimarino Shears Speed Shear Timing System for your competition. This booking pack provides information about our timing service and helps us gather the details needed to prepare. We hope you find the information clear and helpful as you work through the pack.</p>
        <p>If you have any questions or need assistance at any stage, please don’t hesitate to contact us using the email address below.</p>
        <p class="hire-intro-contact"><a href="mailto:${SUBMISSION_EMAIL}">${SUBMISSION_EMAIL}</a></p>
        <p class="hire-intro-signoff"><strong>Ngā mihi nui,<br>Waimarino Shears</strong></p>`;
      hireHeading.insertAdjacentElement('afterend', intro);
    }
  }

  installPresentationPolish();
  installClearButton();
})();
