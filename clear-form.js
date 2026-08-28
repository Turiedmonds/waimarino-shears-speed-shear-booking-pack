(() => {
  const SUBMISSION_EMAIL = 'Waimarinoshears@gmail.com';
  const DRAFT_KEY = typeof STORAGE_KEY === 'undefined'
    ? 'waimarinoSpeedShearBookingPackDraftV1'
    : STORAGE_KEY;

  let clearInProgress = false;

  if (typeof saveDraft === 'function') {
    const previousSaveDraft = saveDraft;
    saveDraft = function clearAwareSaveDraft(...args) {
      if (clearInProgress) return;
      return previousSaveDraft.apply(this, args);
    };
  }

  function clearForm() {
    const submitted = typeof state !== 'undefined' && state.booking?.status === 'submitted';
    const message = submitted
      ? `Clear this form from this browser and return to a blank form?\n\nThis does not cancel or change the booking you already submitted. If you need to change that submitted booking, email ${SUBMISSION_EMAIL} and quote your Booking Reference.`
      : 'Clear this form and start again?\n\nThis will remove all information entered and saved in this browser. This cannot be undone.';

    if (!window.confirm(message)) return;

    clearInProgress = true;
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
    window.location.reload();
  }

  function installClearButton() {
    const actions = document.querySelector('.header-actions');
    if (!actions || document.getElementById('clearBookingFormBtn')) return;

    const button = document.createElement('button');
    button.id = 'clearBookingFormBtn';
    button.className = 'button secondary';
    button.type = 'button';
    button.textContent = 'Clear Form';
    button.title = 'Clear the information saved in this browser and return to a blank form.';
    button.addEventListener('click', clearForm);
    actions.appendChild(button);
    actions.classList.remove('hidden');
  }

  const PROGRAMME_EMPTY_GUIDANCE = 'Select one or more grades or events above to generate a suggested Programme of Events.';
  const PROGRAMME_READY_GUIDANCE = 'We have generated a suggested running order from the grades, events and rounds above. Use it as a starting point, then reorder anything needed so it matches the programme you intend to run on the day.';
  const COPY_HELP_TEXT = 'Copy Round Format lets you reuse the rounds from another grade or event that has already been completed. After copying, check the sheep per shearer and number qualifying because these can differ between grades or events.';

  function roundNameFromRow(row) {
    const select = row.querySelector('.round-name-select');
    if (!select) return '';
    if (select.value === 'custom') return row.querySelector('.custom-round-name')?.value.trim() || '';
    return String(select.value || '').trim();
  }

  function hasCompletedRoundFormat(section) {
    const rows = [...section.querySelectorAll('.round-row')];
    if (rows.length < 1) return false;

    return rows.every(row => {
      const roundName = roundNameFromRow(row);
      const sheepPerShearer = Number.parseInt(row.querySelector('.sheep-per-shearer')?.value, 10);
      if (!roundName || !Number.isInteger(sheepPerShearer) || sheepPerShearer < 1) return false;

      const isFinal = row.dataset.anchor === 'final' || /^final$/i.test(roundName);
      if (isFinal) return true;

      const qualifiers = Number.parseInt(row.querySelector('.qualifiers-input')?.value, 10);
      return Number.isInteger(qualifiers) && qualifiers > 0;
    });
  }

  function completedCopySourcesFor(section) {
    return [...document.querySelectorAll('#eventConfigs .event-card')]
      .filter(candidate => candidate !== section && hasCompletedRoundFormat(candidate))
      .map(candidate => candidate.dataset.event)
      .filter(Boolean);
  }

  function ensureCopyShortcut(section) {
    const copyBox = section.querySelector('.copy-progression');
    if (!copyBox) return null;

    let shortcut = section.querySelector('.copy-round-format-shortcut');
    if (shortcut) return shortcut;

    shortcut = document.createElement('div');
    shortcut.className = 'copy-round-format-shortcut no-print';

    const controls = document.createElement('div');
    controls.className = 'copy-round-format-shortcut-controls';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'button secondary small copy-round-format-toggle';
    toggle.textContent = 'Copy Round Format';
    toggle.setAttribute('aria-expanded', 'false');

    const help = document.createElement('button');
    help.type = 'button';
    help.className = 'copy-round-format-help';
    help.textContent = '?';
    help.setAttribute('aria-label', 'Help with Copy Round Format');
    help.setAttribute('title', 'What does Copy Round Format do?');
    help.setAttribute('aria-expanded', 'false');

    const helpText = document.createElement('p');
    helpText.className = 'copy-round-format-help-text hidden';
    helpText.textContent = COPY_HELP_TEXT;

    controls.append(toggle, help);
    shortcut.append(controls, helpText);
    copyBox.insertAdjacentElement('beforebegin', shortcut);

    copyBox.dataset.expanded = 'false';
    copyBox.hidden = true;

    toggle.addEventListener('click', () => {
      const opening = copyBox.dataset.expanded !== 'true';
      copyBox.dataset.expanded = opening ? 'true' : 'false';
      copyBox.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
    });

    help.addEventListener('click', () => {
      const opening = helpText.classList.contains('hidden');
      helpText.classList.toggle('hidden', !opening);
      help.setAttribute('aria-expanded', String(opening));
    });

    return shortcut;
  }

  function refreshCopyShortcuts() {
    const sections = [...document.querySelectorAll('#eventConfigs .event-card')];

    sections.forEach(section => {
      const copyBox = section.querySelector('.copy-progression');
      const sourceSelect = section.querySelector('.copy-source-select');
      const copyButton = section.querySelector('.copy-progression-btn');
      if (!copyBox || !sourceSelect || !copyButton) return;

      const shortcut = ensureCopyShortcut(section);
      const toggle = shortcut?.querySelector('.copy-round-format-toggle');
      const sources = completedCopySourcesFor(section);
      const previous = sourceSelect.value;

      sourceSelect.innerHTML = '<option value="">Choose a grade / event…</option>';
      sources.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        sourceSelect.appendChild(option);
      });

      if (sources.includes(previous)) sourceSelect.value = previous;
      sourceSelect.disabled = sources.length === 0;
      copyButton.disabled = sources.length === 0;

      const available = sources.length > 0;
      shortcut?.classList.toggle('hidden', !available);
      if (!available) {
        copyBox.dataset.expanded = 'false';
        copyBox.hidden = true;
        toggle?.setAttribute('aria-expanded', 'false');
      } else {
        copyBox.hidden = copyBox.dataset.expanded !== 'true';
      }
    });
  }

  function updateProgrammeGuidance() {
    const card = document.getElementById('competitionProgrammeCard');
    if (!card) return false;
    const heading = card.querySelector('.competition-programme-heading');
    const guidance = heading?.nextElementSibling;
    if (!guidance || guidance.tagName !== 'P') return false;

    const hasProgramme = Boolean(card.querySelector('.competition-programme-row'));
    guidance.textContent = hasProgramme ? PROGRAMME_READY_GUIDANCE : PROGRAMME_EMPTY_GUIDANCE;
    return true;
  }

  function waitForProgrammeGuidance(attempt = 0) {
    if (updateProgrammeGuidance()) return;
    if (attempt >= 30) return;
    window.setTimeout(() => waitForProgrammeGuidance(attempt + 1), 100);
  }

  function installConfigurationUiPolish() {
    const eventConfigs = document.getElementById('eventConfigs');
    const gradeChoices = document.getElementById('gradeChoices');
    if (!eventConfigs || !gradeChoices) return;

    if (typeof refreshCopySourceOptions === 'function' && !refreshCopySourceOptions.__completedSourcesOnly) {
      const originalRefreshCopySourceOptions = refreshCopySourceOptions;
      refreshCopySourceOptions = function completedSourcesRefreshCopySourceOptions() {
        originalRefreshCopySourceOptions();
        refreshCopyShortcuts();
      };
      refreshCopySourceOptions.__completedSourcesOnly = true;
    }

    gradeChoices.addEventListener('change', () => {
      window.setTimeout(() => {
        refreshCopyShortcuts();
        updateProgrammeGuidance();
      }, 0);
    });

    eventConfigs.addEventListener('input', event => {
      if (!event.target.closest('.event-card')) return;
      window.setTimeout(refreshCopyShortcuts, 0);
    });

    eventConfigs.addEventListener('change', event => {
      if (!event.target.closest('.event-card')) return;
      window.setTimeout(() => {
        refreshCopyShortcuts();
        updateProgrammeGuidance();
      }, 0);
    });

    eventConfigs.addEventListener('click', event => {
      const copyButton = event.target.closest('.copy-progression-btn');
      if (copyButton) {
        const section = copyButton.closest('.event-card');
        const sourceSelect = section?.querySelector('.copy-source-select');
        window.setTimeout(() => {
          if (section && sourceSelect?.value) {
            const copyBox = section.querySelector('.copy-progression');
            const toggle = section.querySelector('.copy-round-format-toggle');
            if (copyBox) {
              copyBox.dataset.expanded = 'false';
              copyBox.hidden = true;
            }
            toggle?.setAttribute('aria-expanded', 'false');
          }
          refreshCopyShortcuts();
          updateProgrammeGuidance();
        }, 0);
        return;
      }

      if (event.target.closest('.add-round-btn, .remove-round-btn')) {
        window.setTimeout(() => {
          refreshCopyShortcuts();
          updateProgrammeGuidance();
        }, 0);
      }
    });

    refreshCopyShortcuts();
    waitForProgrammeGuidance();
  }

  const style = document.createElement('style');
  style.textContent = `
    .copy-round-format-shortcut{margin:14px 0 8px}
    .copy-round-format-shortcut-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
    .copy-round-format-help{display:inline-grid;place-items:center;width:30px;height:30px;border:1px solid #999;border-radius:50%;background:#fff;color:#444;font-weight:900;line-height:1;cursor:pointer}
    .copy-round-format-help:hover{border-color:var(--brand-2);color:var(--brand-2)}
    .copy-round-format-help-text{margin:8px 0 0;padding:10px 12px;border-left:4px solid var(--brand-2);border-radius:8px;background:#fff7f7;color:#444;font-size:.9rem}
    .copy-progression[hidden]{display:none!important}
  `;
  document.head.appendChild(style);

  function installTermsVersionConsistency() {
    const CURRENT_TERMS_VERSION = '28 August 2026';

    function applyCurrentTermsVersion() {
      if (typeof state !== 'undefined' && state?.booking) {
        state.booking.termsVersion = CURRENT_TERMS_VERSION;
      }
    }

    applyCurrentTermsVersion();

    if (typeof syncStateFromForm === 'function' && !syncStateFromForm.__termsVersionConsistencyWrapped) {
      const original = syncStateFromForm;
      syncStateFromForm = function termsVersionConsistentSyncStateFromForm(...args) {
        const result = original.apply(this, args);
        applyCurrentTermsVersion();
        return result;
      };
      syncStateFromForm.__termsVersionConsistencyWrapped = true;
    }

    if (typeof buildPackage === 'function' && !buildPackage.__termsVersionConsistencyWrapped) {
      const original = buildPackage;
      buildPackage = function termsVersionConsistentBuildPackage(...args) {
        applyCurrentTermsVersion();
        const pack = original.apply(this, args);
        if (pack?.booking) pack.booking.termsVersion = CURRENT_TERMS_VERSION;
        applyCurrentTermsVersion();
        return pack;
      };
      buildPackage.__termsVersionConsistencyWrapped = true;
    }

    document.getElementById('termsAccepted')?.addEventListener('change', () => {
      applyCurrentTermsVersion();
      if (typeof syncAcceptance === 'function') syncAcceptance();
    });

    window.setTimeout(applyCurrentTermsVersion, 500);
    window.setTimeout(applyCurrentTermsVersion, 1500);
    window.setTimeout(applyCurrentTermsVersion, 3500);
  }

  installClearButton();
  installConfigurationUiPolish();
  installTermsVersionConsistency();
})();