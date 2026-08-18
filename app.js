const APP_VERSION = '1.1.0';
const SCHEMA_VERSION = 1;
const TERMS_VERSION = '1';
const STORAGE_KEY = 'waimarinoSpeedShearBookingPackDraftV1';

const state = {
  identity: { competitionSeriesId: null, bookingId: null, createdAt: null, updatedAt: null },
  booking: {
    competitionName: '', contactPerson: '', phone: '', email: '', venue: '', competitionDate: '', startTime: '',
    status: 'draft', termsAccepted: false, termsVersion: TERMS_VERSION, acceptedBy: '', acceptedAt: null
  },
  commercial: {
    currency: 'NZD', hireFeeExGst: 750, gstAdditional: true, deposit: 300,
    depositDueDaysBeforeEvent: 14, balanceDueDaysAfterEvent: 14,
    travelIncluded: true, accommodationAdditionalIfRequired: true
  },
  entries: { method: '', digitalEntries: null },
  competitionSetup: { events: {}, judging: { penJudges: 0, boardJudge: false, boardJudges: 0 } }
};

const els = {
  panels: [...document.querySelectorAll('.step-panel')],
  stepButtons: [...document.querySelectorAll('.step-button')],
  competitionName: document.getElementById('competitionName'),
  contactPerson: document.getElementById('contactPerson'),
  phone: document.getElementById('phone'),
  email: document.getElementById('email'),
  venue: document.getElementById('venue'),
  competitionDate: document.getElementById('competitionDate'),
  startTime: document.getElementById('startTime'),
  entryMethod: document.getElementById('entryMethod'),
  digitalEntries: document.getElementById('digitalEntries'),
  termsAccepted: document.getElementById('termsAccepted'),
  acceptedByDisplay: document.getElementById('acceptedByDisplay'),
  acceptedAtDisplay: document.getElementById('acceptedAtDisplay'),
  gradeChoices: document.getElementById('gradeChoices'),
  otherGradeToggle: document.getElementById('otherGradeToggle'),
  otherGradeWrap: document.getElementById('otherGradeWrap'),
  otherGradeName: document.getElementById('otherGradeName'),
  eventConfigs: document.getElementById('eventConfigs'),
  penJudges: document.getElementById('penJudges'),
  hasBoardJudge: document.getElementById('hasBoardJudge'),
  boardJudgeCountWrap: document.getElementById('boardJudgeCountWrap'),
  boardJudges: document.getElementById('boardJudges'),
  reviewWarnings: document.getElementById('reviewWarnings'),
  reviewContent: document.getElementById('reviewContent'),
  bookingFileInput: document.getElementById('bookingFileInput'),
  progressionHelpDialog: document.getElementById('progressionHelpDialog')
};

function uuid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}
function nowIso() { return new Date().toISOString(); }
function humanDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-NZ', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}
function humanDate(value) {
  if (!value) return '—';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-NZ', { dateStyle: 'long' }).format(d);
}
function safeFileName(value) {
  return String(value || 'Speed_Shear').trim().replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Speed_Shear';
}
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

