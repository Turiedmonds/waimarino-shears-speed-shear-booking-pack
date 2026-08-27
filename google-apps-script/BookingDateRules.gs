(() => {
  const BOOKING_DATE_RULES_BACKEND_VERSION = '1.0.0';
  const MINIMUM_BOOKING_NOTICE_DAYS_ = 14;
  const BOOKING_DATE_TIME_ZONE_ = 'Pacific/Auckland';
  const BOOKING_DATE_CONTACT_EMAIL_ = 'Waimarinoshears@gmail.com';

  function parseIsoDateParts_(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) return null;
    return { year, month, day };
  }

  function utcDayNumber_(parts) {
    return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / 86400000);
  }

  function todayAucklandParts_() {
    const value = Utilities.formatDate(new Date(), BOOKING_DATE_TIME_ZONE_, 'yyyy-MM-dd');
    return parseIsoDateParts_(value);
  }

  function minimumBookingDateParts_() {
    const today = todayAucklandParts_();
    const minimumDate = new Date(Date.UTC(today.year, today.month - 1, today.day, 12));
    minimumDate.setUTCDate(minimumDate.getUTCDate() + MINIMUM_BOOKING_NOTICE_DAYS_);
    return {
      year: minimumDate.getUTCFullYear(),
      month: minimumDate.getUTCMonth() + 1,
      day: minimumDate.getUTCDate()
    };
  }

  function isoDateFromParts_(parts) {
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  }

  function validateMinimumBookingDate_(pack) {
    const value = pack && pack.booking && pack.booking.competitionDate;
    const eventDate = parseIsoDateParts_(value);
    if (!eventDate) throw new Error('Competition date is missing or invalid.');

    const minimumDate = minimumBookingDateParts_();
    if (utcDayNumber_(eventDate) < utcDayNumber_(minimumDate)) {
      throw new Error(
        `Competition date must be at least ${MINIMUM_BOOKING_NOTICE_DAYS_} days from today. ` +
        `For a competition inside ${MINIMUM_BOOKING_NOTICE_DAYS_} days, contact ${BOOKING_DATE_CONTACT_EMAIL_} to discuss a special arrangement.`
      );
    }
  }

  const originalValidatePackForBookingDate_ = validatePack_;
  validatePack_ = function bookingDateAwareValidatePack_(pack) {
    originalValidatePackForBookingDate_(pack);
    validateMinimumBookingDate_(pack);
  };

  this.__waimarinoBookingDateRulesBackendVersion = BOOKING_DATE_RULES_BACKEND_VERSION;
})();
