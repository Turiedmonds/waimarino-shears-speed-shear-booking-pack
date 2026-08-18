(() => {
  const logoUrl = new URL('assets/waimarino-shears-logo.png', window.location.href).href;

  if (typeof buildHumanPackHtml !== 'function') return;

  const originalBuildHumanPackHtml = buildHumanPackHtml;
  buildHumanPackHtml = function brandedHumanPackHtml() {
    const html = originalBuildHumanPackHtml();
    const logoBlock = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:18px;padding-bottom:14px;border-bottom:4px solid #c1121f;">
        <img src="${logoUrl}" alt="Waimarino Shears logo" style="width:auto;height:76px;max-width:132px;object-fit:contain;">
        <div>
          <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#c1121f;">Waimarino Shears Incorporated</div>
          <div style="font-size:24px;font-weight:800;line-height:1.15;margin-top:3px;">Speed Shear Hire &amp; Booking Pack</div>
        </div>
      </div>`;

    return html
      .replace('<body>', `<body>${logoBlock}`)
      .replace('<h1>Waimarino Shears — Speed Shear Hire &amp; Booking Pack</h1>', '');
  };
})();