function showStep(step) {
  const target = String(step);
  els.panels.forEach(panel => panel.classList.toggle('active', panel.dataset.panel === target));
  els.stepButtons.forEach(button => button.classList.toggle('active', button.dataset.step === target));
  if (target === '4') buildReview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function syncAcceptance() {
  state.booking.acceptedBy = els.contactPerson.value.trim();
  els.acceptedByDisplay.textContent = state.booking.acceptedBy || '—';
  if (els.termsAccepted.checked) {
    if (!state.booking.acceptedAt) state.booking.acceptedAt = nowIso();
  } else {
    state.booking.acceptedAt = null;
  }
  state.booking.termsAccepted = els.termsAccepted.checked;
  els.acceptedAtDisplay.textContent = humanDateTime(state.booking.acceptedAt);
}

function selectedGrades() {
  const names = [];
  els.gradeChoices.querySelectorAll('input[type="checkbox"]:checked').forEach(input => {
    if (input.value === 'Other') {
      const custom = els.otherGradeName.value.trim();
      if (custom) names.push(custom);
    } else {
      names.push(input.value);
    }
  });
  return [...new Set(names)];
}

function defaultRounds() {
  return [
    { name: 'Heats', sheepPerShearer: 1, qualifiers: null },
    { name: 'Final', sheepPerShearer: 1, qualifiers: null }
  ];
}

function normalizedEventName(name) {
  if (name === 'Teams') return 'Team';
  if (name === 'Woman') return 'Women';
  return name;
}

function normalizeRounds(rounds) {
  const input = Array.isArray(rounds) ? rounds : [];
  const clean = input
    .filter(round => round && typeof round === 'object')
    .map(round => ({
      name: String(round.name || '').trim(),
      sheepPerShearer: Number.parseInt(round.sheepPerShearer, 10) || 1,
      qualifiers: round.qualifiers == null ? null : (Number.parseInt(round.qualifiers, 10) || null)
    }));

  const heatsSource = clean.find(round => /^heats?$/i.test(round.name));
  const finalSource = clean.find(round => /^final$/i.test(round.name));
  const middle = clean.filter(round => !/^heats?$/i.test(round.name) && !/^final$/i.test(round.name));

  const heats = heatsSource ? { ...heatsSource, name: 'Heats' } : { name: 'Heats', sheepPerShearer: 1, qualifiers: null };
  const final = finalSource ? { ...finalSource, name: 'Final', qualifiers: null } : { name: 'Final', sheepPerShearer: 1, qualifiers: null };
  return [heats, ...middle, final];
}

function normalizeEvents(events) {
  const normalized = {};
  Object.entries(events || {}).forEach(([rawName, rawEvent]) => {
    const name = normalizedEventName(rawName);
    const event = rawEvent || {};
    normalized[name] = {
      cleanShear: Boolean(event.cleanShear),
      cleanShearTimeLimit: String(event.cleanShearTimeLimit || ''),
      prizePlacings: Number.parseInt(event.prizePlacings, 10) || 3,
      rounds: normalizeRounds(event.rounds)
    };
  });
  return normalized;
}

function makeEventData(existing = null) {
  if (!existing) return { cleanShear: false, cleanShearTimeLimit: '', prizePlacings: 3, rounds: defaultRounds() };
  return {
    cleanShear: Boolean(existing.cleanShear),
    cleanShearTimeLimit: String(existing.cleanShearTimeLimit || ''),
    prizePlacings: Number.parseInt(existing.prizePlacings, 10) || 3,
    rounds: normalizeRounds(existing.rounds)
  };
}

function syncEventSections() {
  const names = selectedGrades();
  const current = collectEventsFromDom();
  Object.entries(state.competitionSetup.events || {}).forEach(([name, event]) => {
    if (!current[name]) current[name] = event;
  });

  els.eventConfigs.innerHTML = '';
  names.forEach(name => renderEventSection(name, makeEventData(current[name])));
  state.competitionSetup.events = Object.fromEntries(names.map(name => [name, makeEventData(current[name])]));
  refreshCopySourceOptions();
}

function renderEventSection(name, data) {
  const template = document.getElementById('eventConfigTemplate');
  const fragment = template.content.cloneNode(true);
  const section = fragment.querySelector('.event-card');
  section.dataset.event = name;
  fragment.querySelector('.event-title').textContent = name;

  const cleanSelect = fragment.querySelector('.clean-shear-select');
  const cleanWrap = fragment.querySelector('.clean-time-wrap');
  const cleanInput = fragment.querySelector('.clean-time-input');
  const prizeInput = fragment.querySelector('.prize-placings-input');
  const roundList = fragment.querySelector('.round-list');
  const copySource = fragment.querySelector('.copy-source-select');
  const copyButton = fragment.querySelector('.copy-progression-btn');
  const copyWarning = fragment.querySelector('.copy-warning');

  cleanSelect.value = data.cleanShear ? 'yes' : 'no';
  cleanInput.value = data.cleanShearTimeLimit || '';
  prizeInput.value = Number.isFinite(Number(data.prizePlacings)) ? data.prizePlacings : 3;
  cleanWrap.classList.toggle('hidden', cleanSelect.value !== 'yes');
  cleanSelect.addEventListener('change', () => cleanWrap.classList.toggle('hidden', cleanSelect.value !== 'yes'));

  fragment.querySelector('.add-round-btn').addEventListener('click', () => {
    addRoundRow(roundList, { name: 'Semi-final', sheepPerShearer: 1, qualifiers: null }, { insertBeforeFinal: true });
    renumberRounds(roundList);
  });

  copyButton.addEventListener('click', () => {
    const sourceName = copySource.value;
    if (!sourceName) {
      showToast('Choose a grade or event to copy from.');
      return;
    }
    const currentEvents = collectEventsFromDom();
    const sourceEvent = currentEvents[sourceName];
    if (!sourceEvent) {
      showToast('That progression could not be found.');
      return;
    }

    const copiedRounds = normalizeRounds(deepClone(sourceEvent.rounds));
    roundList.innerHTML = '';
    renderRoundSequence(roundList, copiedRounds);
    copyWarning.textContent = `Progression copied from ${sourceName}. Please check the sheep per shearer and number qualifying for every round, as these may differ between grades.`;
    copyWarning.classList.remove('hidden');
    showToast(`Progression copied from ${sourceName}.`);
  });

  renderRoundSequence(roundList, normalizeRounds(data.rounds));
  els.eventConfigs.appendChild(fragment);
}

function renderRoundSequence(roundList, rounds) {
  const normalized = normalizeRounds(rounds);
  normalized.forEach((round, index) => {
    const isFirst = index === 0;
    const isLast = index === normalized.length - 1;
    addRoundRow(roundList, round, { lockedName: isFirst ? 'Heats' : (isLast ? 'Final' : null) });
  });
  renumberRounds(roundList);
}

function addRoundRow(roundList, round, options = {}) {
  const template = document.getElementById('roundTemplate');
  const fragment = template.content.cloneNode(true);
  const row = fragment.querySelector('.round-row');
  const select = fragment.querySelector('.round-name-select');
  const customInput = fragment.querySelector('.custom-round-name');
  const sheepInput = fragment.querySelector('.sheep-per-shearer');
  const qualifiersWrap = fragment.querySelector('.qualifiers-wrap');
  const qualifiersInput = fragment.querySelector('.qualifiers-input');
  const removeButton = fragment.querySelector('.remove-round-btn');
  const lockedName = options.lockedName || null;

  if (lockedName) {
    select.value = lockedName;
    select.disabled = true;
    row.dataset.anchor = lockedName === 'Heats' ? 'heats' : 'final';
    removeButton.classList.add('hidden');
  } else {
    [...select.options].forEach(option => {
      if (option.value === 'Heats' || option.value === 'Final') option.disabled = true;
    });
    if (round.name === 'Quarter-final' || round.name === 'Semi-final') {
      select.value = round.name;
    } else {
      select.value = 'custom';
      customInput.value = round.name || '';
      customInput.classList.remove('hidden');
    }
  }

  sheepInput.value = Number(round.sheepPerShearer) > 0 ? round.sheepPerShearer : 1;
  qualifiersInput.value = Number(round.qualifiers) > 0 ? round.qualifiers : '';

  function updateRoundFields() {
    customInput.classList.toggle('hidden', select.value !== 'custom');
    const isFinal = lockedName === 'Final' || select.value === 'Final';
    qualifiersWrap.classList.toggle('hidden', isFinal);
    if (isFinal) qualifiersInput.value = '';
  }

  select.addEventListener('change', updateRoundFields);
  removeButton.addEventListener('click', () => {
    row.remove();
    renumberRounds(roundList);
  });
  updateRoundFields();

  const finalRow = roundList.querySelector('[data-anchor="final"]');
  if (options.insertBeforeFinal && finalRow) {
    roundList.insertBefore(fragment, finalRow);
  } else {
    roundList.appendChild(fragment);
  }
}

function renumberRounds(roundList) {
  [...roundList.querySelectorAll('.round-row')].forEach((row, index) => {
    row.querySelector('.round-number').textContent = index + 1;
  });
}

function refreshCopySourceOptions() {
  const sections = [...els.eventConfigs.querySelectorAll('.event-card')];
  const names = sections.map(section => section.dataset.event);
  sections.forEach(section => {
    const ownName = section.dataset.event;
    const select = section.querySelector('.copy-source-select');
    const button = section.querySelector('.copy-progression-btn');
    const previous = select.value;
    select.innerHTML = '<option value="">Copy progression from…</option>';
    names.filter(name => name !== ownName).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
    const hasSources = names.length > 1;
    select.disabled = !hasSources;
    button.disabled = !hasSources;
  });
}

function collectEventsFromDom() {
  const events = {};
  els.eventConfigs.querySelectorAll('.event-card').forEach(section => {
    const name = section.dataset.event;
    const cleanShear = section.querySelector('.clean-shear-select').value === 'yes';
    const cleanShearTimeLimit = section.querySelector('.clean-time-input').value.trim();
    const prizePlacings = Number.parseInt(section.querySelector('.prize-placings-input').value, 10) || 0;
    const rounds = [...section.querySelectorAll('.round-row')].map(row => {
      const select = row.querySelector('.round-name-select');
      const custom = row.querySelector('.custom-round-name').value.trim();
      const roundName = select.value === 'custom' ? custom : select.value;
      const isFinal = row.dataset.anchor === 'final' || /^final$/i.test(roundName);
      return {
        name: roundName,
        sheepPerShearer: Number.parseInt(row.querySelector('.sheep-per-shearer').value, 10) || 0,
        qualifiers: isFinal ? null : (Number.parseInt(row.querySelector('.qualifiers-input').value, 10) || null)
      };
    });
    events[name] = { cleanShear, cleanShearTimeLimit, prizePlacings, rounds: normalizeRounds(rounds) };
  });
  return events;
}

function syncStateFromForm() {
  state.booking.competitionName = els.competitionName.value.trim();
  state.booking.contactPerson = els.contactPerson.value.trim();
  state.booking.phone = els.phone.value.trim();
  state.booking.email = els.email.value.trim();
  state.booking.venue = els.venue.value.trim();
  state.booking.competitionDate = els.competitionDate.value;
  state.booking.startTime = els.startTime.value;
  state.booking.termsAccepted = els.termsAccepted.checked;
  state.booking.termsVersion = TERMS_VERSION;
  syncAcceptance();
  state.entries.method = els.entryMethod.value;
  state.entries.digitalEntries = els.digitalEntries.value === '' ? null : els.digitalEntries.value === 'yes';
  state.competitionSetup.events = collectEventsFromDom();
  state.competitionSetup.judging.penJudges = Number.parseInt(els.penJudges.value, 10) || 0;
  state.competitionSetup.judging.boardJudge = els.hasBoardJudge.value === 'yes';
  state.competitionSetup.judging.boardJudges = state.competitionSetup.judging.boardJudge ? (Number.parseInt(els.boardJudges.value, 10) || 0) : 0;
  state.identity.updatedAt = nowIso();
}

function ensureIds() {
  if (!state.identity.competitionSeriesId) state.identity.competitionSeriesId = uuid();
  if (!state.identity.bookingId) state.identity.bookingId = uuid();
  if (!state.identity.createdAt) state.identity.createdAt = nowIso();
  state.identity.updatedAt = nowIso();
}

function buildPackage(submitted = false) {
  syncStateFromForm();
  ensureIds();
  const copy = deepClone(state);
  if (submitted) copy.booking.status = 'submitted';
  return { schemaVersion: SCHEMA_VERSION, type: 'competition_booking_pack', appVersion: APP_VERSION, ...copy };
}

function validateForReview() {
  syncStateFromForm();
  const warnings = [];
  if (!state.booking.competitionName) warnings.push('Competition / Speed Shear name is missing.');
  if (!state.booking.contactPerson) warnings.push('Contact person is missing.');
  if (!state.booking.phone) warnings.push('Phone number is missing.');
  if (!state.booking.email) warnings.push('Email address is missing.');
  if (!state.booking.venue) warnings.push('Venue / location is missing.');
  if (!state.booking.competitionDate) warnings.push('Competition date is missing.');
  if (!state.booking.startTime) warnings.push('Competition start time is missing.');
  if (!state.booking.termsAccepted) warnings.push('Hire Terms & Conditions have not been accepted.');

  const events = Object.entries(state.competitionSetup.events || {});
  if (!events.length) warnings.push('No grades or events have been selected.');
  events.forEach(([eventName, event]) => {
    if (event.cleanShear && !event.cleanShearTimeLimit) warnings.push(`${eventName}: clean shear is enabled but no time limit has been entered.`);
    if (!event.prizePlacings) warnings.push(`${eventName}: number of prize placings is missing.`);
    event.rounds?.forEach((round, index) => {
      if (!round.name) warnings.push(`${eventName}: round ${index + 1} needs a name.`);
      if (!round.sheepPerShearer) warnings.push(`${eventName} — ${round.name || `round ${index + 1}`}: sheep per shearer is missing.`);
      const isFinal = /^final$/i.test(round.name || '');
      if (!isFinal && round.qualifiers == null) warnings.push(`${eventName} — ${round.name || `round ${index + 1}`}: number qualifying to the next round is missing.`);
    });
  });

  if (state.competitionSetup.judging.boardJudge && !state.competitionSetup.judging.boardJudges) {
    warnings.push('Board judge is selected but the number of board judges is missing.');
  }
  return warnings;
}

function reviewItem(label, value) {
  return `<div class="review-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '—')}</strong></div>`;
}

function buildReview() {
  syncStateFromForm();
  const warnings = validateForReview();
  els.reviewWarnings.classList.toggle('hidden', warnings.length === 0);
  els.reviewWarnings.innerHTML = warnings.length
    ? `<strong>Please check these items before sending the booking:</strong><ul>${warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>`
    : '';

  const eventsHtml = Object.entries(state.competitionSetup.events || {}).map(([name, event]) => {
    const rounds = (event.rounds || []).map(round => `<li><strong>${escapeHtml(round.name || 'Unnamed round')}</strong> — ${round.sheepPerShearer || '—'} sheep per shearer${round.qualifiers == null ? '' : ` • ${round.qualifiers} qualify`}</li>`).join('');
    return `<div class="review-event"><h4>${escapeHtml(name)}</h4><p><strong>Clean shear:</strong> ${event.cleanShear ? `Yes${event.cleanShearTimeLimit ? ` — ${escapeHtml(event.cleanShearTimeLimit)}` : ''}` : 'No'} &nbsp; <strong>Prize placings:</strong> ${event.prizePlacings || '—'}</p><ol class="review-rounds">${rounds || '<li>No rounds entered</li>'}</ol></div>`;
  }).join('');

  const entryMethodLabels = { 'pre-entry': 'Pre-entry only', 'on-day': 'Entries on the day only', 'both': 'Both' };
  const statusText = state.booking.termsAccepted ? 'Ready to submit — booking not confirmed until deposit is paid' : 'Draft';

  els.reviewContent.innerHTML = `
    <section class="review-section"><h3>Booking</h3><div class="review-list">
      ${reviewItem('Competition', state.booking.competitionName)}${reviewItem('Contact person', state.booking.contactPerson)}${reviewItem('Phone', state.booking.phone)}${reviewItem('Email', state.booking.email)}${reviewItem('Venue / location', state.booking.venue)}${reviewItem('Competition date', humanDate(state.booking.competitionDate))}${reviewItem('Start time', state.booking.startTime || '—')}${reviewItem('Booking status', statusText)}
    </div></section>
    <section class="review-section"><h3>Cost &amp; agreement</h3><div class="review-list">
      ${reviewItem('Hire fee', 'NZ$750 + GST')}${reviewItem('Deposit', 'NZ$300 — due no later than 14 days before event')}${reviewItem('Balance', 'Due within 14 days after event')}${reviewItem('Travel', 'Included')}${reviewItem('Accommodation', 'Additional if required')}${reviewItem('Terms accepted', state.booking.termsAccepted ? 'Yes' : 'No')}${reviewItem('Accepted by', state.booking.acceptedBy || '—')}${reviewItem('Accepted at', humanDateTime(state.booking.acceptedAt))}
    </div></section>
    <section class="review-section"><h3>Entry arrangements</h3><div class="review-list">
      ${reviewItem('Entry method', entryMethodLabels[state.entries.method] || '—')}${reviewItem('Collected digitally', state.entries.digitalEntries == null ? '—' : (state.entries.digitalEntries ? 'Yes' : 'No'))}
    </div></section>
    <section class="review-section"><h3>Competition configuration</h3><div class="review-list">
      ${reviewItem('Pen judges', String(state.competitionSetup.judging.penJudges ?? 0))}${reviewItem('Board judge', state.competitionSetup.judging.boardJudge ? `Yes — ${state.competitionSetup.judging.boardJudges} judge(s)` : 'No')}
    </div>${eventsHtml || '<p>No grades or events selected.</p>'}</section>`;
}

function downloadBlob(contents, type, filename) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function saveDraft(showMessage = true) {
  syncStateFromForm();
  ensureIds();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPackage(false)));
  if (showMessage) showToast('Draft saved in this browser.');
}

