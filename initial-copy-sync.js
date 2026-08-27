(() => {
  if (window.__waimarinoInitialCopySyncVersion) return;
  window.__waimarinoInitialCopySyncVersion = '1.0.0';

  const hirePanel = document.querySelector('.step-panel[data-panel="1"]');
  const provideCard = [...(hirePanel?.querySelectorAll('.card') || [])]
    .find(card => card.querySelector('h3')?.textContent.trim() === 'What we provide');
  const provideList = provideCard?.querySelector('ul');
  if (provideList) provideList.dataset.hireOptionsPatched = 'true';

  const spaceCard = [...(hirePanel?.querySelectorAll('.card') || [])]
    .find(card => card.querySelector('h3')?.textContent.trim() === 'Space required');
  if (spaceCard) spaceCard.dataset.hireOptionsPatched = 'true';

  // branding.js is an older compatibility layer and temporarily sets the old
  // terms version during startup. Preserve a current saved draft's acceptance
  // until the final policy layer takes over.
  try {
    const key = typeof STORAGE_KEY === 'undefined'
      ? 'waimarinoSpeedShearBookingPackDraftV1'
      : STORAGE_KEY;
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved?.booking?.termsVersion === '22 August 2026' && typeof state !== 'undefined' && state?.booking) {
      state.booking.termsVersion = '22 August 2026';
    }
  } catch (_) {}
})();