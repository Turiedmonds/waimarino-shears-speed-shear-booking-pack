(() => {
  const logoUrl = new URL('assets/Waimarino%20Shears%20Logo.png', window.location.href).href;

  // Correct the live header image to the exact uploaded asset path.
  const liveLogo = document.querySelector('.brand-logo');
  if (liveLogo) {
    liveLogo.src = logoUrl;
    liveLogo.alt = 'Waimarino Shears Incorporated logo';
    liveLogo.onerror = null;
  }

  if (typeof buildHumanPackHtml !== 'function') return;

  const originalBuildHumanPackHtml = buildHumanPackHtml;
  buildHumanPackHtml = function brandedHumanPackHtml() {
    const html = originalBuildHumanPackHtml();
    const logoBlock = `
      <header class="download-brand-header">
        <img class="download-brand-logo" src="${logoUrl}" alt="Waimarino Shears Incorporated logo">
        <div class="download-brand-copy">
          <div class="download-brand-name">Waimarino Shears Incorporated</div>
          <div class="download-brand-title">Speed Shear Hire &amp; Booking Pack</div>
        </div>
      </header>`;

    const responsiveLogoStyles = `
      <style>
        .download-brand-header{display:flex;align-items:center;gap:18px;margin-bottom:20px;padding:0 0 16px;border-bottom:4px solid #c1121f}
        .download-brand-logo{display:block;width:auto;height:86px;max-width:150px;object-fit:contain;flex:0 0 auto}
        .download-brand-copy{min-width:0}
        .download-brand-name{font-size:12px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#c1121f}
        .download-brand-title{font-size:26px;font-weight:800;line-height:1.15;margin-top:4px;color:#111}
        @media(max-width:650px){
          .download-brand-header{gap:12px;align-items:center}
          .download-brand-logo{height:58px;max-width:104px}
          .download-brand-title{font-size:20px}
          .download-brand-name{font-size:10px}
        }
        @media print{
          .download-brand-logo{height:70px;max-width:125px}
          .download-brand-header{break-inside:avoid}
        }
      </style>`;

    return html
      .replace('</head>', `${responsiveLogoStyles}</head>`)
      .replace('<body>', `<body>${logoBlock}`)
      .replace('<h1>Waimarino Shears Incorporated — Speed Shear Hire &amp; Booking Pack</h1>', '');
  };
})();
