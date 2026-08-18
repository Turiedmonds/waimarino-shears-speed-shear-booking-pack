(() => {
  const SUBMISSION_EMAIL = 'Waimarinoshears@gmail.com';
  const SUBMISSION_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzIBm6HZVp6QgC8rRmftdWoaGepFGj1ud6hJ9SjcoaS51fDeEFEF3TWqRaJnqC_ndDYmw/exec';
  const logoUrl = new URL('assets/Waimarino%20Shears%20Logo.png', window.location.href).href;

  const liveLogo = document.querySelector('.brand-logo');
  if (liveLogo) {
    liveLogo.src = logoUrl;
    liveLogo.alt = 'Waimarino Shears Incorporated logo';
    liveLogo.onerror = null;
  }

  if (typeof buildHumanPackHtml === 'function') {
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
          @media(max-width:650px){.download-brand-header{gap:12px}.download-brand-logo{height:58px;max-width:104px}.download-brand-title{font-size:20px}.download-brand-name{font-size:10px}}
          @media print{.download-brand-logo{height:70px;max-width:125px}.download-brand-header{break-inside:avoid}}
        </style>`;

      return html
        .replace('</head>', `${responsiveLogoStyles}</head>`)
        .replace('<body>', `<body>${logoBlock}`)
        .replace('<h1>Waimarino Shears Incorporated — Speed Shear Hire &amp; Booking Pack</h1>', '');
    };
  }

  function eventSummary(pack) {
    const events = pack.competitionSetup?.events || {};
    const parts = Object.entries(events).map(([name, event]) => {
      const rounds = (event.rounds || []).map(round => {
        const qualifiers = round.qualifiers == null ? '' : `, ${round.qualifiers} qualify`;
        return `${round.name}: ${round.sheepPerShearer} sheep per shearer${qualifiers}`;
      }).join(' | ');
      const clean = event.cleanShear ? `Yes${event.cleanShearTimeLimit ? ` (${event.cleanShearTimeLimit})` : ''}` : 'No';
      return `${name} — Clean shear: ${clean}; Prize placings: ${event.prizePlacings}; ${rounds}`;
    });
    return parts.length ? parts.join('\n') : 'No grades or events selected.';
  }

  function bookingSummary(pack) {
    const judging = pack.competitionSetup?.judging || {};
    const entries = pack.entries || {};
    return [
      `Competition: ${pack.booking.competitionName || '—'}`,
      `Contact: ${pack.booking.contactPerson || '—'}`,
      `Phone: ${pack.booking.phone || '—'}`,
      `Email: ${pack.booking.email || '—'}`,
      `Venue: ${pack.booking.venue || '—'}`,
      `Date: ${pack.booking.competitionDate || '—'}`,
      `Start time: ${pack.booking.startTime || '—'}`,
      `Entry method: ${entries.method || '—'}`,
      `Digital entries: ${entries.digitalEntries == null ? '—' : entries.digitalEntries ? 'Yes' : 'No'}`,
      `Pen judges: ${judging.penJudges ?? 0}`,
      `Board judge: ${judging.boardJudge ? `Yes — ${judging.boardJudges || 0}` : 'No'}`,
      '',
      'Competition configuration:',
      eventSummary(pack),
      '',
      `Terms accepted: ${pack.booking.termsAccepted ? 'Yes' : 'No'}`,
      `Accepted by: ${pack.booking.acceptedBy || '—'}`,
      `Accepted at: ${pack.booking.acceptedAt || '—'}`,
      `Booking ID: ${pack.identity?.bookingId || '—'}`
    ].join('\n');
  }

  function setSubmissionStatus(type, message) {
    const box = document.getElementById('submissionStatus');
    if (!box) return;
    box.className = `submission-status ${type}`;
    box.innerHTML = message;
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function submitBookingRequest() {
    const warnings = typeof validateForReview === 'function' ? validateForReview() : [];
    if (warnings.length) {
      setSubmissionStatus('error', '<strong>Please check the booking before submitting.</strong><br>There are still items listed in the review that need attention.');
      return;
    }

    if (state?.booking?.status === 'submitted' && !window.confirm('This booking has already been submitted from this device. Send it again?')) return;

    const button = document.getElementById('submitBookingRequestBtn');
    const originalText = button?.textContent || 'Submit Booking Request';
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }

    try {
      const pack = buildPackage(true);
      await fetch(SUBMISSION_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(pack)
      });

      state.booking.status = 'submitted';
      if (typeof saveDraft === 'function') saveDraft(false);
      if (typeof buildReview === 'function') buildReview();
      setSubmissionStatus('success', '<strong>Booking request sent.</strong><br>A confirmation email with the Booking Pack PDF should arrive shortly. Waimarino Shears will review the request and send the $300 deposit invoice. The booking is not confirmed until the deposit has been paid.');
    } catch (error) {
      console.error('Booking submission failed:', error);
      setSubmissionStatus('error', '<strong>We could not send the booking online.</strong><br>Please use the “Email Booking Request” option below instead.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function emailBookingRequest() {
    const warnings = typeof validateForReview === 'function' ? validateForReview() : [];
    if (warnings.length && !window.confirm('There are still items to check in the booking. Open the email anyway?')) return;

    const pack = buildPackage(true);
    const subject = `Speed Shear Booking Request — ${pack.booking.competitionName || 'Competition'}`;
    const body = [
      'Hello Waimarino Shears,',
      '',
      'Please find my speed shear booking request below.',
      '',
      bookingSummary(pack),
      '',
      'This booking request is not confirmed until the deposit has been paid.'
    ].join('\n');

    window.location.href = `mailto:${SUBMISSION_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function saveEditableCopy() {
    const pack = buildPackage(false);
    const filename = `${safeFileName(pack.booking.competitionName)}_EditableBooking_${pack.booking.competitionDate || 'undated'}.json`;
    downloadBlob(JSON.stringify(pack, null, 2), 'application/json', filename);
    if (typeof showToast === 'function') showToast('Editable booking copy saved.');
  }

  function installSubmissionUi() {
    const reviewPanel = document.querySelector('.step-panel[data-panel="4"]');
    if (!reviewPanel) return;

    const intro = reviewPanel.querySelector('.panel-heading p:last-child');
    if (intro) intro.textContent = 'Check the details below, then send your booking request to Waimarino Shears. You can also save or print a copy for your records.';

    const oldGrid = reviewPanel.querySelector('.download-grid');
    if (!oldGrid) return;

    const nextSteps = document.createElement('section');
    nextSteps.className = 'next-steps-card no-print';
    nextSteps.innerHTML = `
      <h3>What happens next?</h3>
      <div class="next-steps-list">
        <div><span>1</span><p><strong>Submit your booking request.</strong><br>Your completed details are sent to Waimarino Shears.</p></div>
        <div><span>2</span><p><strong>We review it.</strong><br>We will contact you if anything needs checking and send the $300 deposit invoice.</p></div>
        <div><span>3</span><p><strong>Booking confirmed.</strong><br>Your booking is confirmed once the deposit has been paid.</p></div>
      </div>`;
    oldGrid.parentNode.insertBefore(nextSteps, oldGrid);

    oldGrid.className = 'booking-actions no-print';
    oldGrid.innerHTML = `
      <div class="primary-submit-card">
        <button id="submitBookingRequestBtn" class="button submit-booking-button" type="button">Submit Booking Request</button>
        <p>Sends your completed booking directly to Waimarino Shears. A PDF copy is emailed back to the organiser.</p>
      </div>
      <div id="submissionStatus" class="submission-status hidden" aria-live="polite"></div>
      <div class="secondary-booking-actions">
        <button id="emailBookingRequestBtn" class="action-tile" type="button"><strong>Email Booking Request</strong><span>Backup option: opens your email app with the booking details filled in.</span></button>
        <button id="saveBookingPackSimpleBtn" class="action-tile" type="button"><strong>Save a Copy</strong><span>Downloads a readable copy of your completed booking.</span></button>
        <button id="printBookingPackSimpleBtn" class="action-tile" type="button"><strong>Print / Save PDF</strong><span>Print the booking or save it as a PDF.</span></button>
        <button id="saveEditableCopyBtn" class="action-tile subtle" type="button"><strong>Save Editable Copy</strong><span>Optional: save a file you can reopen and change later.</span></button>
      </div>`;

    document.getElementById('submitBookingRequestBtn')?.addEventListener('click', submitBookingRequest);
    document.getElementById('emailBookingRequestBtn')?.addEventListener('click', emailBookingRequest);
    document.getElementById('saveBookingPackSimpleBtn')?.addEventListener('click', () => downloadHumanPack());
    document.getElementById('printBookingPackSimpleBtn')?.addEventListener('click', () => {
      if (typeof buildReview === 'function') buildReview();
      window.print();
    });
    document.getElementById('saveEditableCopyBtn')?.addEventListener('click', saveEditableCopy);
  }

  const style = document.createElement('style');
  style.textContent = `
    .next-steps-card{background:#fff;border:1px solid var(--line);border-top:5px solid var(--brand-2);border-radius:var(--radius);box-shadow:var(--shadow);padding:22px;margin-top:18px}
    .next-steps-card h3{margin:0 0 14px}.next-steps-list{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .next-steps-list>div{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--surface-soft)}
    .next-steps-list span{display:grid;place-items:center;width:28px;height:28px;flex:0 0 28px;border-radius:50%;background:var(--brand-2);color:#fff;font-weight:800}.next-steps-list p{margin:0;color:#333}
    .booking-actions{margin-top:16px;display:grid;gap:12px}.primary-submit-card{background:#111;color:#fff;border-radius:14px;padding:22px;border-bottom:5px solid var(--brand-2);display:flex;align-items:center;justify-content:space-between;gap:18px}.primary-submit-card p{margin:0;color:#ddd;max-width:560px}
    .submit-booking-button{background:var(--brand-2);color:#fff;border:0;font-size:1.05rem;padding:13px 20px;white-space:nowrap}.submit-booking-button:hover{background:#9f0e19}.submit-booking-button:disabled{opacity:.65}
    .secondary-booking-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.action-tile{text-align:left;border:1px solid #bbb;border-radius:12px;background:#fff;padding:16px;color:#111}.action-tile:hover{border-color:var(--brand-2);background:#fff7f7}.action-tile strong{display:block;color:var(--brand-2);font-size:1rem}.action-tile span{display:block;margin-top:5px;color:var(--muted);font-size:.92rem}.action-tile.subtle strong{color:#333}
    .submission-status{padding:14px 16px;border-radius:10px}.submission-status.success{background:#f1faf3;border:1px solid #8ec89b;color:#1e5a2d}.submission-status.error{background:#fff3f3;border:1px solid #db8e94;color:#7f1119}
    @media(max-width:900px){.next-steps-list{grid-template-columns:1fr}.secondary-booking-actions{grid-template-columns:1fr 1fr}.primary-submit-card{align-items:flex-start;flex-direction:column}}
    @media(max-width:540px){.secondary-booking-actions{grid-template-columns:1fr}.submit-booking-button{width:100%;white-space:normal}}
  `;
  document.head.appendChild(style);

  installSubmissionUi();
})();
