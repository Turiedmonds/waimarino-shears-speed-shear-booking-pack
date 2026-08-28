(() => {
  if (window.__waimarinoBookingPolicyLoaderVersion === '1.2.3') return;
  window.__waimarinoBookingPolicyLoaderVersion = '1.2.3';

  const CURRENT_TERMS_VERSION = '28 August 2026';
  const SUBMISSION_ENDPOINT = 'https://script.google.com/macros/s/AKfycbypCyJhLAup1GugHAqIhPZnxKRFZ1Eoaq372Msmv9PL19cu8dvSI2NnSaj_ZajTsdf2YA/exec';
  const SUBMISSION_EMAIL = 'Waimarinoshears@gmail.com';

  function loadScript(src, id, onload) {
    if (document.getElementById(id)) {
      if (onload) onload();
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = false;
    if (onload) script.addEventListener('load', onload, { once: true });
    document.body.appendChild(script);
  }

  function setSubmissionStatus(type, message) {
    const box = document.getElementById('submissionStatus');
    if (!box) return;
    box.className = `submission-status ${type}`;
    box.innerHTML = message;
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function restoreAcceptedState(input) {
    if (!input || typeof state === 'undefined' || !state?.booking) return;
    input.checked = true;
    state.booking.termsAccepted = true;
    state.booking.termsVersion = CURRENT_TERMS_VERSION;
    state.booking.acceptedBy = document.getElementById('contactPerson')?.value.trim() || state.booking.acceptedBy || '';
    if (!state.booking.acceptedAt) state.booking.acceptedAt = new Date().toISOString();
    const acceptedBy = document.getElementById('acceptedByDisplay');
    const acceptedAt = document.getElementById('acceptedAtDisplay');
    if (acceptedBy) acceptedBy.textContent = state.booking.acceptedBy || '—';
    if (acceptedAt && typeof humanDateTime === 'function') acceptedAt.textContent = humanDateTime(state.booking.acceptedAt);
  }

  document.addEventListener('click', async event => {
    const button = event.target.closest('#submitBookingRequestBtn');
    if (!button) return;

    const input = document.getElementById('termsAccepted');
    if (!input?.checked) return;

    // Take ownership of a valid checked submission before older compatibility
    // listeners can reset the Terms checkbox during validation.
    event.preventDefault();
    event.stopImmediatePropagation();
    restoreAcceptedState(input);

    if (state?.booking?.status === 'submitted') {
      setSubmissionStatus('error', `<strong>This booking request has already been sent.</strong><br>If you need to make a change, email <a href="mailto:${SUBMISSION_EMAIL}">${SUBMISSION_EMAIL}</a>. Please do not submit another booking request.`);
      return;
    }

    let warnings = [];
    if (typeof validateForReview === 'function') {
      try {
        warnings = validateForReview() || [];
      } finally {
        restoreAcceptedState(input);
      }
      warnings = warnings.filter(message => message !== 'Hire Terms & Conditions have not been accepted.');
    }

    if (warnings.length) {
      setSubmissionStatus('error', '<strong>Please check the booking before submitting.</strong><br>There are still items listed in the review that need attention.');
      return;
    }

    button.disabled = true;
    button.textContent = 'Sending…';

    try {
      restoreAcceptedState(input);
      const pack = typeof buildPackage === 'function' ? buildPackage(true) : null;
      restoreAcceptedState(input);
      if (!pack?.booking) throw new Error('Booking package could not be created.');
      pack.booking.termsAccepted = true;
      pack.booking.termsVersion = CURRENT_TERMS_VERSION;
      pack.booking.acceptedBy = state.booking.acceptedBy;
      pack.booking.acceptedAt = state.booking.acceptedAt;

      await fetch(SUBMISSION_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(pack)
      });

      state.booking.status = 'submitted';
      try { if (typeof STORAGE_KEY !== 'undefined') localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      if (typeof buildReview === 'function') buildReview();
      setSubmissionStatus('success', `<strong>Booking request sent.</strong><br>A confirmation email with the Booking Pack PDF and Booking Reference should arrive shortly. Waimarino Shears will review the request and send the $300 deposit invoice. The booking is not confirmed until the deposit has been paid.<br><br><strong>Need to make a change?</strong> Email <a href="mailto:${SUBMISSION_EMAIL}">${SUBMISSION_EMAIL}</a> and quote the Booking Reference in your confirmation email. Please do not submit another booking request.`);
      button.textContent = 'Booking Request Sent';
      button.disabled = true;
    } catch (error) {
      console.error('Booking submission failed:', error);
      restoreAcceptedState(input);
      button.disabled = false;
      button.textContent = 'Submit Booking Request';
      setSubmissionStatus('error', '<strong>We could not send the booking online.</strong><br>Please use the “Email Booking Request” option below instead.');
    }
  }, true);

  loadScript('booking-policy-final-core.js?v=1.0.1', 'bookingPolicyFinalCoreScript', () => {
    loadScript('competition-contact.js?v=1.0.0', 'competitionContactScript', () => {
      loadScript('terms-acceptance-final.js?v=1.0.0', 'termsAcceptanceFinalScript', () => {
        loadScript('multi-booking-drafts.js?v=1.0.0', 'multiBookingDraftsScript', null);
      });
    });
  });
})();