function downloadBookingFile() {
  const pack = buildPackage(true);
  const warnings = validateForReview();
  if (warnings.length && !window.confirm('There are items to check in the review. Download the Booking File anyway?')) return;
  state.booking.status = 'submitted';
  saveDraft(false);
  downloadBlob(JSON.stringify(pack, null, 2), 'application/json', `${safeFileName(pack.booking.competitionName)}_BookingPack_${pack.booking.competitionDate || 'undated'}.json`);
  showToast('Booking File downloaded.');
}

function buildHumanPackHtml() {
  buildReview();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(state.booking.competitionName || 'Speed Shear')} — Booking Pack</title><style>body{font-family:Arial,sans-serif;color:#111;max-width:900px;margin:30px auto;padding:0 20px;line-height:1.5}h1{border-bottom:4px solid #c1121f;padding-bottom:10px;color:#111}.status{padding:12px;background:#fff5f5;border:1px solid #d97777;border-left:5px solid #c1121f;border-radius:8px}.review-section{border:1px solid #d6d6d6;border-radius:10px;padding:18px;margin:14px 0}.review-list{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px}.review-item{border-bottom:1px solid #e5e5e5;padding:5px 0}.review-item span{display:block;font-size:11px;text-transform:uppercase;color:#666}.review-event{border:1px solid #d6d6d6;border-top:4px solid #c1121f;border-radius:8px;padding:12px;margin-top:10px}@media(max-width:650px){.review-list{grid-template-columns:1fr}}</style></head><body><h1>Waimarino Shears Incorporated — Speed Shear Hire &amp; Booking Pack</h1><p class="status"><strong>Booking status:</strong> Submitted. This booking is not confirmed until the deposit has been paid.</p>${els.reviewContent.innerHTML}<section class="review-section"><h3>Hire information summary</h3><p>Standard hire includes the two-stand speed shear stand, two Heiniger Evo shearing plants, timing system, two TVs, judging devices, catching pens, backup timing equipment, required extension leads, transport, setup, testing, pack-down and system operators.</p><p>Competition entry forms can be provided if required. The organiser remains responsible for collecting entries, payments and sign-ins.</p><p>The organiser provides the stage/trailer or suitable setup area, suitable power, lighting, PA/sound, generator if required, additional yards/pens, competition judges, sheep handlers and entry/sign-in staff.</p><p><strong>Space:</strong> approximately 4.8 m wide × 2.9 m deep × 2.45 m high, plus additional safe working space. Allow approximately four hours for setup and testing.</p></section><section class="review-section"><h3>Terms acknowledgement</h3><p>The organiser has accepted Waimarino Shears Incorporated Hire Terms &amp; Conditions version ${escapeHtml(TERMS_VERSION)}. Accepted by ${escapeHtml(state.booking.acceptedBy || '—')} on ${escapeHtml(humanDateTime(state.booking.acceptedAt))}.</p></section></body></html>`;
}

