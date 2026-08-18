(() => {
  if (typeof state === 'undefined') return;

  const STANDARD_GRADE_PRIORITY = ['Novice', 'Junior', 'Intermediate', 'Senior', 'Open'];
  const programmeState = {
    items: [],
    confirmed: false,
    customised: false
  };

  let listEl;
  let confirmEl;
  let statusEl;
  let regenerateBtn;
  let customNameTimer = null;

  function escapeProgrammeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function ensureNoviceChoice() {
    const choices = document.getElementById('gradeChoices');
    if (!choices || choices.querySelector('input[value="Novice"]')) return;
    const label = document.createElement('label');
    label.innerHTML = '<input type="checkbox" value="Novice"> Novice';
    choices.insertBefore(label, choices.firstElementChild || null);
  }

  function installProgrammeUi() {
    const configPanel = document.querySelector('.step-panel[data-panel="3"]');
    const judgingCard = [...(configPanel?.querySelectorAll(':scope > .card') || [])]
      .find(card => card.querySelector('h3')?.textContent.trim() === 'Judging configuration');
    if (!configPanel || !judgingCard || document.getElementById('competitionProgrammeCard')) return;

    const card = document.createElement('section');
    card.id = 'competitionProgrammeCard';
    card.className = 'card competition-programme-card';
    card.innerHTML = `
      <div class="competition-programme-heading">
        <div>
          <p class="section-kicker">Competition programme</p>
          <h3>Programme of Events — Running Order</h3>
        </div>
        <button id="regenerateProgrammeBtn" class="button secondary small no-print" type="button">Regenerate Draft</button>
      </div>
      <p>We have generated a draft running order from the grades, events and rounds above. This is a starting point only. Reorder it so it matches the exact programme you intend to run on the day.</p>
      <div class="programme-order-warning"><strong>Important:</strong> Waimarino Shears will configure the timing system from the confirmed order below. Check it carefully before submitting your booking.</div>
      <div id="competitionProgrammeStatus" class="programme-order-status"></div>
      <ol id="competitionProgrammeList" class="competition-programme-list"></ol>
      <p class="help-text no-print">Use the ↑ and ↓ buttons to move any round. Special events such as Women, Team or other custom events are placed before the standard grade hierarchy in the draft, but you can move them anywhere.</p>
      <label class="checkbox-line programme-confirm-line">
        <input id="programmeConfirmed" type="checkbox">
        <span>I confirm this is the Programme of Events and running order intended for this competition.</span>
      </label>`;

    judgingCard.insertAdjacentElement('afterend', card);
    listEl = card.querySelector('#competitionProgrammeList');
    confirmEl = card.querySelector('#programmeConfirmed');
    statusEl = card.querySelector('#competitionProgrammeStatus');
    regenerateBtn = card.querySelector('#regenerateProgrammeBtn');

    regenerateBtn.addEventListener('click', () => regenerateDraft(true));
    confirmEl.addEventListener('change', () => {
      if (confirmEl.checked && !programmeMatchesCurrentConfiguration()) {
        confirmEl.checked = false;
        programmeState.confirmed = false;
        updateProgrammeState();
        renderProgramme();
        if (typeof showToast === 'function') showToast('Regenerate the draft before confirming the programme.');
        return;
      }
      programmeState.confirmed = confirmEl.checked;
      updateProgrammeState();
      renderProgrammeStatus();
      enforceSubmissionGuard();
      queueDraftSave();
    });

    listEl.addEventListener('click', event => {
      const button = event.target.closest('button[data-move]');
      if (!button) return;
      const index = Number.parseInt(button.dataset.index, 10);
      if (!Number.isInteger(index)) return;
      const direction = button.dataset.move === 'up' ? -1 : 1;
      const swapIndex = index + direction;
      if (swapIndex < 0 || swapIndex >= programmeState.items.length) return;
      [programmeState.items[index], programmeState.items[swapIndex]] = [programmeState.items[swapIndex], programmeState.items[index]];
      programmeState.customised = true;
      programmeState.confirmed = false;
      updateProgrammeState();
      renderProgramme();
      queueDraftSave();
    });
  }

  function currentEvents() {
    try {
      if (typeof collectEventsFromDom === 'function') return collectEventsFromDom();
    } catch (_) {}
    return state.competitionSetup?.events || {};
  }

  function gradeSortOrder(events) {
    const names = Object.keys(events || {});
    const special = names.filter(name => !STANDARD_GRADE_PRIORITY.includes(name));
    const standard = names
      .filter(name => STANDARD_GRADE_PRIORITY.includes(name))
      .sort((a, b) => STANDARD_GRADE_PRIORITY.indexOf(a) - STANDARD_GRADE_PRIORITY.indexOf(b));
    return [...special, ...standard];
  }

  function buildDraftProgramme(events) {
    const grades = gradeSortOrder(events);
    const nonFinalByGrade = {};
    const finalsByGrade = {};
    let maxNonFinalRounds = 0;

    grades.forEach(grade => {
      const rounds = Array.isArray(events?.[grade]?.rounds) ? events[grade].rounds : [];
      nonFinalByGrade[grade] = rounds.filter(round => !/^final$/i.test(String(round?.name || '').trim()));
      finalsByGrade[grade] = rounds.filter(round => /^final$/i.test(String(round?.name || '').trim()));
      maxNonFinalRounds = Math.max(maxNonFinalRounds, nonFinalByGrade[grade].length);
    });

    const items = [];
    for (let roundIndex = 0; roundIndex < maxNonFinalRounds; roundIndex += 1) {
      grades.forEach(grade => {
        const round = nonFinalByGrade[grade][roundIndex];
        if (round?.name) items.push({ grade, round: String(round.name).trim() });
      });
    }
    grades.forEach(grade => {
      finalsByGrade[grade].forEach(round => {
        if (round?.name) items.push({ grade, round: String(round.name).trim() });
      });
    });
    return normalizeProgramme(items);
  }

  function normalizeProgramme(items) {
    return (Array.isArray(items) ? items : [])
      .filter(item => item && String(item.grade || '').trim() && String(item.round || '').trim())
      .map((item, index) => ({
        sequence: index + 1,
        grade: String(item.grade).trim(),
        round: String(item.round).trim()
      }));
  }

  function multiset(items) {
    const counts = new Map();
    (items || []).forEach(item => {
      const key = `${String(item.grade || '').trim()}\u0000${String(item.round || '').trim()}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }

  function sameMultiset(a, b) {
    const left = multiset(a);
    const right = multiset(b);
    if (left.size !== right.size) return false;
    for (const [key, count] of left.entries()) {
      if (right.get(key) !== count) return false;
    }
    return true;
  }

  function programmeMatchesCurrentConfiguration() {
    const expected = buildDraftProgramme(currentEvents());
    return expected.length > 0 && sameMultiset(expected, programmeState.items);
  }

  function updateProgrammeState() {
    state.competitionSetup = state.competitionSetup || {};
    programmeState.items = normalizeProgramme(programmeState.items);
    state.competitionSetup.program = programmeState.items.map(item => ({ ...item }));
    state.competitionSetup.programmeConfirmed = Boolean(programmeState.confirmed);
  }

  function renderProgramme() {
    if (!listEl) return;
    programmeState.items = normalizeProgramme(programmeState.items);
    listEl.innerHTML = programmeState.items.length
      ? programmeState.items.map((item, index) => `
        <li class="competition-programme-row">
          <span class="programme-sequence">${index + 1}</span>
          <div class="programme-label"><strong>${escapeProgrammeHtml(item.grade)}</strong><span>${escapeProgrammeHtml(item.round)}</span></div>
          <div class="programme-move-actions no-print">
            <button type="button" class="programme-move-btn" data-move="up" data-index="${index}" ${index === 0 ? 'disabled' : ''} aria-label="Move ${escapeProgrammeHtml(item.grade)} ${escapeProgrammeHtml(item.round)} up">↑</button>
            <button type="button" class="programme-move-btn" data-move="down" data-index="${index}" ${index === programmeState.items.length - 1 ? 'disabled' : ''} aria-label="Move ${escapeProgrammeHtml(item.grade)} ${escapeProgrammeHtml(item.round)} down">↓</button>
          </div>
        </li>`).join('')
      : '<li class="programme-empty">Select grades/events and enter their rounds above to generate the draft programme.</li>';
    if (confirmEl) confirmEl.checked = Boolean(programmeState.confirmed);
    renderProgrammeStatus();
    enforceSubmissionGuard();
  }

  function renderProgrammeStatus() {
    if (!statusEl) return;
    const matches = programmeMatchesCurrentConfiguration();
    if (!programmeState.items.length) {
      statusEl.className = 'programme-order-status needs-check';
      statusEl.textContent = 'Draft programme not available yet.';
    } else if (!matches) {
      statusEl.className = 'programme-order-status needs-check';
      statusEl.textContent = 'The programme is out of date because the grade/round configuration changed. Regenerate the draft and check the order again.';
    } else if (programmeState.confirmed) {
      statusEl.className = 'programme-order-status confirmed';
      statusEl.textContent = 'Programme confirmed.';
    } else {
      statusEl.className = 'programme-order-status needs-check';
      statusEl.textContent = programmeState.customised ? 'Custom order saved as a draft. Please check it and confirm.' : 'Draft order generated. Please check, reorder if required, then confirm.';
    }
  }

  function regenerateDraft(showMessage = false) {
    const hadProgramme = programmeState.items.length > 0;
    const wasConfirmed = programmeState.confirmed;
    programmeState.items = buildDraftProgramme(currentEvents());
    programmeState.confirmed = false;
    programmeState.customised = false;
    updateProgrammeState();
    renderProgramme();
    queueDraftSave();
    if (showMessage && typeof showToast === 'function') {
      showToast(hadProgramme || wasConfirmed ? 'Draft programme regenerated. Please review and confirm it again.' : 'Draft programme generated.');
    }
  }

  function restoreProgrammeFromSavedDraft() {
    let saved = null;
    try {
      const raw = localStorage.getItem(typeof STORAGE_KEY === 'undefined' ? 'waimarinoSpeedShearBookingPackDraftV1' : STORAGE_KEY);
      saved = raw ? JSON.parse(raw) : null;
    } catch (_) {}

    const savedProgram = saved?.competitionSetup?.program;
    const savedConfirmed = saved?.competitionSetup?.programmeConfirmed === true;
    if (Array.isArray(savedProgram) && savedProgram.length) {
      programmeState.items = normalizeProgramme(savedProgram);
      programmeState.confirmed = savedConfirmed;
      programmeState.customised = true;
    } else {
      programmeState.items = buildDraftProgramme(currentEvents());
      programmeState.confirmed = false;
      programmeState.customised = false;
    }
    updateProgrammeState();
    renderProgramme();
  }

  function queueDraftSave() {
    window.clearTimeout(queueDraftSave.timer);
    queueDraftSave.timer = window.setTimeout(() => {
      try {
        if (state.booking?.status !== 'submitted' && typeof saveDraft === 'function') saveDraft(false);
      } catch (_) {}
    }, 350);
  }

  function structuralProgrammeChange() {
    window.setTimeout(() => {
      const previousCustom = programmeState.customised;
      const previousConfirmed = programmeState.confirmed;
      regenerateDraft(false);
      if ((previousCustom || previousConfirmed) && typeof showToast === 'function') {
        showToast('The grade or round structure changed, so the draft programme was rebuilt. Please check and confirm it again.');
      }
    }, 0);
  }

  function installStructureListeners() {
    document.getElementById('gradeChoices')?.addEventListener('change', structuralProgrammeChange);
    document.getElementById('otherGradeName')?.addEventListener('change', structuralProgrammeChange);

    const configs = document.getElementById('eventConfigs');
    configs?.addEventListener('click', event => {
      if (event.target.closest('.add-round-btn, .remove-round-btn, .copy-progression-btn')) structuralProgrammeChange();
    });
    configs?.addEventListener('change', event => {
      if (event.target.matches('.round-name-select')) structuralProgrammeChange();
      if (event.target.matches('.custom-round-name')) structuralProgrammeChange();
    });
    configs?.addEventListener('input', event => {
      if (!event.target.matches('.custom-round-name')) return;
      window.clearTimeout(customNameTimer);
      customNameTimer = window.setTimeout(structuralProgrammeChange, 450);
    });

    document.getElementById('termsAccepted')?.addEventListener('change', () => window.setTimeout(enforceSubmissionGuard, 0));
  }

  function programmeReviewHtml() {
    const rows = normalizeProgramme(programmeState.items)
      .map(item => `<li><strong>${escapeProgrammeHtml(item.grade)}</strong> — ${escapeProgrammeHtml(item.round)}</li>`)
      .join('');
    return `<section id="confirmedProgrammeReview" class="review-section"><h3>Competition Programme — Confirmed Running Order</h3><p><strong>Status:</strong> ${programmeState.confirmed ? 'Confirmed by organiser' : 'Not confirmed'}</p><ol class="review-rounds confirmed-running-order">${rows || '<li>No programme entered.</li>'}</ol></section>`;
  }

  function installFunctionWrappers() {
    if (typeof syncStateFromForm === 'function') {
      const originalSyncStateFromForm = syncStateFromForm;
      syncStateFromForm = function programmeAwareSyncStateFromForm() {
        originalSyncStateFromForm();
        updateProgrammeState();
      };
    }

    if (typeof buildPackage === 'function') {
      const originalBuildPackage = buildPackage;
      buildPackage = function programmeAwareBuildPackage(submitted = false) {
        updateProgrammeState();
        const pack = originalBuildPackage(submitted);
        pack.appVersion = '1.4.0';
        pack.competitionSetup = pack.competitionSetup || {};
        pack.competitionSetup.program = normalizeProgramme(programmeState.items);
        pack.competitionSetup.programmeConfirmed = Boolean(programmeState.confirmed);
        return pack;
      };
    }

    if (typeof validateForReview === 'function') {
      const originalValidateForReview = validateForReview;
      validateForReview = function programmeAwareValidateForReview() {
        const warnings = originalValidateForReview();
        if (!programmeState.items.length) {
          warnings.push('The Programme of Events running order has not been generated.');
        } else if (!programmeMatchesCurrentConfiguration()) {
          warnings.push('The Programme of Events running order is out of date. Regenerate the draft and check it again.');
        }
        if (!programmeState.confirmed) warnings.push('The Programme of Events running order has not been confirmed.');
        return [...new Set(warnings)];
      };
    }

    if (typeof buildReview === 'function') {
      const originalBuildReview = buildReview;
      buildReview = function programmeAwareBuildReview() {
        originalBuildReview();
        document.getElementById('confirmedProgrammeReview')?.remove();
        const reviewContent = document.getElementById('reviewContent');
        const competitionSection = [...(reviewContent?.querySelectorAll('.review-section') || [])]
          .find(section => section.querySelector('h3')?.textContent.trim() === 'Competition configuration');
        if (reviewContent) {
          if (competitionSection) competitionSection.insertAdjacentHTML('afterend', programmeReviewHtml());
          else reviewContent.insertAdjacentHTML('beforeend', programmeReviewHtml());
        }
        enforceSubmissionGuard();
      };
    }
  }

  function enforceSubmissionGuard() {
    const ready = programmeState.confirmed && programmeMatchesCurrentConfiguration();
    const submitted = state.booking?.status === 'submitted';
    const submit = document.getElementById('submitBookingRequestBtn');
    const email = document.getElementById('emailBookingRequestBtn');
    if (submit && !submitted && !ready) {
      submit.disabled = true;
      submit.title = 'Confirm the Programme of Events running order before submitting.';
    }
    if (email && !submitted && !ready) {
      email.disabled = true;
      email.title = 'Confirm the Programme of Events running order before emailing the booking request.';
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .competition-programme-card{border-top:5px solid var(--brand-2,#EB1D27)}
    .competition-programme-heading{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}
    .competition-programme-heading h3{margin-top:2px}
    .programme-order-warning{margin:12px 0;padding:12px 14px;border-left:4px solid var(--brand-2,#EB1D27);background:#fff5f5;border-radius:8px;color:#4c1519}
    .programme-order-status{margin:12px 0;padding:10px 12px;border-radius:8px;font-weight:700}
    .programme-order-status.needs-check{background:#fff8e6;border:1px solid #d7b15b;color:#6f4d00}
    .programme-order-status.confirmed{background:#eff9f1;border:1px solid #80ba8d;color:#235d31}
    .competition-programme-list{list-style:none;margin:12px 0;padding:0;display:grid;gap:8px;counter-reset:none}
    .competition-programme-row{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line,#ddd);border-radius:10px;background:var(--surface-soft,#fafafa)}
    .programme-sequence{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#111;color:#fff;font-weight:800}
    .programme-label{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.programme-label strong{font-size:1rem}.programme-label span{color:var(--muted,#666)}
    .programme-move-actions{display:flex;gap:6px}.programme-move-btn{width:38px;height:36px;border:1px solid #aaa;border-radius:8px;background:#fff;color:#111;font-size:18px;font-weight:800;cursor:pointer}.programme-move-btn:disabled{opacity:.3;cursor:not-allowed}
    .programme-confirm-line{margin-top:14px;padding:14px;border:2px solid var(--brand-2,#EB1D27);border-radius:10px;background:#fffafa}
    .programme-empty{padding:12px;border:1px dashed #bbb;border-radius:8px;color:var(--muted,#666)}
    .confirmed-running-order{columns:2;column-gap:34px}.confirmed-running-order li{break-inside:avoid;margin-bottom:5px}
    @media(max-width:700px){.competition-programme-row{grid-template-columns:34px minmax(0,1fr);}.programme-move-actions{grid-column:2}.confirmed-running-order{columns:1}}
    @media print{.confirmed-running-order{columns:2}.competition-programme-card{break-inside:avoid;page-break-inside:avoid}}
  `;
  document.head.appendChild(style);

  ensureNoviceChoice();
  installProgrammeUi();
  installFunctionWrappers();
  installStructureListeners();
  restoreProgrammeFromSavedDraft();
  window.setTimeout(enforceSubmissionGuard, 0);
})();
