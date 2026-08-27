(() => {
  const VERSION = '1.1.0';
  if (window.__waimarinoBoardJudgeHelpVersion === VERSION) return;
  window.__waimarinoBoardJudgeHelpVersion = VERSION;

  const HELP_TEXT = 'A Board judge monitors competitors on the shearing board for plucking after time has stopped, early starts and false starts.';
  const PLACEHOLDER_TEXT = 'Select an option';
  const WARNING_TEXT = 'Choose whether there will be a Board judge.';

  function normaliseSelection(value) {
    return value === 'yes' || value === 'no' ? value : '';
  }

  function getSelect() {
    return document.getElementById('hasBoardJudge');
  }

  function ensurePlaceholder(select) {
    if (!select) return;
    let placeholder = [...select.options].find(option => option.value === '');
    if (!placeholder) {
      placeholder = document.createElement('option');
      placeholder.value = '';
      select.insertBefore(placeholder, select.firstChild);
    }
    placeholder.textContent = PLACEHOLDER_TEXT;
  }

  function judgingState() {
    if (typeof state === 'undefined') return null;
    state.competitionSetup = state.competitionSetup || {};
    state.competitionSetup.judging = state.competitionSetup.judging || {};
    return state.competitionSetup.judging;
  }

  function syncSelectionMarker() {
    const select = getSelect();
    const judging = judgingState();
    if (!select || !judging) return;
    judging.boardJudgeSelection = normaliseSelection(select.value);
  }

  function applySavedSelection() {
    const select = getSelect();
    const judging = judgingState();
    if (!select || !judging) return;

    const hasMarker = Object.prototype.hasOwnProperty.call(judging, 'boardJudgeSelection');
    if (hasMarker) {
      select.value = normaliseSelection(judging.boardJudgeSelection);
    } else if (typeof state !== 'undefined' && state.booking?.status !== 'submitted') {
      // Older drafts were created when "No" was the default, so require a
      // deliberate choice the next time that draft is used. Submitted legacy
      // bookings keep their recorded Yes/No value when reopened.
      select.value = '';
      judging.boardJudgeSelection = '';
    }

    document.getElementById('boardJudgeCountWrap')?.classList.toggle('hidden', select.value !== 'yes');
    select.setAttribute('aria-invalid', String(!normaliseSelection(select.value)));
  }

  function installHelpAndSelection() {
    const select = getSelect();
    const field = select?.closest('.field');
    if (!select || !field) return false;

    ensurePlaceholder(select);
    select.setAttribute('aria-required', 'true');

    let help = document.getElementById('boardJudgeHelpText');
    if (!help) {
      help = document.createElement('p');
      help.id = 'boardJudgeHelpText';
      help.className = 'help-text';
      help.style.marginBottom = '0';
      select.insertAdjacentElement('afterend', help);
    }
    help.textContent = HELP_TEXT;

    applySavedSelection();

    if (!select.dataset.explicitBoardJudgeChoice) {
      select.dataset.explicitBoardJudgeChoice = 'true';
      select.addEventListener('change', () => {
        syncSelectionMarker();
        select.setAttribute('aria-invalid', String(!normaliseSelection(select.value)));
        document.getElementById('boardJudgeCountWrap')?.classList.toggle('hidden', select.value !== 'yes');
      });
    }

    return true;
  }

  function installValidationWrapper() {
    if (typeof validateForReview !== 'function' || validateForReview.__boardJudgeChoiceWrapped) return;
    const original = validateForReview;
    const wrapped = function boardJudgeChoiceValidateForReview(...args) {
      const warnings = original.apply(this, args);
      const select = getSelect();
      const answered = Boolean(normaliseSelection(select?.value));
      select?.setAttribute('aria-invalid', String(!answered));
      if (!answered) warnings.push(WARNING_TEXT);
      return [...new Set(warnings)];
    };
    wrapped.__boardJudgeChoiceWrapped = true;
    validateForReview = wrapped;
  }

  function installReviewWrapper() {
    if (typeof buildReview !== 'function' || buildReview.__boardJudgeChoiceWrapped) return;
    const original = buildReview;
    const wrapped = function boardJudgeChoiceBuildReview(...args) {
      const result = original.apply(this, args);
      if (!normaliseSelection(getSelect()?.value)) {
        document.querySelectorAll('#reviewContent .review-item').forEach(item => {
          if (item.querySelector('span')?.textContent.trim() !== 'Board judge') return;
          const value = item.querySelector('strong');
          if (value) value.textContent = '—';
        });
      }
      return result;
    };
    wrapped.__boardJudgeChoiceWrapped = true;
    buildReview = wrapped;
  }

  function installPackageWrapper() {
    if (typeof buildPackage !== 'function' || buildPackage.__boardJudgeChoiceWrapped) return;
    const original = buildPackage;
    const wrapped = function boardJudgeChoiceBuildPackage(submitted = false) {
      syncSelectionMarker();
      const pack = original.call(this, submitted);
      pack.competitionSetup = pack.competitionSetup || {};
      pack.competitionSetup.judging = pack.competitionSetup.judging || {};
      const selection = normaliseSelection(getSelect()?.value);

      if (submitted && selection) {
        delete pack.competitionSetup.judging.boardJudgeSelection;
      } else {
        pack.competitionSetup.judging.boardJudgeSelection = selection;
      }
      return pack;
    };
    wrapped.__boardJudgeChoiceWrapped = true;
    buildPackage = wrapped;
  }

  function installApplyStateWrapper() {
    if (typeof applyStateToForm !== 'function' || applyStateToForm.__boardJudgeChoiceWrapped) return;
    const original = applyStateToForm;
    const wrapped = function boardJudgeChoiceApplyStateToForm(...args) {
      const result = original.apply(this, args);
      ensurePlaceholder(getSelect());
      applySavedSelection();
      return result;
    };
    wrapped.__boardJudgeChoiceWrapped = true;
    applyStateToForm = wrapped;
  }

  function showSubmissionWarning() {
    if (normaliseSelection(getSelect()?.value)) return false;

    try { if (typeof buildReview === 'function') buildReview(); } catch (_) {}
    const box = document.getElementById('submissionStatus');
    if (box) {
      box.className = 'submission-status error';
      box.innerHTML = '<strong>Board judge selection is required.</strong><br>Go back to Competition Configuration and choose Yes or No for “Will there be a Board judge?”.';
      box.classList.remove('hidden');
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (typeof showToast === 'function') {
      showToast(WARNING_TEXT);
    }
    return true;
  }

  function installSubmissionGuard() {
    if (document.documentElement.dataset.boardJudgeSubmissionGuard === 'true') return;
    document.documentElement.dataset.boardJudgeSubmissionGuard = 'true';
    document.addEventListener('click', event => {
      const button = event.target.closest('#submitBookingRequestBtn, #emailBookingRequestBtn');
      if (!button || !showSubmissionWarning()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function initialise(attempt = 0) {
    const installed = installHelpAndSelection();
    installValidationWrapper();
    installReviewWrapper();
    installPackageWrapper();
    installApplyStateWrapper();
    installSubmissionGuard();

    if (!installed && attempt < 30) {
      window.setTimeout(() => initialise(attempt + 1), 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initialise(), { once: true });
  } else {
    initialise();
  }
})();