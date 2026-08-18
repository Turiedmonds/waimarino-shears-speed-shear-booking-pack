(() => {
  const SUBMISSION_EMAIL = 'Waimarinoshears@gmail.com';
  const SUBMISSION_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzIBm6HZVp6QgC8rRmftdWoaGepFGj1ud6hJ9SjcoaS51fDeEFEF3TWqRaJnqC_ndDYmw/exec';
  const CURRENT_TERMS_VERSION = '2';
  const CURRENT_APP_VERSION = '1.2.0';
  const BRAND_RED = '#EB1D27';
  const logoUrl = new URL('assets/Waimarino%20Shears%20Logo.png', window.location.href).href;

  function humanEventDate(value) {
    if (!value) return '—';
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('en-NZ', { dateStyle: 'long' }).format(d);
  }

  function humanEventTime(value) {
    if (!value) return '—';
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value));
    if (!match) return value;
    const hour24 = Number(match[1]);
    if (hour24 < 0 || hour24 > 23) return value;
    return `${hour24 % 12 || 12}:${match[2]} ${hour24 >= 12 ? 'PM' : 'AM'}`;
  }

  function humanDateTimeLong(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('en-NZ', { dateStyle: 'long', timeStyle: 'short' }).format(d);
  }

  function fileDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    return match ? `${match[3]}-${match[2]}-${match[1]}` : 'undated';
  }

  function setReviewValue(label, value) {
    document.querySelectorAll('#reviewContent .review-item').forEach(item => {
      if (item.querySelector('span')?.textContent.trim() === label) {
        const strong = item.querySelector('strong');
        if (strong) strong.textContent = value;
      }
    });
  }

  function applyBusinessRules() {
    if (typeof state !== 'undefined') {
      state.commercial.balanceDueDaysAfterEvent = 7;
      state.booking.termsVersion = CURRENT_TERMS_VERSION;
      if (state.booking.status === 'submitted') {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      }
    }

    if (typeof saveDraft === 'function') {
      const originalSaveDraft = saveDraft;
      saveDraft = function protectedSaveDraft(showMessage = true) {
        if (typeof state !== 'undefined' && state.booking.status === 'submitted') return;
        return originalSaveDraft(false);
      };
    }

    if (typeof buildPackage === 'function') {
      const originalBuildPackage = buildPackage;
      buildPackage = function updatedBuildPackage(submitted = false) {
        const pack = originalBuildPackage(submitted);
        pack.appVersion = CURRENT_APP_VERSION;
        pack.commercial = { ...(pack.commercial || {}), balanceDueDaysAfterEvent: 7 };
        pack.booking = { ...(pack.booking || {}), termsVersion: CURRENT_TERMS_VERSION };
        if (typeof state !== 'undefined') {
          state.commercial.balanceDueDaysAfterEvent = 7;
          state.booking.termsVersion = CURRENT_TERMS_VERSION;
        }
        return pack;
      };
    }

    if (typeof buildReview === 'function') {
      const originalBuildReview = buildReview;
      buildReview = function updatedBuildReview() {
        originalBuildReview();
        setReviewValue('Competition date', humanEventDate(state.booking.competitionDate));
        setReviewValue('Start time', humanEventTime(state.booking.startTime));
        setReviewValue('Balance', 'Due within 7 days after completion of the event');
        setReviewValue('Accepted at', humanDateTimeLong(state.booking.acceptedAt));
        updateSubmitAvailability();
      };
    }

    if (typeof showToast === 'function') {
      const originalShowToast = showToast;
      showToast = message => originalShowToast(String(message).replaceAll('Progression', 'Programme').replaceAll('progression', 'programme'));
    }
  }

  applyBusinessRules();

  const liveLogo = document.querySelector('.brand-logo');
  if (liveLogo) {
    liveLogo.src = logoUrl;
    liveLogo.alt = 'Waimarino Shears Incorporated logo';
    liveLogo.onerror = null;
  }

  if (typeof buildHumanPackHtml === 'function') {
    const originalBuildHumanPackHtml = buildHumanPackHtml;
    buildHumanPackHtml = function brandedHumanPackHtml() {
      let html = originalBuildHumanPackHtml();
      const logoBlock = `
        <header class="download-brand-header">
          <img class="download-brand-logo" src="${logoUrl}" alt="Waimarino Shears Incorporated logo">
          <div class="download-brand-title">Speed Shear Hire &amp; Booking Pack</div>
        </header>`;
      const printStyles = `<style>
        :root{--brand-2:${BRAND_RED};--accent:${BRAND_RED};--danger:${BRAND_RED}}
        .download-brand-header{display:flex;align-items:center;gap:18px;margin-bottom:18px;padding:0 0 14px;border-bottom:4px solid ${BRAND_RED};break-inside:avoid;page-break-inside:avoid}
        .download-brand-logo{display:block;width:auto;height:82px;max-width:145px;object-fit:contain;flex:0 0 auto}
        .download-brand-title{font-size:26px;font-weight:800;line-height:1.15;color:#111}
        .review-section,.review-event{break-inside:avoid;page-break-inside:avoid}
        .review-section h3,.review-event h4{break-after:avoid;page-break-after:avoid}
        .review-section{margin:10px 0;padding:14px}
        .review-event{margin-top:8px;padding:11px}
        @media(max-width:650px){.download-brand-header{gap:12px}.download-brand-logo{height:58px;max-width:104px}.download-brand-title{font-size:20px}}
        @media print{.download-brand-logo{height:68px;max-width:120px}.review-section,.review-event{break-inside:avoid!important;page-break-inside:avoid!important}}
      </style>`;

      return html
        .replaceAll('#c1121f', BRAND_RED)
        .replaceAll('Due within 14 days after event', 'Due within 7 days after completion of the event')
        .replace(/Hire Terms &amp; Conditions version \d+/, `Hire Terms &amp; Conditions version ${CURRENT_TERMS_VERSION}`)
        .replace('</head>', `${printStyles}</head>`)
        .replace('<body>', `<body>${logoBlock}`)
        .replace('<h1>Waimarino Shears Incorporated — Speed Shear Hire &amp; Booking Pack</h1>', '');
    };
  }

  if (typeof downloadHumanPack === 'function') {
    downloadHumanPack = function downloadReadablePack() {
      syncStateFromForm();
      ensureIds();
      const filename = `${safeFileName(state.booking.competitionName)}_${fileDate(state.booking.competitionDate)}_Booking.html`;
      downloadBlob(buildHumanPackHtml(), 'text/html', filename);
      if (typeof showToast === 'function') showToast('Booking copy saved.');
    };
  }

  function patchBookingPage() {
    const fileInput = document.getElementById('bookingFileInput');
    if (fileInput) {
      document.querySelector(`label[for="${fileInput.id}"]`)?.remove();
      fileInput.remove();
    }

    document.getElementById('saveDraftBtn')?.remove();
    document.getElementById('draftHelpBtn')?.remove();
    document.getElementById('draftHelpDialog')?.remove();
    document.getElementById('draftAutoSaveNote')?.remove();

    const balanceRow = [...document.querySelectorAll('.cost-box dl div')].find(row => row.querySelector('dt')?.textContent.trim() === 'Balance');
    if (balanceRow?.querySelector('dd')) balanceRow.querySelector('dd').textContent = 'Payable within 7 days after completion of the event';

    const termsContent = document.querySelector('.terms-content');
    if (!termsContent) return;

    [...termsContent.querySelectorAll('p')].forEach(p => {
      if (p.textContent.includes('The remaining balance is payable within 14 days following completion of the event.')) {
        p.textContent = p.textContent.replace('The remaining balance is payable within 14 days following completion of the event.', 'The remaining balance is payable within 7 days following completion of the event.');
      }
    });

    const equipmentHeading = [...termsContent.querySelectorAll('h4')].find(h => h.textContent.trim() === 'Equipment and operating conditions');
    if (equipmentHeading && !document.getElementById('systemFailureTerm')) {
      let nextHeading = equipmentHeading.nextElementSibling;
      while (nextHeading && nextHeading.tagName !== 'H4') nextHeading = nextHeading.nextElementSibling;
      const term = document.createElement('p');
      term.id = 'systemFailureTerm';
      term.innerHTML = '<strong>System failure and manual backup:</strong> If the electronic timing, judging or display system becomes unavailable or unreliable because of equipment, power or another technical failure, Waimarino Shears Incorporated may continue the competition using manual backup procedures. This may include stopwatches, pen-and-paper records and manual entry of times, points, results or draws. The organiser accepts that these manual procedures may be used for the remainder of the competition where required.';
      termsContent.insertBefore(term, nextHeading || null);
    }
  }

  function patchHelpDialog() {
    const dialog = document.getElementById('progressionHelpDialog');
    const body = dialog?.querySelector('.dialog-body');
    if (!dialog || !body) return;
    body.innerHTML = `
      <div class="dialog-heading"><h3>Programme of Events — Help</h3><button id="closeProgressionHelpBtn" class="icon-button" type="button" aria-label="Close">×</button></div>
      <p>This section tells us the rounds that will be run for each grade or event.</p>
      <p><strong>Heats are always first and Final is always last.</strong> If your competition has extra rounds, add them between the Heats and Final.</p>
      <div class="example-flow"><span>Heats<br><small>1 sheep • 12 qualify</small></span><b>→</b><span>Top 12<br><small>1 sheep • 6 qualify</small></span><b>→</b><span>Semi-final<br><small>1 sheep • 2 qualify</small></span><b>→</b><span>Final<br><small>2 sheep</small></span></div>
      <p class="help-text"><strong>Adding another round:</strong> choose “Add Another Round”, then select the round name or use “Top X / Other” for names such as Top 12 or Top 8.</p>
      <p class="help-text"><strong>Using the same programme:</strong> if another grade or event uses the same rounds, choose it under “Use the same programme as…” instead of entering every round again. After copying, check the sheep per shearer and number qualifying because these can differ between grades.</p>`;
    body.querySelector('#closeProgressionHelpBtn')?.addEventListener('click', () => dialog.close());
  }

  function polishProgrammeCard(card) {
    if (!card) return;
    const heading = card.querySelector('.rounds-heading');
    if (heading) {
      const title = heading.querySelector('h4');
      if (title && title.textContent !== 'Programme of Events') title.textContent = 'Programme of Events';
      heading.querySelector('p')?.remove();

      const addButton = heading.querySelector('.add-round-btn');
      if (addButton && addButton.textContent !== 'Add Another Round') addButton.textContent = 'Add Another Round';

      let actions = heading.querySelector('.programme-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'programme-actions no-print';
        const help = document.createElement('button');
        help.type = 'button';
        help.className = 'programme-help-btn';
        help.setAttribute('aria-label', 'Help with Programme of Events');
        help.setAttribute('title', 'Help with Programme of Events');
        actions.appendChild(help);
        if (addButton) actions.appendChild(addButton);
        heading.appendChild(actions);
      } else if (addButton && addButton.parentNode !== actions) {
        actions.appendChild(addButton);
      }
    }

    const copyBox = card.querySelector('.copy-progression');
    if (!copyBox) return;
    const label = copyBox.querySelector(':scope > label');
    if (label && label.textContent !== 'Use the same programme as…') label.textContent = 'Use the same programme as…';
    const select = copyBox.querySelector('.copy-source-select');
    const placeholder = select?.querySelector('option[value=""]');
    if (placeholder && placeholder.textContent !== 'Choose a grade / event…') placeholder.textContent = 'Choose a grade / event…';
    select?.setAttribute('aria-label', 'Use the same programme as another grade or event');
    const copyButton = copyBox.querySelector('.copy-progression-btn');
    if (copyButton && copyButton.textContent !== 'Use Programme') copyButton.textContent = 'Use Programme';
    const warning = copyBox.querySelector('.copy-warning');
    if (warning?.textContent.includes('Progression copied from')) warning.textContent = warning.textContent.replace('Progression copied from', 'Programme copied from');
  }

  function polishProgrammeLanguage() {
    const gradesCard = document.getElementById('gradeChoices')?.closest('.card');
    gradesCard?.querySelector('#progressionHelpBtn')?.remove();
    const description = gradesCard?.querySelector('.card-heading-row p');
    if (description && description.textContent !== 'Select everything being run. Each selection will create its own programme section below.') {
      description.textContent = 'Select everything being run. Each selection will create its own programme section below.';
    }
    polishProgrammeCard(document.getElementById('eventConfigTemplate')?.content?.querySelector('.event-card'));
    document.querySelectorAll('#eventConfigs .event-card').forEach(polishProgrammeCard);
  }

  patchBookingPage();
  patchHelpDialog();
  polishProgrammeLanguage();

  document.addEventListener('click', event => {
    if (event.target.closest('.programme-help-btn')) document.getElementById('progressionHelpDialog')?.showModal();
    const copyButton = event.target.closest('.copy-progression-btn');
    if (copyButton) setTimeout(() => polishProgrammeCard(copyButton.closest('.event-card')), 0);
  });

  const eventConfigs = document.getElementById('eventConfigs');
  if (eventConfigs) {
    new MutationObserver(mutations => {
      const cards = new Set();
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (!(node instanceof Element)) return;
          if (node.matches('.event-card')) cards.add(node);
          node.querySelectorAll?.('.event-card').forEach(card => cards.add(card));
        });
      });
      cards.forEach(polishProgrammeCard);
    }).observe(eventConfigs, { childList: true });
  }

  function eventSummary(pack) {
    const events = pack.competitionSetup?.events || {};
    const parts = Object.entries(events).map(([name, event]) => {
      const rounds = (event.rounds || []).map(round => `${round.name}: ${round.sheepPerShearer} sheep per shearer${round.qualifiers == null ? '' : `, ${round.qualifiers} qualify`}`).join(' | ');
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
      `Date: ${humanEventDate(pack.booking.competitionDate)}`,
      `Start time: ${humanEventTime(pack.booking.startTime)}`,
      `Entry method: ${entries.method || '—'}`,
      `Digital entries: ${entries.digitalEntries == null ? '—' : entries.digitalEntries ? 'Yes' : 'No'}`,
      `Pen judges: ${judging.penJudges ?? 0}`,
      `Board judge: ${judging.boardJudge ? `Yes — ${judging.boardJudges || 0}` : 'No'}`,
      '', 'Programme of Events:', eventSummary(pack), '',
      `Terms accepted: ${pack.booking.termsAccepted ? 'Yes' : 'No'}`,
      `Accepted by: ${pack.booking.acceptedBy || '—'}`,
      `Accepted at: ${humanDateTimeLong(pack.booking.acceptedAt)}`,
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

  function updateSubmitAvailability() {
    const button = document.getElementById('submitBookingRequestBtn');
    if (!button || typeof state === 'undefined') return;
    const accepted = Boolean(document.getElementById('termsAccepted')?.checked);
    const submitted = state.booking.status === 'submitted';
    button.disabled = submitted || !accepted;
    button.textContent = submitted ? 'Booking Request Sent' : 'Submit Booking Request';
    button.title = submitted ? 'This booking has already been sent. Contact Waimarino Shears if changes are needed.' : accepted ? '' : 'Accept the Hire Terms & Conditions before submitting.';
    const emailButton = document.getElementById('emailBookingRequestBtn');
    if (emailButton) emailButton.disabled = submitted;
  }

  async function submitBookingRequest() {
    if (!document.getElementById('termsAccepted')?.checked) {
      setSubmissionStatus('error', '<strong>Please accept the Hire Terms &amp; Conditions before submitting.</strong>');
      return updateSubmitAvailability();
    }
    if (state?.booking?.status === 'submitted') {
      setSubmissionStatus('error', '<strong>This booking request has already been sent.</strong><br>If you need to make a change, contact Waimarino Shears directly. Please do not submit another booking request.');
      return updateSubmitAvailability();
    }

    const warnings = typeof validateForReview === 'function' ? validateForReview() : [];
    if (warnings.length) {
      setSubmissionStatus('error', '<strong>Please check the booking before submitting.</strong><br>There are still items listed in the review that need attention.');
      return;
    }

    const button = document.getElementById('submitBookingRequestBtn');
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }

    try {
      const pack = buildPackage(true);
      await fetch(SUBMISSION_ENDPOINT, {
        method: 'POST', mode: 'no-cors', cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(pack)
      });
      state.booking.status = 'submitted';
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      if (typeof buildReview === 'function') buildReview();
      setSubmissionStatus('success', '<strong>Booking request sent.</strong><br>A confirmation email with the Booking Pack PDF should arrive shortly. Waimarino Shears will review the request and send the $300 deposit invoice. The booking is not confirmed until the deposit has been paid.<br><br><strong>Need to make a change?</strong> Contact Waimarino Shears directly. Please do not submit another booking request.');
    } catch (error) {
      console.error('Booking submission failed:', error);
      setSubmissionStatus('error', '<strong>We could not send the booking online.</strong><br>Please use the “Email Booking Request” option below instead.');
    } finally {
      updateSubmitAvailability();
    }
  }

  function emailBookingRequest() {
    if (state?.booking?.status === 'submitted') {
      return setSubmissionStatus('error', '<strong>This booking request has already been sent.</strong><br>If you need to make a change, contact Waimarino Shears directly. Please do not submit another booking request.');
    }
    const warnings = typeof validateForReview === 'function' ? validateForReview() : [];
    if (warnings.length) {
      return setSubmissionStatus('error', '<strong>Please check the booking before emailing it.</strong><br>Complete the items listed in the review, including accepting the Hire Terms &amp; Conditions.');
    }

    const pack = buildPackage(true);
    const subject = `Speed Shear Booking Request — ${pack.booking.competitionName || 'Competition'}`;
    const body = ['Hello Waimarino Shears,', '', 'Please find my speed shear booking request below.', '', bookingSummary(pack), '', 'This booking request is not confirmed until the deposit has been paid.', 'If changes are needed after submission, I will contact Waimarino Shears directly rather than submitting another booking request.'].join('\n');
    window.location.href = `mailto:${SUBMISSION_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function printBookingPack() {
    if (typeof buildReview === 'function') buildReview();
    const previousTitle = document.title;
    document.title = `${safeFileName(state.booking.competitionName)}_${fileDate(state.booking.competitionDate)}_Booking`;
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 750);
  }

  function installSubmissionUi() {
    const reviewPanel = document.querySelector('.step-panel[data-panel="4"]');
    const oldGrid = reviewPanel?.querySelector('.download-grid');
    if (!reviewPanel || !oldGrid) return;

    const intro = reviewPanel.querySelector('.panel-heading p:last-child');
    if (intro) intro.textContent = 'Check the details below, then send your booking request to Waimarino Shears. You can also save or print a copy for your records.';

    const nextSteps = document.createElement('section');
    nextSteps.className = 'next-steps-card no-print';
    nextSteps.innerHTML = `<h3>What happens next?</h3><div class="next-steps-list"><div><span>1</span><p><strong>Submit your booking request.</strong><br>Your completed details are sent to Waimarino Shears.</p></div><div><span>2</span><p><strong>We review it.</strong><br>We will contact you if anything needs checking and send the $300 deposit invoice.</p></div><div><span>3</span><p><strong>Booking confirmed.</strong><br>Your booking is confirmed once the deposit has been paid.</p></div></div>`;
    oldGrid.parentNode.insertBefore(nextSteps, oldGrid);

    oldGrid.className = 'booking-actions no-print';
    oldGrid.innerHTML = `<div class="primary-submit-card"><button id="submitBookingRequestBtn" class="button submit-booking-button" type="button">Submit Booking Request</button><p>Sends your completed booking directly to Waimarino Shears. A PDF copy is emailed back to the organiser.</p></div><div id="submissionStatus" class="submission-status hidden" aria-live="polite"></div><div class="secondary-booking-actions"><button id="emailBookingRequestBtn" class="action-tile" type="button"><strong>Email Booking Request</strong><span>Backup option: opens your email app with the booking details filled in.</span></button><button id="saveBookingPackSimpleBtn" class="action-tile" type="button"><strong>Save a Copy</strong><span>Downloads a readable copy of your completed booking.</span></button><button id="printBookingPackSimpleBtn" class="action-tile" type="button"><strong>Print / Save PDF</strong><span>Print the booking or save it as a PDF.</span></button></div><p class="submitted-change-note"><strong>Need to change a submitted booking?</strong> Contact Waimarino Shears directly. Please do not submit another booking request.</p>`;

    document.getElementById('submitBookingRequestBtn')?.addEventListener('click', submitBookingRequest);
    document.getElementById('emailBookingRequestBtn')?.addEventListener('click', emailBookingRequest);
    document.getElementById('saveBookingPackSimpleBtn')?.addEventListener('click', () => downloadHumanPack());
    document.getElementById('printBookingPackSimpleBtn')?.addEventListener('click', printBookingPack);
    document.getElementById('termsAccepted')?.addEventListener('change', updateSubmitAvailability);
    updateSubmitAvailability();
  }

  function installAutoSave() {
    let timer;
    const queueSave = event => {
      if (!(event.target instanceof HTMLElement)) return;
      if (!event.target.closest('.step-panel[data-panel="2"], .step-panel[data-panel="3"]')) return;
      if (typeof state !== 'undefined' && state.booking.status === 'submitted') return;
      clearTimeout(timer);
      timer = setTimeout(() => { try { if (typeof saveDraft === 'function') saveDraft(false); } catch (_) {} }, 700);
    };
    document.addEventListener('input', queueSave);
    document.addEventListener('change', queueSave);
  }

  const style = document.createElement('style');
  style.textContent = `
    :root{--brand-2:${BRAND_RED};--accent:${BRAND_RED};--danger:${BRAND_RED}}
    .eyebrow{color:${BRAND_RED}}
    .cost-box{grid-template-columns:minmax(255px,auto) 1fr}.cost-box h3{white-space:nowrap;font-size:clamp(1.55rem,3vw,2rem);letter-spacing:.01em;margin-top:3px;margin-bottom:0}
    .programme-actions{display:flex;gap:9px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
    .next-steps-card{background:#fff;border:1px solid var(--line);border-top:5px solid var(--brand-2);border-radius:var(--radius);box-shadow:var(--shadow);padding:22px;margin-top:18px}.next-steps-card h3{margin:0 0 14px}.next-steps-list{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.next-steps-list>div{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--surface-soft)}.next-steps-list span{display:grid;place-items:center;width:28px;height:28px;flex:0 0 28px;border-radius:50%;background:var(--brand-2);color:#fff;font-weight:800}.next-steps-list p{margin:0;color:#333}
    .booking-actions{margin-top:16px;display:grid;gap:12px}.primary-submit-card{background:#111;color:#fff;border-radius:14px;padding:22px;border-bottom:5px solid var(--brand-2);display:flex;align-items:center;justify-content:space-between;gap:18px}.primary-submit-card p{margin:0;color:#ddd;max-width:560px}.submit-booking-button{background:var(--brand-2);color:#fff;border:0;font-size:1.05rem;padding:13px 20px;white-space:nowrap}.submit-booking-button:hover{filter:brightness(.88)}.submit-booking-button:disabled{opacity:.55;cursor:not-allowed}
    .secondary-booking-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.action-tile{text-align:left;border:1px solid #bbb;border-radius:12px;background:#fff;padding:16px;color:#111}.action-tile:hover:not(:disabled){border-color:var(--brand-2);background:#fff7f7}.action-tile strong{display:block;color:var(--brand-2);font-size:1rem}.action-tile span{display:block;margin-top:5px;color:var(--muted);font-size:.92rem}.action-tile:disabled{opacity:.5;cursor:not-allowed}
    .submitted-change-note{margin:2px 0 0;padding:12px 14px;border-left:4px solid var(--brand-2);background:#fff7f7;border-radius:8px;color:#4c1519}.submission-status{padding:14px 16px;border-radius:10px}.submission-status.success{background:#f1faf3;border:1px solid #8ec89b;color:#1e5a2d}.submission-status.error{background:#fff3f3;border:1px solid #db8e94;color:#7f1119}
    @media(max-width:900px){.next-steps-list{grid-template-columns:1fr}.secondary-booking-actions{grid-template-columns:1fr 1fr}.primary-submit-card{align-items:flex-start;flex-direction:column}.cost-box{grid-template-columns:1fr}.programme-actions{justify-content:flex-start}}
    @media(max-width:540px){.secondary-booking-actions{grid-template-columns:1fr}.submit-booking-button{width:100%;white-space:normal}}
    @media print{
      .site-header{border-bottom-color:${BRAND_RED}!important}
      .site-header .eyebrow{display:none!important}
      .review-section,.review-event{break-inside:avoid!important;page-break-inside:avoid!important}
      .review-section h3,.review-event h4{break-after:avoid!important;page-break-after:avoid!important}
      .review-content{display:block!important}
      .review-section{margin:0 0 12px!important;padding:14px!important}
      .review-event{margin-top:8px!important;padding:11px!important}
    }
  `;
  document.head.appendChild(style);

  installSubmissionUi();
  installAutoSave();
})();