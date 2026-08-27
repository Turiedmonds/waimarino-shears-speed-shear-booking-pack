(() => {
  if (window.__waimarinoHireOptionsFinalPolishVersion) return;
  window.__waimarinoHireOptionsFinalPolishVersion = '1.0.3';

  const FINAL_TERMS_VERSION = '22 August 2026';
  const FINAL_APP_VERSION = '1.5.1';

  function normaliseStands(value) {
    return Number(value) === 1 ? 1 : 2;
  }

  function setupTypeLabel(value) {
    if (value === 'electronics-only') return 'Electronics & operation on organiser-supplied shearing stand';
    if (value === 'full') return 'Full Waimarino Shears stand, electronics & operation';
    return '—';
  }

  function draftHireField(name) {
    try {
      const key = typeof STORAGE_KEY === 'undefined'
        ? 'waimarinoSpeedShearBookingPackDraftV1'
        : STORAGE_KEY;
      const raw = localStorage.getItem(key);
      const saved = raw ? JSON.parse(raw) : null;
      if (saved?.appVersion !== FINAL_APP_VERSION) return undefined;
      if (saved?.hire && Object.prototype.hasOwnProperty.call(saved.hire, name)) {
        return saved.hire[name];
      }
    } catch (_) {}
    return undefined;
  }

  function ensurePlaceholder(select, text = 'Select an option') {
    if (!select || select.querySelector('option[value=""]')) return;
    const option = document.createElement('option');
    option.value = '';
    option.textContent = text;
    select.insertAdjacentElement('afterbegin', option);
  }

  function initialiseRequiredSelections() {
    const setupSelect = document.getElementById('hireSetupType');
    const brandingSelect = document.getElementById('competitionBranding');

    ensurePlaceholder(setupSelect);
    ensurePlaceholder(brandingSelect);

    const savedSetup = draftHireField('setupType');
    if (!['full', 'electronics-only'].includes(savedSetup) && setupSelect) {
      setupSelect.value = '';
    }

    const savedBranding = draftHireField('competitionBranding');
    if (typeof savedBranding !== 'boolean' && brandingSelect) {
      brandingSelect.value = '';
    }

    setupSelect?.addEventListener('change', () => {
      if (setupSelect.value === 'full' && brandingSelect) {
        brandingSelect.value = '';
      }
    });
  }

  function patchHireCopy() {
    const hirePanel = document.querySelector('.step-panel[data-panel="1"]');
    const provideCard = [...(hirePanel?.querySelectorAll('.card') || [])]
      .find(card => card.querySelector('h3')?.textContent.trim() === 'What we provide');

    const firstProvideItem = provideCard?.querySelector('ul li');
    if (firstProvideItem) {
      firstProvideItem.innerHTML = '<strong>Standard full setup:</strong> our speed shear stand, configured for one or two competition stands as selected';
    }

    const provideNote = provideCard?.querySelector('ul + .note');
    if (provideNote) {
      provideNote.innerHTML = '<strong>The standard NZ$750 + GST hire fee applies to all setup types and stand counts.</strong>';
    }

    const spaceCard = [...(hirePanel?.querySelectorAll('.card') || [])]
      .find(card => card.querySelector('h3')?.textContent.trim() === 'Space required');
    const spaceParagraphs = [...(spaceCard?.querySelectorAll(':scope > p') || [])]
      .filter(p => !p.classList.contains('big-measure'));
    if (spaceParagraphs[0]) {
      spaceParagraphs[0].textContent = spaceParagraphs[0].textContent.replace('our modular stand', 'our stand');
    }

    const setupSelect = document.getElementById('hireSetupType');
    const setupHelp = setupSelect?.closest('.field')?.querySelector('.help-text');
    if (setupHelp) {
      setupHelp.textContent = 'The standard NZ$750 + GST hire fee applies to both options.';
    }

    const brandingWrap = document.getElementById('competitionBrandingWrap');
    if (brandingWrap) {
      document.getElementById('brandingAfterEventWrap')?.remove();

      const brandingHelp = brandingWrap.querySelector('h4 + .help-text');
      if (brandingHelp) {
        brandingHelp.innerHTML = 'Available when the Waimarino Shears stand is supplied. This is for your competition or event logo/name only. <strong>Separate sponsor branding panels are not included.</strong>';
      }

      const brandingSelect = document.getElementById('competitionBranding');
      const yesOption = brandingSelect?.querySelector('option[value="yes"]');
      if (yesOption) yesOption.textContent = 'Yes';

      let note = document.getElementById('brandingAdditionalCostNote');
      if (!note) {
        note = document.createElement('p');
        note.id = 'brandingAdditionalCostNote';
        note.className = 'help-text';
        const formGrid = brandingWrap.querySelector('.form-grid');
        formGrid?.insertAdjacentElement('beforebegin', note);
      }
      if (note) {
        note.innerHTML = '<strong>Custom competition branding panels have an additional one-off cost, charged at the supplier\'s actual cost, including GST where applicable, with no markup by Waimarino Shears.</strong>';
      }

      const requirements = document.getElementById('brandingRequirements');
      if (requirements) {
        requirements.innerHTML = 'Waimarino Shears arranges the panels on the organiser\'s behalf. The final supplier cost will be confirmed before anything is ordered, and a copy of the supplier invoice or other evidence of the actual supplier cost will be provided. The branding cost will be added as a separate amount to the deposit invoice and must be paid before the panels are ordered. Your competition branding and branding payment must be received at least <strong>14 days before the competition</strong>. Once paid for, the panels are the property of the organiser. Send your competition branding to <a href="mailto:Waimarinoshears@gmail.com">Waimarinoshears@gmail.com</a> and quote your Booking Reference.';
      }
    }

    const standHelp = document.querySelector('#standConfigurationCard .help-text');
    if (standHelp) {
      standHelp.textContent = 'Two stands is the normal setup. One-stand operation is also available.';
    }
  }

  function patchAndReorderTerms() {
    const terms = document.querySelector('.terms-content');
    if (!terms) return;

    const hireHeading = document.getElementById('hireConfigurationTermHeading');
    if (hireHeading) {
      const setupTerm = hireHeading.nextElementSibling;
      const brandingTerm = setupTerm?.nextElementSibling;
      if (brandingTerm && brandingTerm.tagName === 'P') {
        brandingTerm.innerHTML = '<strong>Optional competition stand branding:</strong> When the Waimarino Shears stand is supplied, the organiser may request custom panels carrying the competition or event branding. Separate sponsor branding panels are not included. The panels are charged at the supplier\'s actual cost, with no markup by Waimarino Shears. The organiser will be given a copy of the supplier invoice, or other evidence of the actual supplier cost, and the amount charged will include GST where applicable. The branding cost will be added as a separate amount to the deposit invoice and must be paid before the panels are ordered. Final competition branding and payment must be received at least 14 days before the competition. Once the branding cost has been paid, the panels are the property of the organiser.';
      }
    }

    const cancellationHeading = [...terms.querySelectorAll('h4')]
      .find(heading => heading.textContent.trim() === 'Cancellation');
    const postponementHeading = [...terms.querySelectorAll('h4')]
      .find(heading => heading.textContent.trim() === 'Postponement');
    if (cancellationHeading && postponementHeading) {
      let brandingCancellation = document.getElementById('brandingCancellationTerm');
      if (!brandingCancellation) {
        brandingCancellation = document.createElement('p');
        brandingCancellation.id = 'brandingCancellationTerm';
      }
      brandingCancellation.innerHTML = '<strong>Competition branding:</strong> Once custom competition branding panels have been ordered, the branding cost is not refundable if the organiser later cancels the event because the panels are produced specifically for that competition. The panels remain the property of the organiser and any completed panels will be made available to them.';
      postponementHeading.insertAdjacentElement('beforebegin', brandingCancellation);
    }

    const blocks = [];
    let current = null;
    [...terms.children].forEach(node => {
      if (node.tagName === 'H4') {
        current = { heading: node.textContent.trim(), nodes: [node] };
        blocks.push(current);
      } else if (current) {
        current.nodes.push(node);
      } else {
        blocks.push({ heading: '', nodes: [node] });
      }
    });

    const preferredOrder = [
      'Hire fee and payment',
      'Accommodation',
      'Hire configuration and optional branding',
      'Equipment and operating conditions',
      'Health, safety and access',
      'Animal welfare',
      'Competition operation',
      'Cancellation',
      'Postponement',
      'Privacy and use of information'
    ];

    const ordered = [];
    const used = new Set();
    preferredOrder.forEach(name => {
      blocks.forEach((block, index) => {
        if (!used.has(index) && block.heading === name) {
          ordered.push(block);
          used.add(index);
        }
      });
    });
    blocks.forEach((block, index) => {
      if (!used.has(index)) ordered.push(block);
    });

    const fragment = document.createDocumentFragment();
    ordered.forEach(block => block.nodes.forEach(node => fragment.appendChild(node)));
    terms.appendChild(fragment);
  }

  function enforceCurrentTermsAcceptance(sourceVersion = null) {
    if (typeof state === 'undefined' || !state?.booking) return;
    const previousVersion = sourceVersion || state.booking.termsVersion;
    if (previousVersion && previousVersion !== FINAL_TERMS_VERSION) {
      state.booking.termsAccepted = false;
      state.booking.acceptedBy = '';
      state.booking.acceptedAt = null;
      const checkbox = document.getElementById('termsAccepted');
      if (checkbox) checkbox.checked = false;
      const acceptedBy = document.getElementById('acceptedByDisplay');
      const acceptedAt = document.getElementById('acceptedAtDisplay');
      if (acceptedBy) acceptedBy.textContent = '—';
      if (acceptedAt) acceptedAt.textContent = '—';
    }
    state.booking.termsVersion = FINAL_TERMS_VERSION;
  }

  function updateTermsVersionDisplay() {
    enforceCurrentTermsAcceptance();
    document.querySelectorAll('#reviewContent .review-item').forEach(item => {
      if (item.querySelector('span')?.textContent.trim() === 'Terms version') {
        const strong = item.querySelector('strong');
        if (strong) strong.textContent = FINAL_TERMS_VERSION;
      }
    });
  }

  function wrapFunctions() {
    if (typeof syncStateFromForm === 'function' && !syncStateFromForm.__finalHirePolishWrappedV2) {
      const original = syncStateFromForm;
      const wrapped = function finalHirePolishSyncStateFromForm() {
        original();
        if (state?.hire) delete state.hire.brandingAfterEvent;
        if (state?.booking) state.booking.termsVersion = FINAL_TERMS_VERSION;
      };
      wrapped.__finalHirePolishWrappedV2 = true;
      syncStateFromForm = wrapped;
    }

    if (typeof buildPackage === 'function' && !buildPackage.__finalHirePolishWrappedV2) {
      const original = buildPackage;
      const wrapped = function finalHirePolishBuildPackage(submitted = false) {
        const pack = original(submitted);
        const setupValue = document.getElementById('hireSetupType')?.value || '';
        const brandingValue = document.getElementById('competitionBranding')?.value || '';

        pack.appVersion = FINAL_APP_VERSION;
        pack.booking = { ...(pack.booking || {}), termsVersion: FINAL_TERMS_VERSION };
        pack.hire = pack.hire || {};
        pack.hire.setupType = setupValue;
        pack.hire.competitionBranding = setupValue === 'full'
          ? (brandingValue === 'yes' ? true : brandingValue === 'no' ? false : null)
          : false;
        delete pack.hire.brandingAfterEvent;

        if (typeof state !== 'undefined') {
          if (state.booking) state.booking.termsVersion = FINAL_TERMS_VERSION;
          if (state.hire) delete state.hire.brandingAfterEvent;
        }
        return pack;
      };
      wrapped.__finalHirePolishWrappedV2 = true;
      buildPackage = wrapped;
    }

    if (typeof validateForReview === 'function' && !validateForReview.__finalHirePolishWrappedV2) {
      const original = validateForReview;
      const wrapped = function finalHirePolishValidateForReview() {
        const warnings = original()
          .filter(warning => warning !== 'Choose what should happen to the competition branding panels after the event.')
          .map(warning => warning === 'Competition branding requires at least 14 days before the competition for artwork, payment and production.'
            ? 'Competition branding requires at least 14 days before the competition for branding and payment.'
            : warning);

        const setupValue = document.getElementById('hireSetupType')?.value || '';
        const brandingValue = document.getElementById('competitionBranding')?.value || '';
        if (!setupValue) warnings.push('Choose what hire setup will be used.');
        if (setupValue === 'full' && !brandingValue) {
          warnings.push('Choose Yes or No for competition stand branding.');
        }
        return [...new Set(warnings)];
      };
      wrapped.__finalHirePolishWrappedV2 = true;
      validateForReview = wrapped;
    }

    if (typeof buildReview === 'function' && !buildReview.__finalHirePolishWrappedV2) {
      const original = buildReview;
      const wrapped = function finalHirePolishBuildReview() {
        original();
        updateTermsVersionDisplay();

        const section = document.getElementById('hireConfigurationReview');
        if (!section || typeof reviewItem !== 'function') return;

        const setupSelect = document.getElementById('hireSetupType');
        const setupValue = setupSelect ? setupSelect.value : (state?.hire?.setupType || '');
        const brandingValue = document.getElementById('competitionBranding')?.value || '';
        const branding = setupValue === 'full'
          ? (brandingValue === 'yes' || (brandingValue !== 'no' && state?.hire?.competitionBranding === true))
          : false;
        const stands = normaliseStands(state?.competitionSetup?.stands);
        const rows = [
          reviewItem('Setup type', setupTypeLabel(setupValue)),
          reviewItem('Competition stands in use', `${stands} stand${stands === 1 ? '' : 's'}`),
          reviewItem('Competition stand branding', branding ? 'Yes — competition/event branding only' : 'No')
        ];
        if (branding) {
          rows.push(reviewItem('Branding cost', 'Supplier actual cost, including GST where applicable, with no markup by Waimarino Shears'));
          rows.push(reviewItem('Branding cost evidence', 'Supplier invoice or other evidence of the actual supplier cost will be provided'));
          rows.push(reviewItem('Branding payment', 'Added as a separate amount to the deposit invoice and payable before ordering'));
          rows.push(reviewItem('Branding ownership', 'Once paid for, the panels are the property of the organiser'));
          rows.push(reviewItem('Branding & payment deadline', 'At least 14 days before the competition'));
        }
        section.innerHTML = `<h3>Hire configuration</h3><div class="review-list">${rows.join('')}</div>`;
      };
      wrapped.__finalHirePolishWrappedV2 = true;
      buildReview = wrapped;
    }

    if (typeof buildHumanPackHtml === 'function' && !buildHumanPackHtml.__finalHirePolishWrappedV2) {
      const original = buildHumanPackHtml;
      const wrapped = function finalHirePolishHumanPackHtml() {
        if (typeof state !== 'undefined' && state?.booking) {
          state.booking.termsVersion = FINAL_TERMS_VERSION;
        }
        return original()
          .replaceAll('19 August 2026', FINAL_TERMS_VERSION)
          .replaceAll('21 August 2026', FINAL_TERMS_VERSION)
          .replace('Sponsor branding is not included.', 'Separate sponsor branding panels are not included.')
          .replace('This is an additional one-off cost; competition branding and payment are required at least 14 days before the competition.',
            'The panels are charged at the supplier\'s actual cost, including GST where applicable, with no markup by Waimarino Shears. Supplier cost evidence will be provided. The branding cost is added as a separate amount to the deposit invoice and must be paid before ordering. Once paid for, the panels are the property of the organiser. Competition branding and payment are required at least 14 days before the competition.');
      };
      wrapped.__finalHirePolishWrappedV2 = true;
      buildHumanPackHtml = wrapped;
    }

    if (typeof loadPackage === 'function' && !loadPackage.__finalHirePolishWrappedV2) {
      const original = loadPackage;
      const wrapped = function finalHirePolishLoadPackage(pack, notify = true) {
        const sourceTermsVersion = pack?.booking?.termsVersion || null;
        const result = original(pack, notify);
        if (state?.hire) delete state.hire.brandingAfterEvent;
        enforceCurrentTermsAcceptance(sourceTermsVersion);

        const setupSelect = document.getElementById('hireSetupType');
        const brandingSelect = document.getElementById('competitionBranding');
        ensurePlaceholder(setupSelect);
        ensurePlaceholder(brandingSelect);

        if (setupSelect) {
          setupSelect.value = ['full', 'electronics-only'].includes(pack?.hire?.setupType)
            ? pack.hire.setupType
            : '';
        }
        if (brandingSelect) {
          brandingSelect.value = typeof pack?.hire?.competitionBranding === 'boolean'
            ? (pack.hire.competitionBranding ? 'yes' : 'no')
            : '';
        }
        return result;
      };
      wrapped.__finalHirePolishWrappedV2 = true;
      loadPackage = wrapped;
    }
  }

  function initialise() {
    patchHireCopy();
    initialiseRequiredSelections();
    patchAndReorderTerms();
    wrapFunctions();
    if (typeof state !== 'undefined') {
      if (state?.hire) delete state.hire.brandingAfterEvent;
      enforceCurrentTermsAcceptance();
    }

    window.setTimeout(patchAndReorderTerms, 250);
    window.setTimeout(patchAndReorderTerms, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
