(() => {
  if (window.__waimarinoTermsAcceptanceFinalVersion === '1.1.0') return;
  window.__waimarinoTermsAcceptanceFinalVersion = '1.1.0';

  const CURRENT_TERMS_VERSION = '28 August 2026';
  let acceptedIntent = false;

  function checkbox() {
    return document.getElementById('termsAccepted');
  }

  function currentAcceptanceIsValid() {
    return Boolean(
      checkbox()?.checked &&
      typeof state !== 'undefined' &&
      state?.booking?.termsAccepted === true &&
      state?.booking?.termsVersion === CURRENT_TERMS_VERSION
    );
  }

  function applyAcceptedStateFromCheckbox() {
    const input = checkbox();
    if (!input || typeof state === 'undefined' || !state?.booking) return;

    if (input.checked) {
      state.booking.termsAccepted = true;
      state.booking.termsVersion = CURRENT_TERMS_VERSION;
      state.booking.acceptedBy = document.getElementById('contactPerson')?.value.trim() || state.booking.acceptedBy || '';
      if (!state.booking.acceptedAt) state.booking.acceptedAt = new Date().toISOString();
      const acceptedBy = document.getElementById('acceptedByDisplay');
      const acceptedAt = document.getElementById('acceptedAtDisplay');
      if (acceptedBy) acceptedBy.textContent = state.booking.acceptedBy || '—';
      if (acceptedAt && typeof humanDateTime === 'function') acceptedAt.textContent = humanDateTime(state.booking.acceptedAt);
    } else {
      state.booking.termsVersion = CURRENT_TERMS_VERSION;
    }
  }

  function restoreIfAccepted() {
    const input = checkbox();
    if (!input || !acceptedIntent) return false;
    input.checked = true;
    applyAcceptedStateFromCheckbox();
    return true;
  }

  function installStateGuards() {
    const input = checkbox();
    if (!input) return false;

    acceptedIntent = currentAcceptanceIsValid();
    window.__waimarinoTermsAcceptedByUser = acceptedIntent;
    window.__waimarinoInvalidateTermsAcceptance = () => {
      acceptedIntent = false;
      window.__waimarinoTermsAcceptedByUser = false;
    };

    input.addEventListener('change', () => {
      acceptedIntent = Boolean(input.checked);
      window.__waimarinoTermsAcceptedByUser = acceptedIntent;
      applyAcceptedStateFromCheckbox();
    });

    if (typeof syncStateFromForm === 'function' && !syncStateFromForm.__termsAcceptanceFinalWrapped) {
      const original = syncStateFromForm;
      syncStateFromForm = function termsAcceptanceFinalSyncStateFromForm(...args) {
        const shouldStayAccepted = acceptedIntent || Boolean(input.checked);
        const result = original.apply(this, args);
        if (shouldStayAccepted) {
          acceptedIntent = true;
          window.__waimarinoTermsAcceptedByUser = true;
          restoreIfAccepted();
        }
        return result;
      };
      syncStateFromForm.__termsAcceptanceFinalWrapped = true;
    }

    if (typeof validateForReview === 'function' && !validateForReview.__termsAcceptanceFinalWrapped) {
      const original = validateForReview;
      validateForReview = function termsAcceptanceFinalValidateForReview(...args) {
        const shouldStayAccepted = acceptedIntent || Boolean(input.checked);
        if (shouldStayAccepted) {
          acceptedIntent = true;
          restoreIfAccepted();
        }
        const warnings = original.apply(this, args) || [];
        if (shouldStayAccepted) {
          restoreIfAccepted();
          return warnings.filter(message => message !== 'Hire Terms & Conditions have not been accepted.');
        }
        return warnings;
      };
      validateForReview.__termsAcceptanceFinalWrapped = true;
    }

    if (typeof buildPackage === 'function' && !buildPackage.__termsAcceptanceFinalWrapped) {
      const original = buildPackage;
      buildPackage = function termsAcceptanceFinalBuildPackage(...args) {
        const shouldStayAccepted = acceptedIntent || Boolean(input.checked);
        if (shouldStayAccepted) {
          acceptedIntent = true;
          restoreIfAccepted();
        }
        const pack = original.apply(this, args);
        if (shouldStayAccepted) {
          restoreIfAccepted();
          pack.booking = pack.booking || {};
          pack.booking.termsAccepted = true;
          pack.booking.termsVersion = CURRENT_TERMS_VERSION;
          pack.booking.acceptedBy = state.booking.acceptedBy;
          pack.booking.acceptedAt = state.booking.acceptedAt;
        }
        return pack;
      };
      buildPackage.__termsAcceptanceFinalWrapped = true;
    }

    document.addEventListener('click', event => {
      const submit = event.target.closest('#submitBookingRequestBtn, #emailBookingRequestBtn');
      if (!submit) return;
      if (!input.checked && !acceptedIntent) return;
      acceptedIntent = true;
      window.__waimarinoTermsAcceptedByUser = true;
      restoreIfAccepted();
    }, true);

    applyAcceptedStateFromCheckbox();
    return true;
  }

  function initialise(attempt = 0) {
    if (installStateGuards()) return;
    if (attempt < 40) window.setTimeout(() => initialise(attempt + 1), 100);
  }

  initialise();
})();
