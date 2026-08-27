(() => {
  if (window.__waimarinoInitialCopySyncVersion) return;
  window.__waimarinoInitialCopySyncVersion = '1.0.1';

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

  // Preserve acceptance only when the saved draft already accepted the current
  // Terms. Older drafts still need to be reaccepted by the final policy layer.
  try {
    const key = typeof STORAGE_KEY === 'undefined'
      ? 'waimarinoSpeedShearBookingPackDraftV1'
      : STORAGE_KEY;
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved?.booking?.termsVersion === CURRENT_TERMS_VERSION && typeof state !== 'undefined' && state?.booking) {
      state.booking.termsVersion = CURRENT_TERMS_VERSION;
    }
  } catch (_) {}
})();
