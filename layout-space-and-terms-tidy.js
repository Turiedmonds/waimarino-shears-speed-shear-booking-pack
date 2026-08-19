(() => {
  const VERSION = '1.0.0';
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
    paragraphs[2].textContent = 'Additional room is required around or near the stand for safe access and for the timing-system operating area. The operating area needs to be within suitable close proximity to the stand, but does not need to be directly beside it.';
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

  function paragraphAfter(heading) {
    let element = heading?.nextElementSibling || null;
    while (element && element.tagName !== 'P' && element.tagName !== 'H4') element = element.nextElementSibling;
    return element?.tagName === 'P' ? element : null;
  }

  function upsertParagraph(id, html) {
    let paragraph = document.getElementById(id);
    if (!paragraph) {
      paragraph = document.createElement('p');
      paragraph.id = id;
    }
    paragraph.innerHTML = html;
    return paragraph;
  }

  function upsertHeading(id, text) {
    let heading = document.getElementById(id);
    if (!heading) {
      heading = document.createElement('h4');
      heading.id = id;
    }
    heading.textContent = text;
    return heading;
  }

  function patchHireTerms() {
    const terms = document.querySelector('.terms-content');
    if (!terms) return false;

    const equipmentHeading = [...terms.querySelectorAll('h4')]
      .find(heading => heading.textContent.trim() === 'Equipment and operating conditions');
    const competitionHeading = [...terms.querySelectorAll('h4')]
      .find(heading => heading.textContent.trim() === 'Competition operation');
    const privacyHeading = document.getElementById('privacyDataUseHeading') || [...terms.querySelectorAll('h4')]
      .find(heading => heading.textContent.trim() === 'Privacy and use of information');
    if (!equipmentHeading || !competitionHeading || !privacyHeading) return false;

    const existingEquipmentFirstParagraph = paragraphAfter(equipmentHeading);
    const maintenance = upsertParagraph(
      'equipmentConditionMaintenanceTerm',
      '<strong>Condition and maintenance of supplied equipment:</strong> Waimarino Shears Incorporated will take reasonable care before each hire to inspect, service and maintain the speed shear stand, shearing plants, timing equipment and other equipment it supplies so that, so far as reasonably practicable, the equipment is in a safe and serviceable condition for its intended use. Known faults identified through previous use or normal pre-hire checks will be addressed before the equipment is supplied where reasonably practicable.'
    );
    if (existingEquipmentFirstParagraph && maintenance !== existingEquipmentFirstParagraph.previousElementSibling) {
      equipmentHeading.insertAdjacentElement('afterend', maintenance);
    }

    const healthHeading = upsertHeading('healthSafetyAccessHeading', 'Health, safety and access');
    const healthTerm = upsertParagraph(
      'healthSafetyAccessTerm',
      'The organiser is responsible, to the extent of its influence and control, for managing health and safety matters relating to the venue and conduct of the event. This includes providing safe access to and around the speed shear stand, managing stairs, staging and accessways, controlling crowds and event personnel, and taking reasonable steps to prevent unauthorised, intoxicated or otherwise unsafe persons from accessing or using the stand or supplied equipment. Waimarino Shears Incorporated is not responsible for injury, loss or damage caused by venue hazards, event management, participant conduct or other matters outside its reasonable influence or control. <strong>Nothing in these terms transfers or excludes any health and safety duty or other liability that cannot lawfully be transferred or excluded.</strong>'
    );
    competitionHeading.insertAdjacentElement('beforebegin', healthHeading);
    healthHeading.insertAdjacentElement('afterend', healthTerm);

    const animalHeading = upsertHeading('animalWelfareHeading', 'Animal welfare');
    const animalTerm = upsertParagraph(
      'animalWelfareTerm',
      'The organiser is responsible, to the extent of its influence and control, for animal welfare and animal handling at the event and for ensuring competitors, sheep-handling personnel and other relevant event personnel comply with applicable animal-welfare requirements and competition rules. The organiser must take reasonable steps to ensure animals are handled by suitably competent and authorised people. Waimarino Shears Incorporated provides the speed shear stand and timing service and does not direct or control the handling or treatment of animals. Waimarino Shears Incorporated is not responsible for harm to an animal caused by a competitor, the organiser, its staff or other event personnel, except to the extent Waimarino Shears Incorporated is responsible at law for its own acts or omissions or the condition of equipment it supplies.'
    );
    privacyHeading.insertAdjacentElement('beforebegin', animalHeading);
    animalHeading.insertAdjacentElement('afterend', animalTerm);

    return true;
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
