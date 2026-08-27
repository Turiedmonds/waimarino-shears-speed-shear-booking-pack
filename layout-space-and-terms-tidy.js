(() => {
  const VERSION = '1.0.1';
  if (window.__waimarinoLayoutSpaceTermsTidyVersion) return;
  window.__waimarinoLayoutSpaceTermsTidyVersion = VERSION;

  function directCardByHeading(panel, headingText) {
    return [...(panel?.querySelectorAll(':scope > .card') || [])]
      .find(card => card.querySelector('h3')?.textContent.trim() === headingText) || null;
  }

  function patchSpaceRequired() {
    const card = [...document.querySelectorAll('.step-panel[data-panel="1"] .card')]
      .find(candidate => candidate.querySelector('h3')?.textContent.trim() === 'Space required');
    if (!card) return false;

    const paragraphs = [...card.querySelectorAll(':scope > p')];
    if (paragraphs.length < 3) return false;

    paragraphs[1].textContent = 'The stand is 4.8 m wide from side to side. The shearing board itself is 1.8 m deep from front to back. The catching-pen fencing extends a further 1.1 m behind the board, making the overall depth 2.9 m from the front edge of the shearing board to the rear catching-pen fence.';
    paragraphs[2].textContent = 'Additional space is required around or near the stand for safe access and for the timing-system operating area. The operating area needs to be within suitable close proximity to the stand, but does not need to be directly beside it.';
    return true;
  }

  function patchCompetitionConfigurationOrder() {
    const panel = document.querySelector('.step-panel[data-panel="3"]');
    const panelHeading = panel?.querySelector(':scope > .panel-heading');
    const gradesCard = directCardByHeading(panel, 'Grades & events');
    const judgingCard = directCardByHeading(panel, 'Judging configuration');
    const eventConfigs = panel?.querySelector(':scope > #eventConfigs');
    if (!panel || !panelHeading || !gradesCard || !judgingCard || !eventConfigs) return false;

    panelHeading.insertAdjacentElement('afterend', judgingCard);
    judgingCard.insertAdjacentElement('afterend', gradesCard);
    gradesCard.insertAdjacentElement('afterend', eventConfigs);

    const gradeChoices = gradesCard.querySelector('#gradeChoices');
    const openLabel = gradeChoices?.querySelector('input[value="Open"]')?.closest('label');
    if (gradeChoices && openLabel) gradeChoices.appendChild(openLabel);

    return true;
  }

  function patchProgrammePlacement() {
    const panel = document.querySelector('.step-panel[data-panel="3"]');
    const eventConfigs = panel?.querySelector(':scope > #eventConfigs');
    const programmeCard = document.getElementById('competitionProgrammeCard');
    if (!panel || !eventConfigs || !programmeCard) return false;

    if (programmeCard.previousElementSibling !== eventConfigs) {
      eventConfigs.insertAdjacentElement('afterend', programmeCard);
    }

    const status = programmeCard.querySelector('#competitionProgrammeStatus');
    const resetButton = programmeCard.querySelector('#resetProgrammeBtn');
    if (!status || !resetButton) return false;

    let actions = programmeCard.querySelector('.programme-reset-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'programme-actions programme-reset-actions no-print';
    }
    actions.appendChild(resetButton);
    status.insertAdjacentElement('afterend', actions);
    return true;
  }

  function patchHireTerms() {
    // The current Terms now live in the initial HTML and booking-policy-final.js.
    // This compatibility layer must not replace them with older wording.
    return Boolean(document.querySelector('.terms-content'));
  }

  function patchHumanPackSpaceSummary() {
    if (typeof buildHumanPackHtml !== 'function' || buildHumanPackHtml.__spaceTidyPatched) return;
    const originalBuildHumanPackHtml = buildHumanPackHtml;
    buildHumanPackHtml = function layoutSpaceTermsTidyHumanPackHtml(...args) {
      return originalBuildHumanPackHtml.apply(this, args).replace(
        '<p><strong>Space:</strong> approximately 4.8 m wide × 2.9 m deep × 2.45 m high, plus additional safe working space. Allow approximately four hours for setup and testing.</p>',
        '<p><strong>Space:</strong> 4.8 m wide from side to side × 2.9 m overall depth × 2.45 m high. The shearing board is 1.8 m deep from front to back and the catching-pen fencing extends a further 1.1 m behind it. Additional safe working space is required around or near the stand, including a timing-system operating area within suitable close proximity. Allow approximately four hours for setup and testing.</p>'
      );
    };
    buildHumanPackHtml.__spaceTidyPatched = true;
  }

  function initialiseStatic(attempt = 0) {
    const spaceReady = patchSpaceRequired();
    const configReady = patchCompetitionConfigurationOrder();
    const termsReady = patchHireTerms();
    patchHumanPackSpaceSummary();
    if ((!spaceReady || !configReady || !termsReady) && attempt < 30) {
      window.setTimeout(() => initialiseStatic(attempt + 1), 100);
    }
  }

  function initialiseProgramme(attempt = 0) {
    if (patchProgrammePlacement()) return;
    if (attempt < 60) window.setTimeout(() => initialiseProgramme(attempt + 1), 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initialiseStatic();
      initialiseProgramme();
    }, { once: true });
  } else {
    initialiseStatic();
    initialiseProgramme();
  }
})();