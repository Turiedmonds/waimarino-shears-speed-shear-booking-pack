(() => {
  if (window.__waimarinoBookingPolicyLoaderVersion) return;
  window.__waimarinoBookingPolicyLoaderVersion = '1.1.0';

  function loadScript(src, marker, onload) {
    if (document.querySelector(`script[data-${marker}]`)) {
      if (onload) onload();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset[marker] = 'true';
    if (onload) script.addEventListener('load', onload, { once: true });
    document.body.appendChild(script);
  }

  loadScript('booking-policy-final-core.js?v=1.0.0', 'bookingPolicyCore', () => {
    loadScript('competition-contact.js?v=1.0.0', 'competitionContact', null);
  });
})();