function downloadHumanPack() {
  syncStateFromForm();
  ensureIds();
  downloadBlob(buildHumanPackHtml(), 'text/html', `${safeFileName(state.booking.competitionName)}_BookingPack_${state.booking.competitionDate || 'undated'}.html`);
  showToast('Human-readable Booking Pack downloaded.');
}

function applyStateToForm() {
  els.competitionName.value = state.booking.competitionName || '';
  els.contactPerson.value = state.booking.contactPerson || '';
  els.phone.value = state.booking.phone || '';
  els.email.value = state.booking.email || '';
  els.venue.value = state.booking.venue || '';
  els.competitionDate.value = state.booking.competitionDate || '';
  els.startTime.value = state.booking.startTime || '';
  els.termsAccepted.checked = Boolean(state.booking.termsAccepted);
  els.entryMethod.value = state.entries.method || '';
  els.digitalEntries.value = state.entries.digitalEntries == null ? '' : (state.entries.digitalEntries ? 'yes' : 'no');

  state.competitionSetup.events = normalizeEvents(state.competitionSetup.events);
  const eventNames = Object.keys(state.competitionSetup.events || {});
  els.gradeChoices.querySelectorAll('input[type="checkbox"]').forEach(input => { input.checked = false; });
  let customName = '';
  eventNames.forEach(name => {
    const standard = [...els.gradeChoices.querySelectorAll('input[type="checkbox"]')].find(input => input.value === name);
    if (standard && name !== 'Other') {
      standard.checked = true;
    } else if (!customName) {
      customName = name;
    }
  });

  if (customName) {
    els.otherGradeToggle.checked = true;
    els.otherGradeName.value = customName;
    els.otherGradeWrap.classList.remove('hidden');
  } else {
    els.otherGradeName.value = '';
    els.otherGradeWrap.classList.add('hidden');
  }

  els.eventConfigs.innerHTML = '';
  eventNames.forEach(name => renderEventSection(name, state.competitionSetup.events[name]));
  refreshCopySourceOptions();

  els.penJudges.value = state.competitionSetup.judging?.penJudges ?? 0;
  const hasBoard = Boolean(state.competitionSetup.judging?.boardJudge);
  els.hasBoardJudge.value = hasBoard ? 'yes' : 'no';
  els.boardJudges.value = state.competitionSetup.judging?.boardJudges || 1;
  els.boardJudgeCountWrap.classList.toggle('hidden', !hasBoard);
  syncAcceptance();
}

