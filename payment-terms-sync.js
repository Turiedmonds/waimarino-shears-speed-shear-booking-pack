(() => {
  if (window.__waimarinoPaymentTermsSyncVersion) return;
  window.__waimarinoPaymentTermsSyncVersion = '1.0.0';

  const TERMS_VERSION = '27 September 2026';
  const HIRE_BASE_MINOR = 75000;
  const DEPOSIT_BASE_MINOR = 30000;
  const GST_RATE_BPS = 1500;

  function gstMinor(baseMinor) {
    return Math.round((Number(baseMinor) * GST_RATE_BPS) / 10000);
  }

  function paymentSplit() {
    const totalGstMinor = gstMinor(HIRE_BASE_MINOR);
    const depositGstMinor = gstMinor(DEPOSIT_BASE_MINOR);
    const balanceBaseMinor = HIRE_BASE_MINOR - DEPOSIT_BASE_MINOR;
    const balanceGstMinor = totalGstMinor - depositGstMinor;
    return {
      hireBaseMinor: HIRE_BASE_MINOR,
      totalGstMinor,
      bookingTotalMinor: HIRE_BASE_MINOR + totalGstMinor,
      depositBaseMinor: DEPOSIT_BASE_MINOR,
      depositGstMinor,
      depositTotalMinor: DEPOSIT_BASE_MINOR + depositGstMinor,
      balanceBaseMinor,
      balanceGstMinor,
      balanceTotalMinor: balanceBaseMinor + balanceGstMinor
    };
  }

  function nzd(minor, alwaysCents = false) {
    const value = Number(minor || 0) / 100;
    const digits = alwaysCents || !Number.isInteger(value) ? 2 : 0;
    return `NZ$${value.toFixed(digits)}`;
  }

  function applyCommercialState(target) {
    if (!target) return;
    const split = paymentSplit();
    target.commercial = target.commercial || {};
    Object.assign(target.commercial, {
      currency: 'NZD',
      hireFeeExGst: split.hireBaseMinor / 100,
      hireAmountMinor: split.hireBaseMinor,
      gstAdditional: true,
      gstRateBps: GST_RATE_BPS,
      totalGstMinor: split.totalGstMinor,
      bookingTotalMinor: split.bookingTotalMinor,
      deposit: split.depositBaseMinor / 100,
      depositAmountMinor: split.depositBaseMinor,
      depositGstMinor: split.depositGstMinor,
      depositInvoiceTotalMinor: split.depositTotalMinor,
      balanceAmountMinor: split.balanceBaseMinor,
      balanceGstMinor: split.balanceGstMinor,
      balanceInvoiceTotalMinor: split.balanceTotalMinor,
      depositDueDaysBeforeEvent: 14,
      balanceDueDaysAfterEvent: 7
    });
    target.booking = target.booking || {};
    target.booking.termsVersion = TERMS_VERSION;
  }

  function setReviewValue(label, value) {
    document.querySelectorAll('#reviewContent .review-item').forEach(item => {
      if (item.querySelector('span')?.textContent.trim() === label) {
        const strong = item.querySelector('strong');
        if (strong) strong.textContent = value;
      }
    });
  }

  function patchPaymentDisplay() {
    const split = paymentSplit();

    const costRows = [...document.querySelectorAll('.cost-box dl div')];
    const depositRow = costRows.find(row => row.querySelector('dt')?.textContent.trim() === 'Deposit');
    const balanceRow = costRows.find(row => row.querySelector('dt')?.textContent.trim() === 'Balance');
    if (depositRow?.querySelector('dd')) {
      depositRow.querySelector('dd').textContent = `${nzd(split.depositBaseMinor)} + ${nzd(split.depositGstMinor)} GST = ${nzd(split.depositTotalMinor)} total — due no later than 14 days before the event`;
    }
    if (balanceRow?.querySelector('dd')) {
      balanceRow.querySelector('dd').textContent = `${nzd(split.balanceBaseMinor)} + ${nzd(split.balanceGstMinor, true)} GST = ${nzd(split.balanceTotalMinor, true)} total — payable within 7 days after completion of the event`;
    }

    const terms = document.querySelector('.terms-content');
    if (terms) {
      const hireHeading = [...terms.querySelectorAll('h4')].find(h => h.textContent.trim() === 'Hire fee and payment');
      if (hireHeading) {
        let first = hireHeading.nextElementSibling;
        let second = first?.nextElementSibling;
        if (first?.tagName === 'P') {
          first.innerHTML = `The standard hire fee is <strong>${nzd(split.hireBaseMinor)} plus GST</strong>. GST on the standard hire is ${nzd(split.totalGstMinor, true)}, making the standard booking total ${nzd(split.bookingTotalMinor, true)}. Travel is included for competitions up to <strong>200 km by road, one way, from Raetihi</strong>. For competitions beyond this distance, an additional travel charge may apply. Any additional travel charge will be quoted and agreed with the organiser before the booking is confirmed.`;
        }
        if (second?.tagName === 'P') {
          second.innerHTML = `Payment of the standard hire is split into two parts. The first invoice is a <strong>${nzd(split.depositBaseMinor)} deposit plus ${nzd(split.depositGstMinor)} GST (${nzd(split.depositTotalMinor)} total)</strong>, due no later than 14 days before the event. The booking is confirmed once that deposit invoice has been paid. The remaining invoice is <strong>${nzd(split.balanceBaseMinor)} plus ${nzd(split.balanceGstMinor, true)} GST (${nzd(split.balanceTotalMinor, true)} total)</strong>, payable within 7 days after the event. Across both invoices, GST totals ${nzd(split.totalGstMinor, true)}. <strong>GST is apportioned between the two payments and is not charged twice.</strong> If the deposit is not received by the due date after reminders, Waimarino Shears Incorporated may treat the booking as cancelled.`;
        }
      }

      [...terms.querySelectorAll('p')].forEach(paragraph => {
        if (paragraph.textContent.includes('If cancellation occurs after our team has departed for the event, the NZ$300 deposit is non-refundable.')) {
          paragraph.innerHTML = `If cancellation occurs after our team has departed for the event, the deposit payment of <strong>${nzd(split.depositTotalMinor)} (${nzd(split.depositBaseMinor)} deposit plus ${nzd(split.depositGstMinor)} GST)</strong> is non-refundable. Non-refundable accommodation costs and any custom branding costs already incurred also remain payable.`;
        }
        if (paragraph.textContent.includes('If an event is postponed after our team has departed, the original NZ$300 deposit is retained.')) {
          paragraph.innerHTML = `If an event is postponed after our team has departed, the original deposit payment of <strong>${nzd(split.depositTotalMinor)} (${nzd(split.depositBaseMinor)} deposit plus ${nzd(split.depositGstMinor)} GST)</strong> is retained. A replacement event date will be treated as a new booking and will require a new deposit. Organiser-owned branding panels may be reused at the replacement event if suitable.`;
        }
      });
    }

    const note = document.querySelector('.acceptance-box .important-note');
    if (note) note.textContent = `Submitting this booking does not confirm the booking. The booking is confirmed once the ${nzd(split.depositTotalMinor)} deposit invoice (${nzd(split.depositBaseMinor)} deposit + ${nzd(split.depositGstMinor)} GST) has been paid.`;

    setReviewValue('Hire fee', `${nzd(split.hireBaseMinor)} + ${nzd(split.totalGstMinor, true)} GST = ${nzd(split.bookingTotalMinor, true)} total`);
    setReviewValue('Deposit', `${nzd(split.depositBaseMinor)} + ${nzd(split.depositGstMinor)} GST = ${nzd(split.depositTotalMinor)} total`);
    setReviewValue('Balance', `${nzd(split.balanceBaseMinor)} + ${nzd(split.balanceGstMinor, true)} GST = ${nzd(split.balanceTotalMinor, true)} total; due within 7 days after the event`);
    setReviewValue('Terms version', TERMS_VERSION);

    document.querySelectorAll('.next-steps-card p, .submission-status').forEach(element => {
      element.innerHTML = element.innerHTML
        .replaceAll('send the $300 deposit invoice', `send the ${nzd(split.depositTotalMinor)} deposit invoice (${nzd(split.depositBaseMinor)} deposit + ${nzd(split.depositGstMinor)} GST)`)
        .replaceAll('send the NZ$300 deposit invoice', `send the ${nzd(split.depositTotalMinor)} deposit invoice (${nzd(split.depositBaseMinor)} deposit + ${nzd(split.depositGstMinor)} GST)`);
    });
  }

  function wrapFunctions() {
    if (typeof syncStateFromForm === 'function' && !syncStateFromForm.__paymentTermsSyncWrapped) {
      const original = syncStateFromForm;
      syncStateFromForm = function paymentTermsSyncStateFromForm(...args) {
        const result = original.apply(this, args);
        applyCommercialState(state);
        return result;
      };
      syncStateFromForm.__paymentTermsSyncWrapped = true;
    }

    if (typeof buildPackage === 'function' && !buildPackage.__paymentTermsSyncWrapped) {
      const original = buildPackage;
      buildPackage = function paymentTermsSyncBuildPackage(...args) {
        applyCommercialState(state);
        const pack = original.apply(this, args);
        applyCommercialState(pack);
        applyCommercialState(state);
        return pack;
      };
      buildPackage.__paymentTermsSyncWrapped = true;
    }

    if (typeof buildReview === 'function' && !buildReview.__paymentTermsSyncWrapped) {
      const original = buildReview;
      buildReview = function paymentTermsSyncBuildReview(...args) {
        applyCommercialState(state);
        const result = original.apply(this, args);
        patchPaymentDisplay();
        return result;
      };
      buildReview.__paymentTermsSyncWrapped = true;
    }

    if (typeof buildHumanPackHtml === 'function' && !buildHumanPackHtml.__paymentTermsSyncWrapped) {
      const original = buildHumanPackHtml;
      buildHumanPackHtml = function paymentTermsSyncHumanPackHtml(...args) {
        applyCommercialState(state);
        let html = original.apply(this, args);
        const split = paymentSplit();
        html = html
          .replaceAll('NZ$300 — due no later than 14 days before event', `${nzd(split.depositBaseMinor)} + ${nzd(split.depositGstMinor)} GST = ${nzd(split.depositTotalMinor)} total — due no later than 14 days before event`)
          .replaceAll('Due within 7 days after completion of the event', `${nzd(split.balanceBaseMinor)} + ${nzd(split.balanceGstMinor, true)} GST = ${nzd(split.balanceTotalMinor, true)} total — due within 7 days after completion of the event`)
          .replaceAll('28 August 2026', TERMS_VERSION)
          .replaceAll('19 August 2026', TERMS_VERSION);
        return html;
      };
      buildHumanPackHtml.__paymentTermsSyncWrapped = true;
    }
  }

  function applyAll() {
    if (typeof state !== 'undefined') applyCommercialState(state);
    wrapFunctions();
    patchPaymentDisplay();
  }

  const observer = new MutationObserver(() => patchPaymentDisplay());
  observer.observe(document.body, { childList: true, subtree: true });

  applyAll();
  window.setTimeout(applyAll, 250);
  window.setTimeout(applyAll, 800);
  window.setTimeout(applyAll, 1800);
  window.setTimeout(applyAll, 3800);
})();
