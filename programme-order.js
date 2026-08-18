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
  let resetBtn;
  let customNameTimer = null;
  let highlightTimer = null;
  let dragState = null;

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

  function repairNoviceLoadedState() {
    const events = state.competitionSetup?.events || {};
    if (!Object.prototype.hasOwnProperty.call(events, 'Novice')) return;
    if (typeof applyStateToForm === 'function') applyStateToForm();
  }

  function roundGroupLabel(roundName) {
    const raw = String(roundName || '').trim();
    const lower = raw.toLowerCase();
    if (/^heats?$/.test(lower)) return 'Heats';
    if (/^quarter[-\s]?finals?$/.test(lower)) return 'Quarter-finals';
    if (/^semi[-\s]?finals?$/.test(lower)) return 'Semi-finals';
    if (/^finals?$/.test(lower)) return 'Finals';
    return raw || 'Other round';
  }

  function groupProgramme(items) {
    const groups = [];
    normalizeProgramme(items).forEach(item => {
      const label = roundGroupLabel(item.round);
      const previous = groups[groups.length - 1];
      if (!previous || previous.label !== label) {
        groups.push({ label, items: [item] });
      } else {
        previous.items.push(item);
      }
    });
    return groups;
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
          <h3>Programme of Events</h3>
        </div>
        <button id="resetProgrammeBtn" class="button secondary small no-print" type="button">Reset to Default Order</button>
      </div>
      <p>We have generated a suggested running order from the grades, events and rounds above. Use it as a starting point, then reorder anything needed so it matches the programme you intend to run on the day.</p>
      <div class="programme-order-warning"><strong>Important:</strong> Waimarino Shears will configure the timing system from the confirmed order below. Check it carefully before submitting your booking.</div>
      <div id="competitionProgrammeStatus" class="programme-order-status"></div>
      <div id="competitionProgrammeList" class="competition-programme-list"></div>
      <p class="help-text no-print">Drag using the ↕ handle to move a round several places at once, or use the ↑ and ↓ buttons for one-place moves. Dragging works with mouse, touch and stylus. Special events such as Women, Team or other custom events are placed before the standard grade hierarchy in the default order, but you can move them anywhere.</p>
      <label class="checkbox-line programme-confirm-line">
        <input id="programmeConfirmed" type="checkbox">
        <span>I confirm this is the Programme of Events and running order intended for this competition.</span>
      </label>`;

    judgingCard.insertAdjacentElement('afterend', card);
    listEl = card.querySelector('#competitionProgrammeList');
    confirmEl = card.querySelector('#programmeConfirmed');
    statusEl = card.querySelector('#competitionProgrammeStatus');
    resetBtn = card.querySelector('#resetProgrammeBtn');

    resetBtn.addEventListener('click', () => {
      if (programmeState.customised && programmeState.items.length) {
        const proceed = window.confirm('Reset the Programme of Events to the automatically suggested default order? Your current custom order will be replaced.');
        if (!proceed) return;
      }
      resetToDefaultOrder(true);
    });

    confirmEl.addEventListener('change', () => {
      if (confirmEl.checked && !programmeMatchesCurrentConfiguration()) {
        confirmEl.checked = false;
        programmeState.confirmed = false;
        updateProgrammeState();
        renderProgramme();
        if (typeof showToast === 'function') showToast('Reset to the default order before confirming the programme.');
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
      const toIndex = index + (button.dataset.move === 'up' ? -1 : 1);
      moveProgrammeItem(index, toIndex);
    });

    listEl.addEventListener('pointerdown', beginPointerDrag);
    listEl.addEventListener('pointermove', updatePointerDrag);
    listEl.addEventListener('pointerup', finishPointerDrag);
    listEl.addEventListener('pointercancel', cancelPointerDrag);
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

  function rowHtml(item, index) {
    return `
      <div class="competition-programme-row" data-index="${index}">
        <button type="button" class="programme-drag-handle no-print" data-drag-index="${index}" aria-label="Drag ${escapeProgrammeHtml(item.grade)} ${escapeProgrammeHtml(item.round)} to a new position" title="Drag to reorder">↕</button>
        <span class="programme-sequence">${index + 1}</span>
        <div class="programme-label"><strong>${escapeProgrammeHtml(item.grade)}</strong><span>${escapeProgrammeHtml(item.round)}</span></div>
        <div class="programme-move-actions no-print">
          <button type="button" class="programme-move-btn" data-move="up" data-index="${index}" ${index === 0 ? 'disabled' : ''} aria-label="Move ${escapeProgrammeHtml(item.grade)} ${escapeProgrammeHtml(item.round)} up">↑</button>
          <button type="button" class="programme-move-btn" data-move="down" data-index="${index}" ${index === programmeState.items.length - 1 ? 'disabled' : ''} aria-label="Move ${escapeProgrammeHtml(item.grade)} ${escapeProgrammeHtml(item.round)} down">↓</button>
        </div>
      </div>`;
  }

  function renderProgramme(highlightIndex = null) {
    if (!listEl) return;
    programmeState.items = normalizeProgramme(programmeState.items);

    if (!programmeState.items.length) {
      listEl.innerHTML = '<div class="programme-empty">Select grades/events and enter their rounds above to generate the default programme.</div>';
    } else {
      const groups = groupProgramme(programmeState.items);
      listEl.innerHTML = groups.map(group => `
        <section class="programme-round-group">
          <h4 class="programme-round-heading">${escapeProgrammeHtml(group.label)}</h4>
          <div class="programme-round-rows">
            ${group.items.map(item => rowHtml(item, item.sequence - 1)).join('')}
          </div>
        </section>`).join('');
    }

    if (confirmEl) confirmEl.checked = Boolean(programmeState.confirmed);
    renderProgrammeStatus();
    enforceSubmissionGuard();
    if (Number.isInteger(highlightIndex)) highlightMovedRow(highlightIndex);
  }

  function highlightMovedRow(index) {
    window.clearTimeout(highlightTimer);
    const row = listEl?.querySelector(`.competition-programme-row[data-index="${index}"]`);
    if (!row) return;
    row.classList.add('programme-row-moved');
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    highlightTimer = window.setTimeout(() => row.classList.remove('programme-row-moved'), 2400);
  }

  function renderProgrammeStatus() {
    if (!statusEl) return;
    const matches = programmeMatchesCurrentConfiguration();
    if (!programmeState.items.length) {
      statusEl.className = 'programme-order-status needs-check';
      statusEl.textContent = 'Default programme not available yet.';
    } else if (!matches) {
      statusEl.className = 'programme-order-status needs-check';
      statusEl.textContent = 'The programme is out of date because the grade/round format changed. Reset to the default order and check it again.';
    } else if (programmeState.confirmed) {
      statusEl.className = 'programme-order-status confirmed';
      statusEl.textContent = 'Programme confirmed.';
    } else {
      statusEl.className = 'programme-order-status needs-check';
      statusEl.textContent = programmeState.customised ? 'Custom order saved as a draft. Please check it and confirm.' : 'Default order generated. Please check, reorder if required, then confirm.';
    }
  }

  function markProgrammeChanged() {
    programmeState.customised = true;
    programmeState.confirmed = false;
    updateProgrammeState();
    queueDraftSave();
  }

  function moveProgrammeItem(fromIndex, toIndex) {
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return;
    if (fromIndex < 0 || fromIndex >= programmeState.items.length) return;
    if (toIndex < 0 || toIndex >= programmeState.items.length || fromIndex === toIndex) return;
    const [moved] = programmeState.items.splice(fromIndex, 1);
    programmeState.items.splice(toIndex, 0, moved);
    markProgrammeChanged();
    renderProgramme(toIndex);
  }

  function clearDragTargets() {
    listEl?.querySelectorAll('.programme-drag-target-before, .programme-drag-target-after').forEach(row => {
      row.classList.remove('programme-drag-target-before', 'programme-drag-target-after');
    });
  }

  function beginPointerDrag(event) {
    const handle = event.target.closest('.programme-drag-handle');
    if (!handle || event.button > 0) return;
    const fromIndex = Number.parseInt(handle.dataset.dragIndex, 10);
    if (!Number.isInteger(fromIndex)) return;
    const row = handle.closest('.competition-programme-row');
    if (!row) return;

    event.preventDefault();
    try { handle.setPointerCapture(event.pointerId); } catch (_) {}
    dragState = {
      pointerId: event.pointerId,
      handle,
      row,
      fromIndex,
      startY: event.clientY,
      targetIndex: fromIndex,
      position: 'before',
      moved: false
    };
    row.classList.add('programme-row-dragging');
    document.body.classList.add('programme-reordering');
  }

  function updatePointerDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    event.preventDefault();
    if (!dragState.moved && Math.abs(event.clientY - dragState.startY) < 8) return;

    const rows = [...listEl.querySelectorAll('.competition-programme-row')]
      .filter(row => row !== dragState.row);
    if (!rows.length) return;

    let closest = null;
    let closestDistance = Infinity;
    rows.forEach(row => {
      const rect = row.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(event.clientY - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = { row, rect, center };
      }
    });
    if (!closest) return;

    const targetIndex = Number.parseInt(closest.row.dataset.index, 10);
    const position = event.clientY < closest.center ? 'before' : 'after';
    clearDragTargets();
    closest.row.classList.add(position === 'before' ? 'programme-drag-target-before' : 'programme-drag-target-after');
    dragState.targetIndex = targetIndex;
    dragState.position = position;
    dragState.moved = true;

    if (event.clientY < 80) window.scrollBy({ top: -18, behavior: 'auto' });
    if (event.clientY > window.innerHeight - 80) window.scrollBy({ top: 18, behavior: 'auto' });
  }

  function finishPointerDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    event.preventDefault();
    const currentDrag = dragState;
    dragState = null;
    clearDragTargets();
    currentDrag.row.classList.remove('programme-row-dragging');
    document.body.classList.remove('programme-reordering');
    try { currentDrag.handle.releasePointerCapture(event.pointerId); } catch (_) {}

    if (!currentDrag.moved) return;
    let insertIndex = currentDrag.targetIndex + (currentDrag.position === 'after' ? 1 : 0);
    const [moved] = programmeState.items.splice(currentDrag.fromIndex, 1);
    if (insertIndex > currentDrag.fromIndex) insertIndex -= 1;
    insertIndex = Math.max(0, Math.min(insertIndex, programmeState.items.length));
    programmeState.items.splice(insertIndex, 0, moved);

    if (insertIndex === currentDrag.fromIndex) {
      renderProgramme(currentDrag.fromIndex);
      return;
    }
    markProgrammeChanged();
    renderProgramme(insertIndex);
  }

  function cancelPointerDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const currentDrag = dragState;
    dragState = null;
    clearDragTargets();
    currentDrag.row.classList.remove('programme-row-dragging');
    document.body.classList.remove('programme-reordering');
    try { currentDrag.handle.releasePointerCapture(event.pointerId); } catch (_) {}
  }

  function resetToDefaultOrder(showMessage = false) {
    const hadProgramme = programmeState.items.length > 0;
    const wasConfirmed = programmeState.confirmed;
    programmeState.items = buildDraftProgramme(currentEvents());
    programmeState.confirmed = false;
    programmeState.customised = false;
    updateProgrammeState();
    renderProgramme();
    queueDraftSave();
    if (showMessage && typeof showToast === 'function') {
      showToast(hadProgramme || wasConfirmed ? 'Default programme order restored. Please review and confirm it again.' : 'Default programme order generated.');
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
      resetToDefaultOrder(false);
      if ((previousCustom || previousConfirmed) && typeof showToast === 'function') {
        showToast('The grade/event round format changed, so the default Programme of Events was rebuilt. Please check and confirm it again.');
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
    const groups = groupProgramme(programmeState.items);
    const groupHtml = groups.map(group => `
      <div class="confirmed-programme-group">
        <h4>${escapeProgrammeHtml(group.label)}</h4>
        <ol class="confirmed-programme-group-list" start="${group.items[0]?.sequence || 1}">
          ${group.items.map(item => `<li><strong>${escapeProgrammeHtml(item.grade)}</strong></li>`).join('')}
        </ol>
      </div>`).join('');
    return `<section id="confirmedProgrammeReview" class="review-section"><h3>Programme of Events</h3><p><strong>Status:</strong> ${programmeState.confirmed ? 'Confirmed by organiser' : 'Not confirmed'}</p><div class="confirmed-running-order">${groupHtml || '<p>No programme entered.</p>'}</div></section>`;
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
        pack.appVersion = '1.5.0';
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
          warnings.push('The Programme of Events running order is out of date. Use “Reset to Default Order” and check it again.');
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
    const accepted = Boolean(document.getElementById('termsAccepted')?.checked);
    const submit = document.getElementById('submitBookingRequestBtn');
    const email = document.getElementById('emailBookingRequestBtn');

    if (submit) {
      submit.disabled = submitted || !accepted || !ready;
      if (submitted) {
        submit.title = 'This booking has already been sent.';
      } else if (!accepted) {
        submit.title = 'Accept the Hire Terms & Conditions before submitting.';
      } else if (!ready) {
        submit.title = 'Confirm the Programme of Events running order before submitting.';
      } else {
        submit.title = '';
      }
    }

    if (email) {
      email.disabled = submitted || !ready;
      email.title = !submitted && !ready ? 'Confirm the Programme of Events running order before emailing the booking request.' : '';
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
    .competition-programme-list{margin:12px 0;display:grid;gap:14px}
    .programme-round-group{border:1px solid var(--line,#d6d6d6);border-radius:12px;overflow:hidden;background:#fff}
    .programme-round-heading{margin:0;padding:9px 13px;background:#111;color:#fff;font-size:.95rem;letter-spacing:.02em}
    .programme-round-rows{display:grid}
    .competition-programme-row{display:grid;grid-template-columns:38px 38px minmax(0,1fr) auto;gap:9px;align-items:center;padding:10px 12px;border-top:1px solid var(--line,#e3e3e3);background:var(--surface-soft,#fafafa);transition:background-color .35s ease,box-shadow .35s ease,transform .18s ease}
    .competition-programme-row:first-child{border-top:0}
    .programme-drag-handle{width:36px;height:36px;border:1px solid #aaa;border-radius:8px;background:#fff;color:#333;font-size:19px;font-weight:800;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
    .programme-drag-handle:active{cursor:grabbing}
    .programme-sequence{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#111;color:#fff;font-weight:800}
    .programme-label{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.programme-label strong{font-size:1rem}.programme-label span{color:var(--muted,#666)}
    .programme-move-actions{display:flex;gap:6px}.programme-move-btn{width:38px;height:36px;border:1px solid #aaa;border-radius:8px;background:#fff;color:#111;font-size:18px;font-weight:800;cursor:pointer}.programme-move-btn:disabled{opacity:.3;cursor:not-allowed}
    .programme-row-moved{background:#e7f2ff!important;box-shadow:inset 4px 0 0 #2878c8,0 0 0 2px rgba(40,120,200,.18)}
    .programme-row-dragging{opacity:.58;transform:scale(.995);box-shadow:0 8px 20px rgba(0,0,0,.12)}
    .programme-drag-target-before{box-shadow:inset 0 4px 0 #2878c8}.programme-drag-target-after{box-shadow:inset 0 -4px 0 #2878c8}
    body.programme-reordering{cursor:grabbing}
    .programme-confirm-line{margin-top:14px;padding:14px;border:2px solid var(--brand-2,#EB1D27);border-radius:10px;background:#fffafa}
    .programme-empty{padding:12px;border:1px dashed #bbb;border-radius:8px;color:var(--muted,#666)}
    .confirmed-running-order{display:grid;gap:10px}.confirmed-programme-group{border:1px solid #ddd;border-radius:9px;overflow:hidden}.confirmed-programme-group h4{margin:0;padding:7px 10px;background:#111;color:#fff}.confirmed-programme-group-list{margin:0;padding:9px 10px 9px 40px}.confirmed-programme-group-list li{margin:3px 0}
    @media(max-width:700px){.competition-programme-row{grid-template-columns:38px 34px minmax(0,1fr)}.programme-move-actions{grid-column:3}.programme-label{grid-column:3}.programme-drag-handle{grid-row:1 / span 2}.programme-sequence{grid-row:1 / span 2}.confirmed-running-order{grid-template-columns:1fr}}
    @media print{.competition-programme-card,.confirmed-programme-group{break-inside:avoid;page-break-inside:avoid}.confirmed-running-order{display:block}.confirmed-programme-group{margin-bottom:8px}}
  `;
  document.head.appendChild(style);

  ensureNoviceChoice();
  repairNoviceLoadedState();
  installProgrammeUi();
  installFunctionWrappers();
  installStructureListeners();
  restoreProgrammeFromSavedDraft();
  window.setTimeout(enforceSubmissionGuard, 0);
})();
