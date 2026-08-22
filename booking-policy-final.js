(() => {
  if (window.__waimarinoBookingPolicyFinalVersion) return;
  window.__waimarinoBookingPolicyFinalVersion = '1.0.0';

  const TERMS_VERSION = '22 August 2026';
  const APP_VERSION = '1.5.1';
  const TRAVEL_SHORT = 'Included for competitions up to 200 km by road, one way, from Raetihi. Beyond this distance, an additional travel charge may apply and will be quoted and agreed before the booking is confirmed.';

  function clearOldTermsAcceptance(sourceVersion) {
    if (typeof state === 'undefined' || !state?.booking) return;
    if (sourceVersion && sourceVersion !== TERMS_VERSION) {
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

  function syncPolicyState() {
    if (typeof state === 'undefined') return;
    if (state.booking) state.booking.termsVersion = TERMS_VERSION;
    state.commercial = state.commercial || {};
    state.commercial.travelIncluded = true;
    state.commercial.travelIncludedOneWayKm = 200;
    state.commercial.travelOrigin = 'Raetihi';
    state.commercial.additionalTravelChargeMayApplyBeyondIncludedDistance = true;
  }

  function patchIntroductionAndSpace() {
    const intro = document.querySelector('#hireIntroduction p strong');
    if (intro) intro.textContent = 'Tēnā koe';

    const spaceCard = [...document.querySelectorAll('.step-panel[data-panel="1"] .card')]
      .find(card => card.querySelector('h3')?.textContent.trim() === 'Space required');
    if (spaceCard) {
      [...spaceCard.querySelectorAll(':scope > p')].forEach(paragraph => {
        paragraph.textContent = paragraph.textContent
          .replace('Additional room is required', 'Additional space is required')
          .replace('Additional room is always required', 'Additional space is always required');
      });
    }
  }

  function patchTravelSummary() {
    const travelRow = [...document.querySelectorAll('.cost-box dl div')]
      .find(row => row.querySelector('dt')?.textContent.trim() === 'Travel');
    if (travelRow?.querySelector('dd')) travelRow.querySelector('dd').textContent = TRAVEL_SHORT;

    document.querySelectorAll('#reviewContent .review-item').forEach(item => {
      if (item.querySelector('span')?.textContent.trim() === 'Travel') {
        const value = item.querySelector('strong');
        if (value) value.textContent = TRAVEL_SHORT;
      }
      if (item.querySelector('span')?.textContent.trim() === 'Terms version') {
        const value = item.querySelector('strong');
        if (value) value.textContent = TERMS_VERSION;
      }
    });
  }

  function rewriteTerms() {
    const terms = document.querySelector('.terms-content');
    if (!terms) return;

    terms.innerHTML = `
      <h4>Hire fee and payment</h4>
      <p>The standard hire fee is NZ$750 plus GST. Travel is included for competitions up to <strong>200 km by road, one way, from Raetihi</strong>. For competitions beyond this distance, an additional travel charge may apply. Any additional travel charge will be quoted and agreed with the organiser before the booking is confirmed.</p>
      <p>A NZ$300 deposit is due no later than 14 days before the event. The booking is confirmed once the deposit has been paid. The remaining balance is payable within 7 days after the event. Separate invoices will be issued for the deposit and remaining balance. If the deposit is not received by the due date after reminders, Waimarino Shears Incorporated may treat the booking as cancelled.</p>

      <h4>Accommodation</h4>
      <p>Accommodation is not included in the standard hire fee. Accommodation may be required because of travel, event timing or a day-before setup. If accommodation is required, Waimarino Shears Incorporated will arrange it and charge the organiser the actual accommodation cost in addition to the hire fee. The organiser will be advised of the cost before booking where possible.</p>

      <h4 id="hireConfigurationTermHeading">Hire configuration and optional branding</h4>
      <p><strong>Setup type and stand count:</strong> The standard hire fee applies whether the competition uses one or two stands and whether Waimarino Shears supplies the full stand or installs and operates its timing electronics on a suitable organiser-supplied shearing stand. If the organiser supplies the stand, the organiser must ensure it is safe, structurally sound, suitable for the competition and ready for installation. Waimarino Shears may delay or decline installation if the stand or installation conditions are unsafe or unsuitable.</p>
      <p><strong>Optional competition stand branding:</strong> When the Waimarino Shears stand is supplied, the organiser may request custom panels carrying the competition or event branding. Separate sponsor branding panels are not included. The panels are charged at the supplier's actual cost, with no markup by Waimarino Shears. The organiser will be given a copy of the supplier invoice, or other evidence of the actual supplier cost, and the amount charged will include GST where applicable. The branding cost will be added as a separate amount to the deposit invoice and must be paid before the panels are ordered. Final competition branding and payment must be received at least 14 days before the competition. Once the branding cost has been paid, the panels are the property of the organiser.</p>

      <h4>Equipment and operating conditions</h4>
      <p id="equipmentConditionMaintenanceTerm"><strong>Condition and maintenance of supplied equipment:</strong> Before each hire, Waimarino Shears Incorporated will inspect and maintain the speed shear stand, shearing plants, timing equipment and other equipment it supplies so it is in a safe and serviceable condition for its intended use. Known faults identified through previous use or pre-hire checks will be addressed before the equipment is supplied where practicable.</p>
      <p>The organiser must take care of equipment supplied by Waimarino Shears Incorporated. The organiser may be responsible for reasonable repair or replacement costs where equipment is damaged through negligence, misuse or deliberate actions by the organiser, its personnel, competitors, or others for whom the organiser is responsible.</p>
      <p>Waimarino Shears Incorporated may delay, stop or decline setup or operation if conditions create an unacceptable safety risk to people or equipment.</p>
      <p id="systemAvailabilityTerm"><strong>Electronic system availability:</strong> Waimarino Shears Incorporated will take care in setting up and operating the timing, judging and display equipment, but uninterrupted electronic operation cannot be guaranteed. Equipment, power, connectivity or other technical issues may affect electronic operation.</p>
      <p id="systemFailureTerm"><strong>System failure and manual backup:</strong> If the electronic timing, judging or display system becomes unavailable or unreliable because of equipment, power or another technical failure, Waimarino Shears Incorporated may continue the competition using manual backup procedures. This may include stopwatches, pen-and-paper records and manual entry of times, points, results or draws. The organiser accepts that these manual procedures may be used for the remainder of the competition where required.</p>

      <h4 id="healthSafetyAccessHeading">Health, safety and access</h4>
      <p id="healthSafetyAccessTerm">The organiser is responsible for health and safety matters it controls at the venue and during the event. This includes providing safe access to and around the speed shear stand, managing stairs, staging and accessways, controlling crowds and event personnel, and preventing unauthorised, intoxicated or otherwise unsafe people from accessing or using the stand or supplied equipment. Waimarino Shears Incorporated remains responsible for the safety of its own work and the equipment it supplies. Each party remains responsible for the health and safety duties that apply to it by law. <strong>Nothing in these terms changes or removes any health and safety responsibility imposed by law.</strong></p>

      <h4 id="animalWelfareHeading">Animal welfare</h4>
      <p id="animalWelfareTerm">The organiser is responsible for animal welfare and animal handling at the event and for ensuring competitors, sheep-handling personnel and other relevant event personnel follow applicable animal-welfare requirements and competition rules. Animals must be handled by suitably competent and authorised people. Waimarino Shears Incorporated provides the speed shear stand and timing service and does not direct or control the handling or treatment of animals. Each party remains responsible under the law for its own acts or omissions and for equipment it supplies.</p>

      <h4>Competition operation</h4>
      <p>The organiser remains responsible for running and administering the competition, including judging, sheep handling, competitor entries, entry fees, sign-in, disputes, protests and competition rulings. <strong>Waimarino Shears personnel operating the timing system do not make, approve, verify or justify competition rulings.</strong></p>
      <p id="disputesAndRulingsTerm"><strong>Disputes, rulings and timing-system records:</strong> Any dispute, protest or question about a competition ruling must first be taken to the organiser and/or competition judges. If timing-system data or records are relevant, the organiser may ask Waimarino Shears personnel to check or provide the recorded timing-system information. Waimarino Shears' role is limited to the system data and technical record; the organiser and judges remain responsible for deciding the outcome of the dispute or ruling.</p>
      <p id="organiserInformationCheckTerm"><strong>Accuracy of competition information:</strong> The organiser is responsible for checking that the booking details, Grade / Event Round Format information and confirmed Programme of Events are accurate and complete before submission. Waimarino Shears Incorporated will configure and operate the timing system using the information supplied by the organiser and may rely on that information unless a change is notified directly.</p>

      <h4>Cancellation</h4>
      <p>If the organiser cancels before the Waimarino Shears team has departed for the event, amounts already paid will be refunded except for non-refundable accommodation, custom branding panels that have already been ordered, or other costs already incurred specifically for that booking.</p>
      <p>If cancellation occurs after our team has departed for the event, the NZ$300 deposit is non-refundable. Non-refundable accommodation costs and any custom branding costs already incurred also remain payable.</p>
      <p id="brandingCancellationTerm"><strong>Competition branding:</strong> Once custom competition branding panels have been ordered, the branding cost is not refundable if the organiser later cancels the event because the panels are produced specifically for that competition. The panels remain the property of the organiser and any completed panels will be made available to them.</p>
      <p>If Waimarino Shears Incorporated is unable to fulfil the booking, hire amounts paid by the organiser will be refunded. Any custom branding panels already paid for remain the property of the organiser and will be made available to them.</p>

      <h4>Postponement</h4>
      <p>If an event is postponed before our team has departed, the booking and deposit may be transferred to one new date agreed by both parties, subject to Waimarino Shears Incorporated being available. If we cannot service the replacement date, amounts paid will be refunded except for non-refundable costs already incurred, including any custom branding panels already ordered.</p>
      <p>If an event is postponed after our team has departed, the original NZ$300 deposit is retained. A replacement event date will be treated as a new booking and will require a new deposit. Organiser-owned branding panels may be reused at the replacement event if suitable.</p>

      <h4 id="privacyDataUseHeading">Privacy and use of information</h4>
      <p id="privacyDataUseTerm">Waimarino Shears Incorporated handles personal information in accordance with the <strong>Privacy Act 2020</strong>. Personal and competition information supplied through this booking pack is collected for the booking, communication with the organiser, event preparation, timing-system setup and operation, competition records, and technical or data queries relating to the event. Information will be used or disclosed for those purposes, a directly related purpose, or where required or permitted by law. Waimarino Shears Incorporated will protect the information against loss, misuse and unauthorised access or disclosure and will keep personal information only for as long as it is needed for a lawful purpose. Requests to access or correct personal information can be made by emailing <a href="mailto:Waimarinoshears@gmail.com">Waimarinoshears@gmail.com</a>.</p>`;
  }

  function wrapFunctions() {
    if (typeof syncStateFromForm === 'function' && !syncStateFromForm.__bookingPolicyFinalWrapped) {
      const original = syncStateFromForm;
      const wrapped = function bookingPolicyFinalSyncStateFromForm() {
        original();
        syncPolicyState();
      };
      wrapped.__bookingPolicyFinalWrapped = true;
      syncStateFromForm = wrapped;
    }

    if (typeof buildPackage === 'function' && !buildPackage.__bookingPolicyFinalWrapped) {
      const original = buildPackage;
      const wrapped = function bookingPolicyFinalBuildPackage(submitted = false) {
        const pack = original(submitted);
        pack.appVersion = APP_VERSION;
        pack.booking = { ...(pack.booking || {}), termsVersion: TERMS_VERSION };
        pack.commercial = {
          ...(pack.commercial || {}),
          travelIncluded: true,
          travelIncludedOneWayKm: 200,
          travelOrigin: 'Raetihi',
          additionalTravelChargeMayApplyBeyondIncludedDistance: true
        };
        if (typeof state !== 'undefined') syncPolicyState();
        return pack;
      };
      wrapped.__bookingPolicyFinalWrapped = true;
      buildPackage = wrapped;
    }

    if (typeof buildReview === 'function' && !buildReview.__bookingPolicyFinalWrapped) {
      const original = buildReview;
      const wrapped = function bookingPolicyFinalBuildReview() {
        original();
        syncPolicyState();
        patchTravelSummary();
      };
      wrapped.__bookingPolicyFinalWrapped = true;
      buildReview = wrapped;
    }

    if (typeof buildHumanPackHtml === 'function' && !buildHumanPackHtml.__bookingPolicyFinalWrapped) {
      const original = buildHumanPackHtml;
      const wrapped = function bookingPolicyFinalHumanPackHtml() {
        if (typeof state !== 'undefined') syncPolicyState();
        const html = original();
        if (typeof state !== 'undefined') syncPolicyState();
        return html
          .replaceAll('19 August 2026', TERMS_VERSION)
          .replaceAll('21 August 2026', TERMS_VERSION);
      };
      wrapped.__bookingPolicyFinalWrapped = true;
      buildHumanPackHtml = wrapped;
    }

    if (typeof loadPackage === 'function' && !loadPackage.__bookingPolicyFinalWrapped) {
      const original = loadPackage;
      const wrapped = function bookingPolicyFinalLoadPackage(pack, notify = true) {
        const sourceVersion = pack?.booking?.termsVersion || null;
        const result = original(pack, notify);
        clearOldTermsAcceptance(sourceVersion);
        syncPolicyState();
        patchTravelSummary();
        return result;
      };
      wrapped.__bookingPolicyFinalWrapped = true;
      loadPackage = wrapped;
    }
  }

  function applyFinalPolicy() {
    patchIntroductionAndSpace();
    patchTravelSummary();
    rewriteTerms();
    syncPolicyState();
  }

  function initialise() {
    const sourceVersion = typeof state !== 'undefined' ? state?.booking?.termsVersion : null;
    clearOldTermsAcceptance(sourceVersion);
    wrapFunctions();
    applyFinalPolicy();

    // Earlier compatibility scripts also tidy these areas during startup.
    // Reapply this final wording after those startup passes have completed.
    window.setTimeout(applyFinalPolicy, 400);
    window.setTimeout(applyFinalPolicy, 1400);
    window.setTimeout(applyFinalPolicy, 3200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
