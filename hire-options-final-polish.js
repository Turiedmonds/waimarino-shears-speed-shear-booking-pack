(() => {
  if (window.__waimarinoHireOptionsFinalPolishVersion) return;
  window.__waimarinoHireOptionsFinalPolishVersion = '1.0.1';

  function normaliseStands(value) {
    return Number(value) === 1 ? 1 : 2;
  }

  function setupTypeLabel(value) {
    return value === 'electronics-only'
      ? 'Electronics & operation on organiser-supplied shearing stand'
      : 'Full Waimarino Shears stand, electronics & operation';
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

    const brandingWrap = document.getElementById('competitionBrandingWrap');
    if (brandingWrap) {
      document.getElementById('brandingAfterEventWrap')?.remove();

      const brandingSelect = document.getElementById('competitionBranding');
      const yesOption = brandingSelect?.querySelector('option[value="yes"]');
      if (yesOption) yesOption.textContent = 'Yes';

      if (!document.getElementById('brandingAdditionalCostNote')) {
        const note = document.createElement('p');
        note.id = 'brandingAdditionalCostNote';
        note.className = 'help-text';
        note.innerHTML = '<strong>Custom competition branding panels have an additional one-off cost.</strong>';
        const formGrid = brandingWrap.querySelector('.form-grid');
        formGrid?.insertAdjacentElement('beforebegin', note);
      }

      const requirements = document.getElementById('brandingRequirements');
      if (requirements) {
        requirements.innerHTML = 'The final branding price will be confirmed before anything is ordered. Your competition branding and branding payment must be received at least <strong>14 days before the competition</strong>. Send your competition branding to <a href="mailto:Waimarinoshears@gmail.com">Waimarinoshears@gmail.com</a> and quote your Booking Reference.';
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
        brandingTerm.innerHTML = '<strong>Optional competition stand branding:</strong> Where the Waimarino Shears stand is supplied, the organiser may request custom panels carrying the competition or event branding. Sponsor branding is not included. Branding is an additional one-off cost. The price will be confirmed before ordering, and the competition branding and branding payment must be received at least 14 days before the competition.';
      }
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

  function wrapFunctions() {
    if (typeof syncStateFromForm === 'function' && !syncStateFromForm.__finalHirePolishWrapped) {
      const original = syncStateFromForm;
      const wrapped = function finalHirePolishSyncStateFromForm() {
        original();
        if (state?.hire) delete state.hire.brandingAfterEvent;
      };
      wrapped.__finalHirePolishWrapped = true;
      syncStateFromForm = wrapped;
    }

    if (typeof buildPackage === 'function' && !buildPackage.__finalHirePolishWrapped) {
      const original = buildPackage;
      const wrapped = function finalHirePolishBuildPackage(submitted = false) {
        const pack = original(submitted);
        if (pack?.hire) delete pack.hire.brandingAfterEvent;
        if (typeof state !== 'undefined' && state?.hire) delete state.hire.brandingAfterEvent;
        return pack;
      };
      wrapped.__finalHirePolishWrapped = true;
      buildPackage = wrapped;
    }

    if (typeof validateForReview === 'function' && !validateForReview.__finalHirePolishWrapped) {
      const original = validateForReview;
      const wrapped = function finalHirePolishValidateForReview() {
        const warnings = original();
        return warnings
          .filter(warning => warning !== 'Choose what should happen to the competition branding panels after the event.')
          .map(warning => warning === 'Competition branding requires at least 14 days before the competition for artwork, payment and production.'
            ? 'Competition branding requires at least 14 days before the competition for branding and payment.'
            : warning);
      };
      wrapped.__finalHirePolishWrapped = true;
      validateForReview = wrapped;
    }

    if (typeof buildReview === 'function' && !buildReview.__finalHirePolishWrapped) {
      const original = buildReview;
      const wrapped = function finalHirePolishBuildReview() {
        original();
        const section = document.getElementById('hireConfigurationReview');
        if (!section || typeof reviewItem !== 'function') return;

        const branding = state?.hire?.competitionBranding === true;
        const stands = normaliseStands(state?.competitionSetup?.stands);
        const rows = [
          reviewItem('Setup type', setupTypeLabel(state?.hire?.setupType)),
          reviewItem('Competition stands in use', `${stands} stand${stands === 1 ? '' : 's'}`),
          reviewItem('Competition stand branding', branding ? 'Yes — competition/event branding only' : 'No')
        ];
        if (branding) {
          rows.push(reviewItem('Branding cost', 'Additional one-off charge — price confirmed before ordering'));
          rows.push(reviewItem('Branding & payment deadline', 'At least 14 days before the competition'));
        }
        section.innerHTML = `<h3>Hire configuration</h3><div class="review-list">${rows.join('')}</div>`;
      };
      wrapped.__finalHirePolishWrapped = true;
      buildReview = wrapped;
    }

    if (typeof buildHumanPackHtml === 'function' && !buildHumanPackHtml.__finalHirePolishWrapped) {
      const original = buildHumanPackHtml;
      const wrapped = function finalHirePolishHumanPackHtml() {
        return original()
          .replace('artwork and payment are required at least 14 days before the competition', 'competition branding and payment are required at least 14 days before the competition');
      };
      wrapped.__finalHirePolishWrapped = true;
      buildHumanPackHtml = wrapped;
    }

    if (typeof loadPackage === 'function' && !loadPackage.__finalHirePolishWrapped) {
      const original = loadPackage;
      const wrapped = function finalHirePolishLoadPackage(pack, notify = true) {
        const result = original(pack, notify);
        if (state?.hire) delete state.hire.brandingAfterEvent;
        return result;
      };
      wrapped.__finalHirePolishWrapped = true;
      loadPackage = wrapped;
    }
  }

  function initialise() {
    patchHireCopy();
    patchAndReorderTerms();
    wrapFunctions();
    if (typeof state !== 'undefined' && state?.hire) delete state.hire.brandingAfterEvent;

    // The existing terms tidy script adds the health/safety and animal-welfare
    // clauses independently. Re-run the ordering after those clauses have had
    // time to be inserted so the final customer-facing order stays grouped.
    window.setTimeout(patchAndReorderTerms, 250);
    window.setTimeout(patchAndReorderTerms, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();