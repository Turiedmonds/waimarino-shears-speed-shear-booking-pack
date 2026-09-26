const EVENT_SYSTEM_HANDOFF_SETTINGS = {
  endpointProperty: 'EVENT_SYSTEM_BOOKING_ENDPOINT',
  secretProperty: 'EVENT_SYSTEM_SHARED_SECRET'
};

function eventSystemHandoffForBooking_(pack) {
  const properties = PropertiesService.getScriptProperties();
  const endpoint = String(properties.getProperty(EVENT_SYSTEM_HANDOFF_SETTINGS.endpointProperty) || '').trim();
  const sharedSecret = String(properties.getProperty(EVENT_SYSTEM_HANDOFF_SETTINGS.secretProperty) || '').trim();

  if (!endpoint) {
    return { ok: false, configured: false, error: 'EVENT_SYSTEM_BOOKING_ENDPOINT is not configured.' };
  }
  if (!sharedSecret) {
    return { ok: false, configured: false, error: 'EVENT_SYSTEM_SHARED_SECRET is not configured.' };
  }

  const booking = pack && pack.booking || {};
  const commercial = pack && pack.commercial || {};
  const payload = {
    type: 'speed_shear_booking_request',
    bookingReference: String(pack && pack.identity && pack.identity.bookingReference || ''),
    bookingState: 'request_received',
    sourceUpdatedAt: new Date().toISOString(),
    booking: {
      competitionName: String(booking.competitionName || '').trim(),
      competitionDate: String(booking.competitionDate || '').trim(),
      startTime: String(booking.startTime || '').trim(),
      venue: String(booking.venue || '').trim(),
      contactPerson: String(booking.contactPerson || '').trim(),
      email: String(booking.email || '').trim(),
      phone: String(booking.phone || '').trim()
    },
    commercial: {
      hireAmountMinor: Number(commercial.hireAmountMinor || 75000),
      gstRateBps: Number(commercial.gstRateBps || 1500),
      depositAmountMinor: Number(commercial.depositAmountMinor || 30000),
      depositGstMinor: Number(commercial.depositGstMinor || 4500),
      depositInvoiceTotalMinor: Number(commercial.depositInvoiceTotalMinor || 34500),
      balanceAmountMinor: Number(commercial.balanceAmountMinor || 45000),
      balanceGstMinor: Number(commercial.balanceGstMinor || 6750),
      balanceInvoiceTotalMinor: Number(commercial.balanceInvoiceTotalMinor || 51750),
      currency: String(commercial.currency || 'NZD').toUpperCase()
    }
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json; charset=utf-8',
      payload: JSON.stringify(payload),
      headers: {
        'X-Waimarino-Booking-Secret': sharedSecret
      },
      muteHttpExceptions: true,
      followRedirects: true
    });
    const status = response.getResponseCode();
    const text = response.getContentText();
    let result = null;
    try { result = JSON.parse(text); } catch (_) {}

    if (status < 200 || status >= 300) {
      return { ok: false, configured: true, error: `Event System returned HTTP ${status}.` };
    }
    if (!result || result.ok !== true) {
      return { ok: false, configured: true, error: String(result && result.error || 'Event System did not return a valid result.') };
    }

    return {
      ok: true,
      configured: true,
      bookingReference: String(result.bookingReference || payload.bookingReference),
      state: String(result.state || 'request_received')
    };
  } catch (error) {
    return { ok: false, configured: true, error: String(error && error.message || error) };
  }
}

function eventSystemInternalEmailBlock_(handoff) {
  if (!handoff || handoff.ok !== true) {
    const message = handoff && handoff.error ? handoff.error : 'Event System booking request was not recorded.';
    return `
      <div style="border-left:5px solid #9a6700;background:#fff8e6;padding:12px 14px;margin:18px 0">
        <strong>Event System handoff needs attention.</strong><br>
        ${escapeHtml_(message)}<br>
        The booking request itself was still received successfully.
      </div>`;
  }

  return `
    <div style="border-left:5px solid #169447;background:#eefaf2;padding:12px 14px;margin:18px 0">
      <strong>Event System booking request recorded.</strong><br>
      Booking Reference ${escapeHtml_(handoff.bookingReference || '')} is ready for Waimarino review and the deposit stage in Events Manager.
    </div>`;
}