(() => {
  if (window.__waimarinoBookingPolicyLoaderVersion) return;
  window.__waimarinoBookingPolicyLoaderVersion = '1.2.1';

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

  loadScript('booking-policy-final-core.js?v=1.0.1', 'bookingPolicyFinalCoreScript', () => {
    loadScript('competition-contact.js?v=1.0.0', 'competitionContactScript', () => {
      loadScript('multi-booking-drafts.js?v=1.0.0', 'multiBookingDraftsScript', null);
    });
  });
})();