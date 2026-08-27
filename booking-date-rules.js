(() => {
  if (window.__waimarinoBookingDateRulesVersion) return;
  window.__waimarinoBookingDateRulesVersion = '1.0.0';

  const MINIMUM_NOTICE_DAYS = 14;
  const CONTACT_EMAIL = 'Waimarinoshears@gmail.com';
  const AUCKLAND_TIME_ZONE = 'Pacific/Auckland';

  function twoDigits(value) {
    return String(value).padStart(2, '0');
  }

  function aucklandTodayValue() {
    try {
      const parts = new Intl.DateTimeFormat('en-NZ', {
        timeZone: AUCKLAND_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(new Date());
      const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
      if (values.year && values.month && values.day) {
        return `${values.year}-${values.month}-${values.day}`;
      }
    } catch (_) {}

    const now = new Date();
    return `${now.getFullYear()}-${twoDigits(now.getMonth() + 1)}-${twoDigits(now.getDate())}`;
  }

  function addDaysToDateValue(value, days) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return '';
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
    date.setUTCDate(date.getUTCDate() + days);
    return `${date.getUTCFullYear()}-${twoDigits(date.getUTCMonth() + 1)}-${twoDigits(date.getUTCDate())}`;
  }

  function minimumDateValue() {
    return addDaysToDateValue(aucklandTodayValue(), MINIMUM_NOTICE_DAYS);
  }

  function longDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return value;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
    try {
      return new Intl.DateTimeFormat('en-NZ', {
        timeZone: 'UTC',
        dateStyle: 'long'
      }).format(date);
    } catch (_) {
      return value;
    }
  }

  function dateRuleMessage(minimumValue = minimumDateValue()) {
    return `Standard online bookings require at least ${MINIMUM_NOTICE_DAYS} days' notice. Choose ${longDate(minimumValue)} or later. For a competition inside ${MINIMUM_NOTICE_DAYS} days, contact ${CONTACT_EMAIL} to discuss whether a special arrangement is possible.`;
  }

  function getDateInput() {
    return document.getElementById('competitionDate');
  }

  function isDateInsideMinimum(value) {
    const text = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    return text < minimumDateValue();
  }

  function ensureDateGuidance() {
    const input = getDateInput();
    const field = input?.closest('.field');
    if (!input || !field) return null;

    let notice = document.getElementById('competitionDateRuleNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'competitionDateRuleNotice';
      notice.className = 'booking-date-rule-notice';
      input.insertAdjacentElement('afterend', notice);
    }

    let error = document.getElementById('competitionDateRuleError');
    if (!error) {
      error = document.createElement('p');
      error.id = 'competitionDateRuleError';
      error.className = 'booking-date-rule-error hidden';
      notice.insertAdjacentElement('afterend', error);
    }

    const describedBy = new Set(String(input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    describedBy.add(notice.id);
    describedBy.add(error.id);
    input.setAttribute('aria-describedby', [...describedBy].join(' '));

    return { input, notice, error };
  }

  function updateDateRuleDisplay(options = {}) {
    const ui = ensureDateGuidance();
    if (!ui) return { valid: true, empty: true, minimum: minimumDateValue() };

    const minimum = minimumDateValue();
    ui.input.min = minimum;
    ui.notice.innerHTML = `
      <span class="booking-date-rule-mark" aria-hidden="true">14</span>
      <span><strong>Minimum booking notice: 14 days.</strong> Dates before <strong>${longDate(minimum)}</strong> are unavailable for standard online booking.<br>If you need to discuss a competition inside 14 days, email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</span>`;

    const value = String(ui.input.value || '').trim();
    const invalid = isDateInsideMinimum(value);
    const message = invalid ? dateRuleMessage(minimum) : '';

    ui.input.classList.toggle('booking-date-rule-invalid', invalid);
    ui.input.setAttribute('aria-invalid', String(invalid));
    try { ui.input.setCustomValidity(message); } catch (_) {}

    if (invalid) {
      ui.error.innerHTML = `<strong>This date is inside the 14-day minimum booking window.</strong> Choose ${longDate(minimum)} or later. For special circumstances, email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> before making arrangements.`;
      ui.error.classList.remove('hidden');
      if (options.focus) {
        ui.input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.setTimeout(() => ui.input.focus({ preventScroll: true }), 250);
      }
    } else {
      ui.error.textContent = '';
      ui.error.classList.add('hidden');
    }

    return { valid: !invalid, empty: !value, minimum, message };
  }

  function showReviewSubmissionDateError() {
    const result = updateDateRuleDisplay();
    if (result.valid) return false;

    const box = document.getElementById('submissionStatus');
    if (box) {
      box.className = 'submission-status error';
      box.innerHTML = `<strong>The competition date is inside the 14-day minimum booking window.</strong><br>Standard online bookings require at least 14 days' notice. Choose ${longDate(result.minimum)} or later, or email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> to discuss a special arrangement.`;
      box.classList.remove('hidden');
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (typeof showToast === 'function') {
      showToast(`Competition date must be ${longDate(result.minimum)} or later.`);
    }
    return true;
  }

  function installValidationWrapper() {
    if (typeof validateForReview !== 'function' || validateForReview.__bookingDateRulesWrapped) return;
    const original = validateForReview;
    const wrapped = function bookingDateRulesValidateForReview() {
      const warnings = original();
      const result = updateDateRuleDisplay();
      if (!result.empty && !result.valid) {
        warnings.push(`Competition date is inside the 14-day minimum booking window. Choose ${longDate(result.minimum)} or later, or contact ${CONTACT_EMAIL} to discuss a special arrangement.`);
      }
      return [...new Set(warnings)];
    };
    wrapped.__bookingDateRulesWrapped = true;
    validateForReview = wrapped;
  }

  function installInteractionGuards() {
    document.addEventListener('click', event => {
      const nextToConfiguration = event.target.closest('.next-step[data-next="3"]');
      if (nextToConfiguration) {
        const result = updateDateRuleDisplay();
        if (!result.empty && !result.valid) {
          event.preventDefault();
          event.stopImmediatePropagation();
          updateDateRuleDisplay({ focus: true });
          if (typeof showToast === 'function') {
            showToast(`Choose a competition date on or after ${longDate(result.minimum)}.`);
          }
          return;
        }
      }

      const submitButton = event.target.closest('#submitBookingRequestBtn');
      if (submitButton && showReviewSubmissionDateError()) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      const emailButton = event.target.closest('#emailBookingRequestBtn');
      if (emailButton && isDateInsideMinimum(getDateInput()?.value)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const result = updateDateRuleDisplay();
        const box = document.getElementById('submissionStatus');
        if (box) {
          box.className = 'submission-status error';
          box.innerHTML = `<strong>This date needs to be discussed directly with Waimarino Shears.</strong><br>The standard booking form requires at least 14 days' notice. Please email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> about the requested date before making a booking arrangement.`;
          box.classList.remove('hidden');
          box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (!result.valid && typeof showToast === 'function') {
          showToast(`For a date inside 14 days, contact ${CONTACT_EMAIL}.`);
        }
      }
    }, true);
  }

  function installStyles() {
    if (document.getElementById('bookingDateRulesStyle')) return;
    const style = document.createElement('style');
    style.id = 'bookingDateRulesStyle';
    style.textContent = `
      .booking-date-rule-notice{display:flex;gap:10px;align-items:flex-start;margin-top:9px;padding:11px 12px;border-left:4px solid var(--brand-2,#EB1D27);border-radius:8px;background:#fff7f7;color:#3d2426;font-size:.92rem;line-height:1.45}
      .booking-date-rule-notice a,.booking-date-rule-error a{color:inherit;font-weight:800}
      .booking-date-rule-mark{display:grid;place-items:center;flex:0 0 30px;width:30px;height:30px;border-radius:50%;background:var(--brand-2,#EB1D27);color:#fff;font-size:.78rem;font-weight:900}
      .booking-date-rule-error{margin:8px 0 0;padding:10px 12px;border:1px solid #db8e94;border-radius:8px;background:#fff3f3;color:#7f1119;line-height:1.4}
      #competitionDate.booking-date-rule-invalid{border-color:#b4232d!important;box-shadow:0 0 0 2px rgba(180,35,45,.12)}
    `;
    document.head.appendChild(style);
  }

  function initialise() {
    installStyles();
    installValidationWrapper();
    installInteractionGuards();

    const input = getDateInput();
    if (!input) return;
    updateDateRuleDisplay();
    input.addEventListener('input', () => updateDateRuleDisplay());
    input.addEventListener('change', () => updateDateRuleDisplay());
    input.addEventListener('focus', () => updateDateRuleDisplay());
    window.addEventListener('pageshow', () => updateDateRuleDisplay());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) updateDateRuleDisplay();
    });
  }

  window.__waimarinoBookingDateRules = {
    minimumNoticeDays: MINIMUM_NOTICE_DAYS,
    minimumDateValue,
    isDateInsideMinimum,
    updateDateRuleDisplay,
    dateRuleMessage
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