function loadPackage(pack, notify = true) {
  if (!pack || pack.type !== 'competition_booking_pack') throw new Error('This is not a Competition Booking Pack file.');
  if (Number(pack.schemaVersion) !== SCHEMA_VERSION) throw new Error(`Unsupported booking pack schema version: ${pack.schemaVersion}`);
  state.identity = { ...state.identity, ...(pack.identity || {}) };
  state.booking = { ...state.booking, ...(pack.booking || {}) };
  state.commercial = { ...state.commercial, ...(pack.commercial || {}) };
  state.entries = { ...state.entries, ...(pack.entries || {}) };
  state.competitionSetup = {
    events: normalizeEvents(pack.competitionSetup?.events || {}),
    judging: { ...state.competitionSetup.judging, ...(pack.competitionSetup?.judging || {}) }
  };
  applyStateToForm();
  if (notify) showToast('Booking File loaded.');
}

function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    loadPackage(JSON.parse(raw), false);
  } catch (error) {
    console.warn('Could not load saved draft:', error);
  }
}

function showToast(message) {
  document.querySelector('.toast')?.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

function bindEvents() {
  document.querySelectorAll('.next-step').forEach(button => button.addEventListener('click', () => {
    syncStateFromForm();
    showStep(button.dataset.next);
  }));
  document.querySelectorAll('.prev-step').forEach(button => button.addEventListener('click', () => showStep(button.dataset.prev)));
  els.stepButtons.forEach(button => button.addEventListener('click', () => {
    syncStateFromForm();
    showStep(button.dataset.step);
  }));

  els.contactPerson.addEventListener('input', syncAcceptance);
  els.termsAccepted.addEventListener('change', syncAcceptance);
  els.gradeChoices.addEventListener('change', event => {
    if (event.target === els.otherGradeToggle) {
      els.otherGradeWrap.classList.toggle('hidden', !els.otherGradeToggle.checked);
      if (!els.otherGradeToggle.checked) els.otherGradeName.value = '';
    }
    syncEventSections();
  });
  els.otherGradeName.addEventListener('change', syncEventSections);
  els.hasBoardJudge.addEventListener('change', () => els.boardJudgeCountWrap.classList.toggle('hidden', els.hasBoardJudge.value !== 'yes'));

  document.getElementById('progressionHelpBtn').addEventListener('click', () => els.progressionHelpDialog.showModal());
  document.getElementById('closeProgressionHelpBtn').addEventListener('click', () => els.progressionHelpDialog.close());
  document.getElementById('saveDraftBtn').addEventListener('click', () => saveDraft(true));
  document.getElementById('downloadBookingFileBtn').addEventListener('click', downloadBookingFile);
  document.getElementById('downloadBookingPackBtn').addEventListener('click', downloadHumanPack);
  document.getElementById('printBookingPackBtn').addEventListener('click', () => {
    buildReview();
    window.print();
  });

  els.bookingFileInput.addEventListener('change', async () => {
    const file = els.bookingFileInput.files?.[0];
    if (!file) return;
    try {
      loadPackage(JSON.parse(await file.text()));
      showStep(2);
    } catch (error) {
      window.alert(`Could not open this booking file. ${error.message}`);
    } finally {
      els.bookingFileInput.value = '';
    }
  });

  window.addEventListener('beforeunload', () => {
    try { saveDraft(false); } catch (_) {}
  });
}

bindEvents();
loadDraft();
syncAcceptance();
