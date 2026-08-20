(() => {
  if (window.__waimarinoHireOptionsVersion) return;
  window.__waimarinoHireOptionsVersion = '1.0.0';

  const DRAFT_KEY = typeof STORAGE_KEY === 'undefined'
    ? 'waimarinoSpeedShearBookingPackDraftV1'
    : STORAGE_KEY;
  const SUBMISSION_EMAIL = 'Waimarinoshears@gmail.com';

  function normaliseSetupType(value) {
    return value === 'electronics-only' ? 'electronics-only' : 'full';
  }

  function normaliseStands(value) {
    return Number(value) === 1 ? 1 : 2;
  }

  function normaliseBrandingAfterEvent(value) {
    return ['store', 'return'].includes(value) ? value : '';
  }

  function ensureHireState() {
    if (typeof state === 'undefined') return;
    state.hire = state.hire || {};
    state.hire.setupType = normaliseSetupType(state.hire.setupType);
    state.hire.competitionBranding = state.hire.setupType === 'full' && state.hire.competitionBranding === true;
    state.hire.brandingAfterEvent = state.hire.competitionBranding
      ? normaliseBrandingAfterEvent(state.hire.brandingAfterEvent)
      : '';
    state.competitionSetup = state.competitionSetup || {};
    state.competitionSetup.stands = normaliseStands(state.competitionSetup.stands);
  }

  function restoreSavedHireState() {
    if (typeof state === 'undefined') return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved?.hire) state.hire = { ...(state.hire || {}), ...saved.hire };
      if (saved?.competitionSetup && Object.prototype.hasOwnProperty.call(saved.competitionSetup, 'stands')) {
        state.competitionSetup = state.competitionSetup || {};
        state.competitionSetup.stands = normaliseStands(saved.competitionSetup.stands);
      }
    } catch (_) {}
    ensureHireState();
  }

  function setupTypeLabel(value) {
    return normaliseSetupType(value) === 'electronics-only'
      ? 'Electronics & operation on organiser-supplied shearing stand'
      : 'Full Waimarino Shears stand, electronics & operation';
  }

  function brandingAfterEventLabel(value) {
    if (value === 'store') return 'Leave with Waimarino Shears for storage and future hires';
    if (value === 'return') return 'Return to organiser after the competition';
    return '—';
  }

  function patchHireInformation() {
    const panel = document.querySelector('.step-panel[data-panel="1"]');
    if (!panel) return;

    const provideCard = [...panel.querySelectorAll('.card')]
      .find(card => card.querySelector('h3')?.textContent.trim() === 'What we provide');
    const list = provideCard?.querySelector('ul');
    if (list && !list.dataset.hireOptionsPatched) {
      list.dataset.hireOptionsPatched = 'true';
      list.innerHTML = `
        <li><strong>Standard full setup:</strong> our modular speed shear stand, configured for one or two competition stands as selected</li>
        <li>Heiniger Evo shearing plant equipment for the selected stand configuration</li>
        <li>Speed Shear Timing System</li>
        <li>TV display equipment appropriate to the selected stand configuration</li>
        <li>Devices required for judging interaction with the timing system</li>
        <li>Catching pens incorporated into our speed shear stand when our stand is supplied</li>
        <li>Backup manual timing equipment, including stopwatches</li>
        <li>Extension leads and cable reels required for our supplied equipment</li>
        <li>Transport, setup, testing and pack-down of our supplied equipment</li>
        <li>A minimum of three Waimarino Shears personnel to operate the system</li>
        <li>Competition entry forms, if required, to assist with competitor entries</li>
        <li><strong>Electronics & operation option:</strong> by selection in this booking, we can install and operate our timing electronics on a suitable organiser-supplied shearing stand</li>`;
      const note = document.createElement('p');
      note.className = 'note';
      note.innerHTML = '<strong>The standard NZ$750 + GST hire fee applies to either setup type and to one- or two-stand operation.</strong> The main service work—transport, electronics setup, testing, operation and pack-down—remains substantially the same.';
      list.insertAdjacentElement('afterend', note);
    }

    const spaceCard = [...panel.querySelectorAll('.card')]
      .find(card => card.querySelector('h3')?.textContent.trim() === 'Space required');
    if (spaceCard && !spaceCard.dataset.hireOptionsPatched) {
      spaceCard.dataset.hireOptionsPatched = 'true';
      const measure = spaceCard.querySelector('.big-measure');
      if (measure) measure.textContent = 'Full two-stand setup: 4.8 m wide × 2.9 m deep × 2.45 m high';
      const paragraphs = [...spaceCard.querySelectorAll(':scope > p')].filter(p => p !== measure);
      if (paragraphs[0]) {
        paragraphs[0].textContent = 'The dimensions above are for our full two-stand setup. One-stand operation uses only one side of our modular stand and requires less width. If you select electronics and operation on your own stand, the organiser-supplied stand determines the physical stand footprint.';
      }
      if (paragraphs[1]) {
        paragraphs[1].textContent = 'Additional room is always required around or near the active stand for safe access and for the timing-system operating area.';
      }
    }
  }

  function installHireSetupCard() {
    const panel = document.querySelector('.step-panel[data-panel="2"]');
    const costBox = panel?.querySelector('.cost-box');
    if (!panel || !costBox || document.getElementById('hireConfigurationCard')) return;

    const card = document.createElement('section');
    card.id = 'hireConfigurationCard';
    card.className = 'card';
    card.innerHTML = `
      <h3>Hire setup</h3>
      <div class="form-grid two-col">
        <div class="field full">
          <label for="hireSetupType">What setup will be used?</label>
          <select id="hireSetupType">
            <option value="full">Full Waimarino Shears stand, electronics &amp; operation</option>
            <option value="electronics-only">Electronics &amp; operation on organiser-supplied shearing stand</option>
          </select>
          <p class="help-text">The standard NZ$750 + GST hire fee applies to both options. Waimarino Shears still transports, installs, tests, operates and packs down the timing electronics.</p>
        </div>
      </div>
      <div id="competitionBrandingWrap">
        <hr style="border:0;border-top:1px solid var(--line,#ddd);margin:18px 0">
        <h4 style="margin-bottom:6px">Optional competition stand branding</h4>
        <p class="help-text">Available when the Waimarino Shears stand is supplied. This is for your competition or event logo/name only. <strong>Sponsor branding is not included.</strong></p>
        <div class="form-grid two-col">
          <div class="field">
            <label for="competitionBranding">Would you like custom competition branding panels?</label>
            <select id="competitionBranding">
              <option value="no">No</option>
              <option value="yes">Yes — arrange competition branding</option>
            </select>
          </div>
          <div id="brandingAfterEventWrap" class="field hidden">
            <label for="brandingAfterEvent">What should happen to the panels after the event?</label>
            <select id="brandingAfterEvent">
              <option value="">Select an option</option>
              <option value="store">Leave with Waimarino Shears for storage and future hires</option>
              <option value="return">Return to organiser after the competition</option>
            </select>
          </div>
        </div>
        <div id="brandingRequirements" class="important-note hidden" style="margin-top:12px">
          <strong>Additional one-off cost.</strong> The final branding price will be confirmed before anything is ordered. Print-ready competition artwork and branding payment must be received at least <strong>14 days before the competition</strong>. Send the artwork to <a href="mailto:${SUBMISSION_EMAIL}">${SUBMISSION_EMAIL}</a> and quote your Booking Reference. Once made, the panels can be reused for future hires.
        </div>
      </div>`;

    costBox.insertAdjacentElement('afterend', card);

    document.getElementById('hireSetupType')?.addEventListener('change', updateConditionalFields);
    document.getElementById('competitionBranding')?.addEventListener('change', updateConditionalFields);
  }

  function installStandCard() {
    const panel = document.querySelector('.step-panel[data-panel="3"]');
    const judgingCard = [...(panel?.querySelectorAll(':scope > .card') || [])]
      .find(card => card.querySelector('h3')?.textContent.trim() === 'Judging configuration');
    if (!panel || !judgingCard || document.getElementById('standConfigurationCard')) return;

    const card = document.createElement('section');
    card.id = 'standConfigurationCard';
    card.className = 'card';
    card.innerHTML = `
      <h3>Competition stands in use</h3>
      <div class="form-grid two-col">
        <div class="field">
          <label for="competitionStands">How many stands will be used for the competition?</label>
          <select id="competitionStands">
            <option value="2">2 stands</option>
            <option value="1">1 stand</option>
          </select>
        </div>
      </div>
      <p class="help-text">Two stands is the normal setup. One-stand operation is also available. This setting is passed into the timing-system booking import.</p>`;

    judgingCard.insertAdjacentElement('beforebegin', card);
  }

  function patchHireTerms() {
    const terms = document.querySelector('.terms-content');
    if (!terms || document.getElementById('hireConfigurationTermHeading')) return;

    const accommodationHeading = [...terms.querySelectorAll('h4')]
      .find(h => h.textContent.trim() === 'Accommodation');
    if (!accommodationHeading) return;

    const heading = document.createElement('h4');
    heading.id = 'hireConfigurationTermHeading';
    heading.textContent = 'Hire configuration and optional branding';

    const setup = document.createElement('p');
    setup.innerHTML = '<strong>Setup type and stand count:</strong> The standard hire fee applies whether the competition uses one or two stands and whether Waimarino Shears supplies the full stand or installs and operates its timing electronics on a suitable organiser-supplied shearing stand. Where the organiser supplies the stand, the organiser is responsible for ensuring it is safe, structurally sound, suitable for the competition and ready for installation. Waimarino Shears may decline or delay installation where the supplied stand or installation conditions are unsafe or unsuitable.';

    const branding = document.createElement('p');
    branding.innerHTML = '<strong>Optional competition stand branding:</strong> Where the Waimarino Shears stand is supplied, the organiser may request custom panels carrying the competition or event branding. Sponsor branding is not included. Branding is an additional one-off cost. The price will be confirmed before ordering, and suitable print-ready artwork and branding payment must be received at least 14 days before the competition. The organiser may take the panels after the event or leave them with Waimarino Shears for storage and reuse at future hires.';

    accommodationHeading.insertAdjacentElement('beforebegin', heading);
    heading.insertAdjacentElement('afterend', setup);
    setup.insertAdjacentElement('afterend', branding);
  }

  function updateConditionalFields() {
    const setup = document.getElementById('hireSetupType');
    const branding = document.getElementById('competitionBranding');
    const brandingWrap = document.getElementById('competitionBrandingWrap');
    const afterWrap = document.getElementById('brandingAfterEventWrap');
    const requirements = document.getElementById('brandingRequirements');
    const after = document.getElementById('brandingAfterEvent');
    const fullSetup = (setup?.value || 'full') === 'full';

    brandingWrap?.classList.toggle('hidden', !fullSetup);
    if (!fullSetup && branding) {
      branding.value = 'no';
      if (after) after.value = '';
    }

    const brandingSelected = fullSetup && branding?.value === 'yes';
    afterWrap?.classList.toggle('hidden', !brandingSelected);
    requirements?.classList.toggle('hidden', !brandingSelected);
    if (!brandingSelected && after) after.value = '';
    syncHireState();
  }

  function syncHireState() {
    if (typeof state === 'undefined') return;
    ensureHireState();

    const setup = document.getElementById('hireSetupType');
    const branding = document.getElementById('competitionBranding');
    const after = document.getElementById('brandingAfterEvent');
    const stands = document.getElementById('competitionStands');

    if (setup) state.hire.setupType = normaliseSetupType(setup.value);
    if (branding) state.hire.competitionBranding = state.hire.setupType === 'full' && branding.value === 'yes';
    if (after) state.hire.brandingAfterEvent = state.hire.competitionBranding
      ? normaliseBrandingAfterEvent(after.value)
      : '';
    if (stands) state.competitionSetup.stands = normaliseStands(stands.value);
  }

  function applyHireStateToForm() {
    ensureHireState();
    const setup = document.getElementById('hireSetupType');
    const branding = document.getElementById('competitionBranding');
    const after = document.getElementById('brandingAfterEvent');
    const stands = document.getElementById('competitionStands');

    if (setup) setup.value = normaliseSetupType(state.hire.setupType);
    if (branding) branding.value = state.hire.competitionBranding ? 'yes' : 'no';
    if (after) after.value = normaliseBrandingAfterEvent(state.hire.brandingAfterEvent);
    if (stands) stands.value = String(normaliseStands(state.competitionSetup.stands));
    updateConditionalFields();
  }

  function brandingDeadlineIsPossible() {
    if (!state.hire?.competitionBranding || !state.booking?.competitionDate) return true;
    const event = new Date(`${state.booking.competitionDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(event.getTime())) return true;
    return (event.getTime() - today.getTime()) >= 14 * 24 * 60 * 60 * 1000;
  }

  function hireReviewHtml() {
    const branding = state.hire?.competitionBranding === true;
    const standCount = normaliseStands(state.competitionSetup?.stands);
    const rows = [
      reviewItem('Setup type', setupTypeLabel(state.hire?.setupType)),
      reviewItem('Competition stands in use', `${standCount} stand${standCount === 1 ? '' : 's'}`),
      reviewItem('Competition stand branding', branding ? 'Yes — competition/event branding only' : 'No')
    ];
    if (branding) {
      rows.push(reviewItem('Branding after event', brandingAfterEventLabel(state.hire?.brandingAfterEvent)));
      rows.push(reviewItem('Branding cost', 'Additional one-off charge — price confirmed before ordering'));
      rows.push(reviewItem('Artwork & payment deadline', 'At least 14 days before the competition'));
    }
    return `<section id="hireConfigurationReview" class="review-section"><h3>Hire configuration</h3><div class="review-list">${rows.join('')}</div></section>`;
  }

  function installFunctionWrappers() {
    if (typeof syncStateFromForm === 'function' && !syncStateFromForm.__hireOptionsWrapped) {
      const original = syncStateFromForm;
      const wrapped = function hireAwareSyncStateFromForm() {
        original();
        syncHireState();
      };
      wrapped.__hireOptionsWrapped = true;
      syncStateFromForm = wrapped;
    }

    if (typeof buildPackage === 'function' && !buildPackage.__hireOptionsWrapped) {
      const original = buildPackage;
      const wrapped = function hireAwareBuildPackage(submitted = false) {
        syncHireState();
        const pack = original(submitted);
        pack.hire = {
          setupType: normaliseSetupType(state.hire?.setupType),
          competitionBranding: state.hire?.competitionBranding === true,
          brandingAfterEvent: state.hire?.competitionBranding
            ? normaliseBrandingAfterEvent(state.hire?.brandingAfterEvent)
            : ''
        };
        pack.competitionSetup = pack.competitionSetup || {};
        pack.competitionSetup.stands = normaliseStands(state.competitionSetup?.stands);
        return pack;
      };
      wrapped.__hireOptionsWrapped = true;
      buildPackage = wrapped;
    }

    if (typeof validateForReview === 'function' && !validateForReview.__hireOptionsWrapped) {
      const original = validateForReview;
      const wrapped = function hireAwareValidateForReview() {
        syncHireState();
        const warnings = original();
        if (!['full', 'electronics-only'].includes(state.hire?.setupType)) {
          warnings.push('Hire setup type is missing.');
        }
        if (![1, 2].includes(Number(state.competitionSetup?.stands))) {
          warnings.push('Competition stands in use must be 1 or 2.');
        }
        if (state.hire?.competitionBranding) {
          if (state.hire.setupType !== 'full') {
            warnings.push('Competition stand branding is only available when the Waimarino Shears stand is supplied.');
          }
          if (!state.hire.brandingAfterEvent) {
            warnings.push('Choose what should happen to the competition branding panels after the event.');
          }
          if (!brandingDeadlineIsPossible()) {
            warnings.push('Competition branding requires at least 14 days before the competition for artwork, payment and production.');
          }
        }
        return [...new Set(warnings)];
      };
      wrapped.__hireOptionsWrapped = true;
      validateForReview = wrapped;
    }

    if (typeof buildReview === 'function' && !buildReview.__hireOptionsWrapped) {
      const original = buildReview;
      const wrapped = function hireAwareBuildReview() {
        syncHireState();
        original();
        document.getElementById('hireConfigurationReview')?.remove();
        const bookingSection = [...document.querySelectorAll('#reviewContent .review-section')]
          .find(section => section.querySelector('h3')?.textContent.trim() === 'Booking');
        if (bookingSection) bookingSection.insertAdjacentHTML('afterend', hireReviewHtml());
      };
      wrapped.__hireOptionsWrapped = true;
      buildReview = wrapped;
    }

    if (typeof applyStateToForm === 'function' && !applyStateToForm.__hireOptionsWrapped) {
      const original = applyStateToForm;
      const wrapped = function hireAwareApplyStateToForm() {
        original();
        applyHireStateToForm();
      };
      wrapped.__hireOptionsWrapped = true;
      applyStateToForm = wrapped;
    }

    if (typeof loadPackage === 'function' && !loadPackage.__hireOptionsWrapped) {
      const original = loadPackage;
      const wrapped = function hireAwareLoadPackage(pack, notify = true) {
        const result = original(pack, notify);
        state.hire = { ...(state.hire || {}), ...(pack?.hire || {}) };
        state.competitionSetup = state.competitionSetup || {};
        state.competitionSetup.stands = normaliseStands(pack?.competitionSetup?.stands);
        ensureHireState();
        applyHireStateToForm();
        return result;
      };
      wrapped.__hireOptionsWrapped = true;
      loadPackage = wrapped;
    }

    if (typeof buildHumanPackHtml === 'function' && !buildHumanPackHtml.__hireOptionsWrapped) {
      const original = buildHumanPackHtml;
      const wrapped = function hireAwareHumanPackHtml() {
        syncHireState();
        let html = original();
        const stands = normaliseStands(state.competitionSetup?.stands);
        const setupSummary = state.hire?.setupType === 'electronics-only'
          ? `Selected setup: Waimarino Shears timing electronics and operation on an organiser-supplied shearing stand, using ${stands} competition stand${stands === 1 ? '' : 's'}. The standard hire fee applies.`
          : `Selected setup: Waimarino Shears full stand, electronics and operation, using ${stands} competition stand${stands === 1 ? '' : 's'}. The standard hire fee applies.`;
        const brandingSummary = state.hire?.competitionBranding
          ? ' Optional competition/event branding panels have been requested. Sponsor branding is not included. This is an additional one-off cost; artwork and payment are required at least 14 days before the competition.'
          : '';
        html = html.replace(
          /<p>Standard hire includes the two-stand speed shear stand,[\s\S]*?<\/p><p>Competition entry forms can be provided if required\./,
          `<p>${setupSummary}${brandingSummary}</p><p>Competition entry forms can be provided if required.`
        );
        return html;
      };
      wrapped.__hireOptionsWrapped = true;
      buildHumanPackHtml = wrapped;
    }
  }

  function initialise() {
    restoreSavedHireState();
    patchHireInformation();
    installHireSetupCard();
    installStandCard();
    patchHireTerms();
    installFunctionWrappers();
    applyHireStateToForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
