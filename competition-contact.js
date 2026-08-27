(() => {
  if (window.__waimarinoCompetitionContactVersion) return;
  window.__waimarinoCompetitionContactVersion = '1.0.0';

  const TERMS_VERSION = '28 August 2026';

  const clean = value => String(value == null ? '' : value).trim();

  function getControls() {
    return {
      useBooking: document.getElementById('useBookingContactForCompetitors'),
      alternateWrap: document.getElementById('alternateCompetitionContact'),
      name: document.getElementById('competitionContactName'),
      phone: document.getElementById('competitionContactPhone'),
      email: document.getElementById('competitionContactEmail'),
      preview: document.getElementById('bookingContactPreview')
    };
  }

  function existingContactState() {
    const existing = typeof state !== 'undefined' && state.entries && state.entries.competitorContact;
    return existing && typeof existing === 'object' ? existing : {};
  }

  function ensureContactState() {
    if (typeof state === 'undefined') return null;
    state.entries = state.entries || {};
    const existing = existingContactState();
    state.entries.competitorContact = {
      useBookingContact: existing.useBookingContact !== false,
      name: clean(existing.name),
      phone: clean(existing.phone),
      email: clean(existing.email),
      authorisedForCompetitorUse: state.booking?.termsAccepted === true,
      termsVersion: TERMS_VERSION
    };
    return state.entries.competitorContact;
  }

  function bookingContactFromForm() {
    return {
      name: clean(document.getElementById('contactPerson')?.value || state?.booking?.contactPerson),
      phone: clean(document.getElementById('phone')?.value || state?.booking?.phone),
      email: clean(document.getElementById('email')?.value || state?.booking?.email)
    };
  }

  function effectiveContact() {
    const controls = getControls();
    const saved = ensureContactState() || {};
    const useBookingContact = controls.useBooking ? controls.useBooking.checked : saved.useBookingContact !== false;
    const source = useBookingContact
      ? bookingContactFromForm()
      : {
          name: clean(controls.name?.value ?? saved.name),
          phone: clean(controls.phone?.value ?? saved.phone),
          email: clean(controls.email?.value ?? saved.email)
        };

    return {
      useBookingContact,
      name: source.name,
      phone: source.phone,
      email: source.email,
      authorisedForCompetitorUse: typeof state !== 'undefined' && state.booking?.termsAccepted === true,
      termsVersion: TERMS_VERSION
    };
  }

  function syncContactState() {
    if (typeof state === 'undefined') return;
    state.entries = state.entries || {};
    state.entries.competitorContact = effectiveContact();
    if (state.booking) state.booking.termsVersion = TERMS_VERSION;
  }

  function previewLine(label, value) {
    const text = clean(value) || '—';
    return `<div><span>${label}</span><strong>${escapeHtmlLocal(text)}</strong></div>`;
  }

  function escapeHtmlLocal(value) {
    return String(value == null ? '' : value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function refreshUiFromControls() {
    const controls = getControls();
    if (!controls.useBooking) return;
    const useBooking = controls.useBooking.checked;
    controls.alternateWrap?.classList.toggle('hidden', useBooking);
    if (controls.preview) {
      controls.preview.classList.toggle('hidden', !useBooking);
      const booking = bookingContactFromForm();
      controls.preview.innerHTML = [
        previewLine('Contact', booking.name),
        previewLine('Phone', booking.phone),
        previewLine('Email', booking.email)
      ].join('');
    }
    syncContactState();
  }

  function installContactUi() {
    if (document.getElementById('competitorContactBlock')) return true;
    const entriesCard = [...document.querySelectorAll('.step-panel[data-panel="2"] .card')]
      .find(card => card.querySelector('h3')?.textContent.trim() === 'Competition entries');
    if (!entriesCard) return false;

    const block = document.createElement('div');
    block.id = 'competitorContactBlock';
    block.className = 'competition-contact-block';
    block.innerHTML = `
      <div class="competition-contact-heading">
        <div>
          <h4>Competition contact for competitor enquiries</h4>
          <p>Competitors need a contact for questions about this competition, including entry fees, check-in and entry issues.</p>
        </div>
      </div>
      <label class="checkbox-line competition-contact-choice">
        <input id="useBookingContactForCompetitors" type="checkbox" checked>
        <span>Use the booking contact details above for competitor enquiries.</span>
      </label>
      <div id="bookingContactPreview" class="competition-contact-preview"></div>
      <div id="alternateCompetitionContact" class="form-grid two-col competition-contact-fields hidden">
        <div class="field full">
          <label for="competitionContactName">Competition contact name / role</label>
          <input id="competitionContactName" type="text" placeholder="e.g. Entries Coordinator or competition contact">
        </div>
        <div class="field">
          <label for="competitionContactPhone">Competition contact phone</label>
          <input id="competitionContactPhone" type="tel">
        </div>
        <div class="field">
          <label for="competitionContactEmail">Competition contact email</label>
          <input id="competitionContactEmail" type="email">
        </div>
        <p class="help-text full">Enter a contact name / role and at least one contact method — phone or email.</p>
      </div>
      <p class="competition-contact-authorisation"><strong>How these details are used:</strong> the selected contact details will be shown to competitors using the online entry form and included in automatic entry confirmation emails so competitors can contact the competition organiser. By accepting the Hire Terms &amp; Conditions, you confirm you are authorised to provide these details for that purpose.</p>`;

    entriesCard.appendChild(block);

    const controls = getControls();
    controls.useBooking?.addEventListener('change', refreshUiFromControls);
    [controls.name, controls.phone, controls.email].forEach(input => {
      input?.addEventListener('input', syncContactState);
      input?.addEventListener('change', syncContactState);
    });
    ['contactPerson', 'phone', 'email'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', refreshUiFromControls);
      document.getElementById(id)?.addEventListener('change', refreshUiFromControls);
    });
    document.getElementById('termsAccepted')?.addEventListener('change', syncContactState);

    return true;
  }

  function installAcceptanceNote() {
    const acceptance = document.querySelector('.acceptance-box');
    const checkboxLine = acceptance?.querySelector('.checkbox-line');
    if (!acceptance || !checkboxLine || document.getElementById('competitionContactAcceptanceNote')) return;
    const note = document.createElement('p');
    note.id = 'competitionContactAcceptanceNote';
    note.className = 'competition-contact-acceptance-note';
    note.innerHTML = '<strong>Competition contact authorisation:</strong> by accepting these terms, you confirm you are authorised to provide the competition contact details selected above and allow Waimarino Shears to use them on the public competitor entry form and in automatic competitor entry emails for this competition.';
    checkboxLine.insertAdjacentElement('afterend', note);
  }

  function applyStateToContactUi() {
    const controls = getControls();
    if (!controls.useBooking) return;
    const contact = ensureContactState() || {};
    controls.useBooking.checked = contact.useBookingContact !== false;
    if (controls.name) controls.name.value = clean(contact.name);
    if (controls.phone) controls.phone.value = clean(contact.phone);
    if (controls.email) controls.email.value = clean(contact.email);
    refreshUiFromControls();
  }

  function contactWarnings() {
    const contact = effectiveContact();
    const warnings = [];
    if (!contact.name) warnings.push('Competition contact name / role for competitor enquiries is missing.');
    if (!contact.phone && !contact.email) warnings.push('A competition contact phone number or email address is required for competitor enquiries.');
    return warnings;
  }

  function appendReviewContact() {
    const review = document.getElementById('reviewContent');
    if (!review) return;
    review.querySelector('#competitorContactReview')?.remove();
    const contact = effectiveContact();
    const section = document.createElement('section');
    section.id = 'competitorContactReview';
    section.className = 'review-section';
    section.innerHTML = `
      <h3>Competitor enquiries contact</h3>
      <div class="review-list">
        ${typeof reviewItem === 'function' ? reviewItem('Uses booking contact', contact.useBookingContact ? 'Yes' : 'No') : ''}
        ${typeof reviewItem === 'function' ? reviewItem('Contact name / role', contact.name || '—') : ''}
        ${typeof reviewItem === 'function' ? reviewItem('Phone', contact.phone || '—') : ''}
        ${typeof reviewItem === 'function' ? reviewItem('Email', contact.email || '—') : ''}
        ${typeof reviewItem === 'function' ? reviewItem('Authorised for competitor use', state?.booking?.termsAccepted ? 'Yes — through Hire Terms acceptance' : 'No') : ''}
      </div>`;

    const entrySection = [...review.querySelectorAll('.review-section')]
      .find(item => item.querySelector('h3')?.textContent.trim() === 'Entry arrangements');
    if (entrySection) entrySection.insertAdjacentElement('afterend', section);
    else review.appendChild(section);
  }

  function resetAcceptanceForUpdatedTerms() {
    if (typeof state === 'undefined' || !state.booking) return;
    const sourceVersion = clean(state.booking.termsVersion);
    if (sourceVersion && sourceVersion !== TERMS_VERSION && state.booking.termsAccepted) {
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
    state.booking.termsVersion = TERMS_VERSION;
  }

  function patchTermsContent() {
    if (typeof state !== 'undefined' && state.booking) state.booking.termsVersion = TERMS_VERSION;
    const terms = document.querySelector('.terms-content');
    if (!terms) return;
    if (!document.getElementById('competitionContactAuthorisationTerm')) {
      const paragraph = document.createElement('p');
      paragraph.id = 'competitionContactAuthorisationTerm';
      paragraph.innerHTML = '<strong>Competition contact details for competitor enquiries:</strong> The organiser must provide a competition contact name or role and at least one phone number or email address for competitor enquiries. The organiser may use the booking contact details or provide separate competition contact details. By accepting these terms, the organiser confirms that it is authorised to provide the selected contact details and authorises Waimarino Shears Incorporated to display them to competitors through the public online entry form and include them in automatic competitor entry emails for this competition. These details will be used for competition enquiries, entry administration, payment and check-in questions, and related event communication.';
      const privacy = document.getElementById('privacyDataUseTerm');
      if (privacy) privacy.insertAdjacentElement('afterend', paragraph);
      else terms.appendChild(paragraph);
    }
  }

  function patchTermsVersionReview() {
    document.querySelectorAll('#reviewContent .review-item').forEach(item => {
      if (item.querySelector('span')?.textContent.trim() === 'Terms version') {
        const value = item.querySelector('strong');
        if (value) value.textContent = TERMS_VERSION;
      }
    });
  }

  function monitorTerms() {
    const terms = document.querySelector('.terms-content');
    if (!terms || terms.__competitionContactObserved) return;
    terms.__competitionContactObserved = true;
    new MutationObserver(() => window.setTimeout(patchTermsContent, 0))
      .observe(terms, { childList: true, subtree: false });
  }

  function wrapFunctions() {
    if (typeof syncStateFromForm === 'function' && !syncStateFromForm.__competitionContactWrapped) {
      const original = syncStateFromForm;
      const wrapped = function competitionContactSyncStateFromForm(...args) {
        const result = original.apply(this, args);
        syncContactState();
        return result;
      };
      wrapped.__competitionContactWrapped = true;
      syncStateFromForm = wrapped;
    }

    if (typeof validateForReview === 'function' && !validateForReview.__competitionContactWrapped) {
      const original = validateForReview;
      const wrapped = function competitionContactValidateForReview(...args) {
        const warnings = original.apply(this, args) || [];
        contactWarnings().forEach(warning => { if (!warnings.includes(warning)) warnings.push(warning); });
        return warnings;
      };
      wrapped.__competitionContactWrapped = true;
      validateForReview = wrapped;
    }

    if (typeof buildPackage === 'function' && !buildPackage.__competitionContactWrapped) {
      const original = buildPackage;
      const wrapped = function competitionContactBuildPackage(...args) {
        syncContactState();
        const pack = original.apply(this, args);
        pack.entries = pack.entries || {};
        pack.entries.competitorContact = effectiveContact();
        pack.booking = pack.booking || {};
        pack.booking.termsVersion = TERMS_VERSION;
        return pack;
      };
      wrapped.__competitionContactWrapped = true;
      buildPackage = wrapped;
    }

    if (typeof buildReview === 'function' && !buildReview.__competitionContactWrapped) {
      const original = buildReview;
      const wrapped = function competitionContactBuildReview(...args) {
        const result = original.apply(this, args);
        appendReviewContact();
        patchTermsVersionReview();
        return result;
      };
      wrapped.__competitionContactWrapped = true;
      buildReview = wrapped;
    }

    if (typeof buildHumanPackHtml === 'function' && !buildHumanPackHtml.__competitionContactWrapped) {
      const original = buildHumanPackHtml;
      const wrapped = function competitionContactBuildHumanPackHtml(...args) {
        const html = original.apply(this, args);
        return String(html)
          .replaceAll('19 August 2026', TERMS_VERSION)
          .replaceAll('21 August 2026', TERMS_VERSION)
          .replaceAll('22 August 2026', TERMS_VERSION);
      };
      wrapped.__competitionContactWrapped = true;
      buildHumanPackHtml = wrapped;
    }

    if (typeof applyStateToForm === 'function' && !applyStateToForm.__competitionContactWrapped) {
      const original = applyStateToForm;
      const wrapped = function competitionContactApplyStateToForm(...args) {
        const result = original.apply(this, args);
        applyStateToContactUi();
        return result;
      };
      wrapped.__competitionContactWrapped = true;
      applyStateToForm = wrapped;
    }
  }

  function installStyles() {
    if (document.getElementById('competitionContactStyles')) return;
    const style = document.createElement('style');
    style.id = 'competitionContactStyles';
    style.textContent = `
      .competition-contact-block{margin-top:18px;padding-top:18px;border-top:1px solid var(--line,#ddd)}
      .competition-contact-heading h4{margin:0 0 5px;font-size:1.05rem}
      .competition-contact-heading p{margin:0;color:var(--muted,#666)}
      .competition-contact-choice{margin-top:14px;padding:12px 14px;border:1px solid var(--line,#ddd);border-radius:10px;background:var(--surface-soft,#fafafa)}
      .competition-contact-preview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:10px 0 0}
      .competition-contact-preview>div{padding:10px 11px;border:1px solid var(--line,#ddd);border-radius:9px;background:#fff}
      .competition-contact-preview span{display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted,#666);margin-bottom:3px}
      .competition-contact-preview strong{display:block;overflow-wrap:anywhere}
      .competition-contact-fields{margin-top:12px;padding:14px;border:1px solid var(--line,#ddd);border-radius:10px;background:var(--surface-soft,#fafafa)}
      .competition-contact-fields .field{margin-bottom:0}
      .competition-contact-authorisation,.competition-contact-acceptance-note{margin:12px 0 0;padding:11px 13px;border-left:4px solid var(--brand-2,#EB1D27);border-radius:8px;background:#fff7f7;color:#4c1519;line-height:1.45}
      .competition-contact-acceptance-note{font-size:.92rem;margin-bottom:12px}
      @media(max-width:720px){.competition-contact-preview{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function initialise() {
    resetAcceptanceForUpdatedTerms();
    ensureContactState();
    installStyles();
    if (!installContactUi()) {
      window.setTimeout(initialise, 80);
      return;
    }
    installAcceptanceNote();
    wrapFunctions();
    applyStateToContactUi();
    syncContactState();
    patchTermsContent();
    patchTermsVersionReview();
    monitorTerms();
    window.setTimeout(() => { patchTermsContent(); patchTermsVersionReview(); }, 500);
    window.setTimeout(() => { patchTermsContent(); patchTermsVersionReview(); }, 1500);
    window.setTimeout(() => { patchTermsContent(); patchTermsVersionReview(); }, 3300);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialise, { once: true });
  else initialise();
})();
