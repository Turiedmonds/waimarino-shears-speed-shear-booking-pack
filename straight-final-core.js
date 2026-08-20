(() => {
  if (window.__waimarinoStraightFinalVersion) return;
  window.__waimarinoStraightFinalVersion = '1.0.0';

  if (
    typeof normalizeRounds !== 'function' ||
    typeof renderRoundSequence !== 'function' ||
    typeof addRoundRow !== 'function' ||
    typeof renderEventSection !== 'function'
  ) return;

  const originalNormalizeRounds = normalizeRounds;
  const originalAddRoundRow = addRoundRow;
  const originalRenderEventSection = renderEventSection;

  normalizeRounds = function straightFinalAwareNormalizeRounds(rounds) {
    const input = Array.isArray(rounds) ? rounds : [];
    const hasFinal = input.some(round => /^final$/i.test(String(round?.name || '').trim()));
    const hasHeats = input.some(round => /^heats?$/i.test(String(round?.name || '').trim()));
    const normalized = originalNormalizeRounds(rounds);

    if (hasFinal && !hasHeats) {
      return normalized.filter(round => !/^heats?$/i.test(String(round?.name || '').trim()));
    }
    return normalized;
  };

  function isFinalRow(row) {
    if (!row) return false;
    if (row.dataset.anchor === 'final') return true;
    const select = row.querySelector('.round-name-select');
    const custom = row.querySelector('.custom-round-name')?.value.trim() || '';
    const name = select?.value === 'custom' ? custom : String(select?.value || '').trim();
    return /^final$/i.test(name);
  }

  function saveCurrentRoundState() {
    try {
      if (typeof state !== 'undefined' && typeof collectEventsFromDom === 'function') {
        state.competitionSetup = state.competitionSetup || {};
        state.competitionSetup.events = collectEventsFromDom();
      }
    } catch (_) {}

    window.setTimeout(() => {
      try {
        if (typeof saveDraft === 'function') saveDraft(false);
      } catch (_) {}
    }, 0);
  }

  function makeHeatsRemovable(row, roundList) {
    if (!row || row.dataset.anchor !== 'heats') return;
    const existing = row.querySelector('.remove-round-btn');
    if (!existing || existing.dataset.straightFinalBound === 'true') return;

    const button = existing.cloneNode(true);
    button.dataset.straightFinalBound = 'true';
    button.classList.remove('hidden');
    button.setAttribute('aria-label', 'Remove Heats and run as a straight Final');
    button.title = 'Remove Heats — make this a straight Final';
    existing.replaceWith(button);

    button.addEventListener('click', event => {
      const rows = [...roundList.querySelectorAll('.round-row')];
      const extraRounds = rows.filter(candidate => candidate !== row && !isFinalRow(candidate));
      const finalRow = rows.find(candidate => isFinalRow(candidate));

      if (!finalRow) {
        event.stopPropagation();
        if (typeof showToast === 'function') showToast('A Final is required before Heats can be removed.');
        return;
      }

      if (extraRounds.length) {
        event.stopPropagation();
        if (typeof showToast === 'function') {
          showToast('Remove the extra rounds first if this grade or event is to run as a straight Final.');
        }
        return;
      }

      const confirmed = window.confirm('Remove Heats and run this grade or event as a straight Final?');
      if (!confirmed) {
        event.stopPropagation();
        return;
      }

      row.remove();
      if (typeof renumberRounds === 'function') renumberRounds(roundList);
      saveCurrentRoundState();
      if (typeof showToast === 'function') showToast('Heats removed. This grade or event will run as a straight Final.');
    });
  }

  addRoundRow = function straightFinalAwareAddRoundRow(roundList, round, options = {}) {
    const before = new Set([...roundList.querySelectorAll('.round-row')]);
    originalAddRoundRow(roundList, round, options);
    const added = [...roundList.querySelectorAll('.round-row')].find(row => !before.has(row));
    if (options.lockedName === 'Heats') makeHeatsRemovable(added, roundList);
  };

  renderRoundSequence = function straightFinalAwareRenderRoundSequence(roundList, rounds) {
    const normalized = normalizeRounds(rounds);
    normalized.forEach((round, index) => {
      const name = String(round?.name || '').trim();
      const isFirstHeats = index === 0 && /^heats?$/i.test(name);
      const isLastFinal = index === normalized.length - 1 && /^final$/i.test(name);
      const lockedName = isFirstHeats ? 'Heats' : (isLastFinal ? 'Final' : null);
      addRoundRow(roundList, round, { lockedName });
    });
    if (typeof renumberRounds === 'function') renumberRounds(roundList);
  };

  function patchRoundFormatText(section) {
    const helper = section?.querySelector('.rounds-heading p');
    if (helper) {
      helper.textContent = 'Heats and Final are added by default. For a straight Final, remove Heats. Otherwise add any rounds that happen between Heats and Final.';
    }
  }

  function patchEventSection(section) {
    if (!section) return;
    patchRoundFormatText(section);
    const roundList = section.querySelector('.round-list');
    const heatsRow = roundList?.querySelector('.round-row[data-anchor="heats"]');
    if (roundList && heatsRow) makeHeatsRemovable(heatsRow, roundList);
  }

  renderEventSection = function straightFinalAwareRenderEventSection(name, data) {
    originalRenderEventSection(name, data);
    const section = [...document.querySelectorAll('#eventConfigs .event-card')]
      .find(candidate => candidate.dataset.event === name);
    patchEventSection(section);
  };

  function repairStraightFinalsFromSavedDraft() {
    let saved;
    try {
      const key = typeof STORAGE_KEY === 'undefined' ? 'waimarinoSpeedShearBookingPackDraftV1' : STORAGE_KEY;
      const raw = localStorage.getItem(key);
      saved = raw ? JSON.parse(raw) : null;
    } catch (_) {
      return;
    }

    const events = saved?.competitionSetup?.events;
    if (!events || typeof events !== 'object') return;

    Object.entries(events).forEach(([rawName, rawEvent]) => {
      const rounds = Array.isArray(rawEvent?.rounds) ? rawEvent.rounds : [];
      const hasFinal = rounds.some(round => /^final$/i.test(String(round?.name || '').trim()));
      const hasHeats = rounds.some(round => /^heats?$/i.test(String(round?.name || '').trim()));
      if (!hasFinal || hasHeats) return;

      const name = typeof normalizedEventName === 'function' ? normalizedEventName(rawName) : rawName;
      if (typeof state !== 'undefined' && state.competitionSetup?.events?.[name]) {
        state.competitionSetup.events[name].rounds = normalizeRounds(rounds);
      }

      const section = [...document.querySelectorAll('#eventConfigs .event-card')]
        .find(candidate => candidate.dataset.event === name);
      const roundList = section?.querySelector('.round-list');
      roundList?.querySelector('.round-row[data-anchor="heats"]')?.remove();
      if (roundList && typeof renumberRounds === 'function') renumberRounds(roundList);
    });
  }

  function patchHelpDialog() {
    const dialog = document.getElementById('progressionHelpDialog');
    if (!dialog) return;
    const paragraphs = [...dialog.querySelectorAll('.dialog-body > p')];
    const anchorHelp = paragraphs.find(paragraph => /Heats are always first/i.test(paragraph.textContent));
    if (anchorHelp) {
      anchorHelp.innerHTML = '<strong>Heats and Final are added by default.</strong> If the grade or event is a straight Final, remove Heats and leave Final as the only round. If additional rounds are used, add them between Heats and Final.';
    }
  }

  repairStraightFinalsFromSavedDraft();
  document.querySelectorAll('#eventConfigs .event-card').forEach(patchEventSection);
  patchHelpDialog();
})();
