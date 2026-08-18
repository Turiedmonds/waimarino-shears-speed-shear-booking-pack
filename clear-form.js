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

  installClearButton();
})();
