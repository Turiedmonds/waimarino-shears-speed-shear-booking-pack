(() => {
  if (window.__waimarinoInitialCopySyncVersion) return;
  window.__waimarinoInitialCopySyncVersion = '1.0.2';

  const CURRENT_TERMS_VERSION = '22 August 2026';
  const CURRENT_APP_VERSION = '1.5.1';

  const hirePanel = document.querySelector('.step-panel[data-panel="1"]');
  const provideCard = [...(hirePanel?.querySelectorAll('.card') || [])]
    .find(card => card.querySelector('h3')?.textContent.trim() === 'What we provide');
  const provideList = provideCard?.querySelector('ul');
  if (provideList) provideList.dataset.hireOptionsPatched = 'true';

  const spaceCard = [...(hirePanel?.querySelectorAll('.card') || [])]
    .find(card => card.querySelector('h3')?.textContent.trim() === 'Space required');
  if (spaceCard) spaceCard.dataset.hireOptionsPatched = 'true';

  function clearTermsAcceptance() {
    if (typeof state === 'undefined' || !state?.booking) return;
    state.booking.termsAccepted = false;
    state.booking.acceptedBy = '';
    state.booking.acceptedAt = null;
    const checkbox = document.getElementById('termsAccepted');
    if (checkbox) checkbox.checked = false;
    const acceptedBy = document.getElementById('acceptedByDisplay');
    const acceptedAt = document.getElementById('acceptedAtDisplay');
    if (acceptedBy) acceptedBy.textContent = '—';
    if (acceptedAt) acceptedAt.textContent = '—';
  }

  // The base page and branding compatibility layer still initialise with older
  // version constants. On a slower in-app browser a person can reach and tick
  // the Terms checkbox before the final policy scripts finish loading. Treat a
  // checkbox accepted during this page load as current acceptance, so a late
  // policy initialiser cannot mistake it for an old Terms acceptance and clear it.
  let saved = null;
  try {
    const key = typeof STORAGE_KEY === 'undefined'
      ? 'waimarinoSpeedShearBookingPackDraftV1'
      : STORAGE_KEY;
    saved = JSON.parse(localStorage.getItem(key) || 'null');
  } catch (_) {
    // Some in-app browsers restrict storage. The booking form must still work
    // for the current page even when a browser draft cannot be read.
  }

  if (typeof state !== 'undefined' && state?.booking) {
    const checkbox = document.getElementById('termsAccepted');
    const acceptedAtMs = Date.parse(state.booking.acceptedAt || '');
    const pageStartedAt = Number(window.performance?.timeOrigin) || Date.now();
    const acceptedThisPage = Boolean(
      checkbox?.checked &&
      Number.isFinite(acceptedAtMs) &&
      acceptedAtMs >= pageStartedAt - 2000
    );
    const savedTermsVersion = saved?.booking?.termsVersion || null;
    const savedAcceptedOldTerms = Boolean(
      saved?.booking?.termsAccepted === true &&
      savedTermsVersion &&
      savedTermsVersion !== CURRENT_TERMS_VERSION
    );

    if (savedAcceptedOldTerms && !acceptedThisPage) clearTermsAcceptance();

    // From this point onwards every policy layer is looking at the current
    // Terms version. This removes the timing race that could untick a checkbox
    // after the user had already accepted the current Terms.
    state.booking.termsVersion = CURRENT_TERMS_VERSION;
  }

  // branding.js is an older compatibility layer. Keep its temporary version
  // values from reaching packages or review text while the current policy
  // scripts load.
  if (typeof buildPackage === 'function' && !buildPackage.__initialCopyVersionSync) {
    const originalBuildPackage = buildPackage;
    buildPackage = function initialCopyVersionSyncBuildPackage(submitted = false) {
      const pack = originalBuildPackage(submitted);
      pack.appVersion = CURRENT_APP_VERSION;
      pack.booking = { ...(pack.booking || {}), termsVersion: CURRENT_TERMS_VERSION };
      if (typeof state !== 'undefined' && state?.booking) state.booking.termsVersion = CURRENT_TERMS_VERSION;
      return pack;
    };
    buildPackage.__initialCopyVersionSync = true;
  }

  if (typeof buildReview === 'function' && !buildReview.__initialCopyVersionSync) {
    const originalBuildReview = buildReview;
    buildReview = function initialCopyVersionSyncBuildReview(...args) {
      const result = originalBuildReview.apply(this, args);
      document.querySelectorAll('#reviewContent .review-item').forEach(item => {
        if (item.querySelector('span')?.textContent.trim() === 'Terms version') {
          const strong = item.querySelector('strong');
          if (strong) strong.textContent = CURRENT_TERMS_VERSION;
        }
      });
      return result;
    };
    buildReview.__initialCopyVersionSync = true;
  }

  if (typeof buildHumanPackHtml === 'function' && !buildHumanPackHtml.__initialCopyVersionSync) {
    const originalBuildHumanPackHtml = buildHumanPackHtml;
    buildHumanPackHtml = function initialCopyVersionSyncHumanPack(...args) {
      return originalBuildHumanPackHtml.apply(this, args)
        .replaceAll('19 August 2026', CURRENT_TERMS_VERSION)
        .replaceAll('21 August 2026', CURRENT_TERMS_VERSION);
    };
    buildHumanPackHtml.__initialCopyVersionSync = true;
  }
})();
