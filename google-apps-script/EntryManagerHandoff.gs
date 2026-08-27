const ENTRY_MANAGER_HANDOFF_SETTINGS = {
  endpointProperty: 'ENTRY_MANAGER_ENDPOINT',
  secretProperty: 'ENTRY_MANAGER_SHARED_SECRET'
};

function entryManagerHandoffForBooking_(pack) {
  const properties = PropertiesService.getScriptProperties();
  const endpoint = String(properties.getProperty(ENTRY_MANAGER_HANDOFF_SETTINGS.endpointProperty) || '').trim();
  const sharedSecret = String(properties.getProperty(ENTRY_MANAGER_HANDOFF_SETTINGS.secretProperty) || '').trim();

  if (!endpoint) {
    return { ok: false, configured: false, error: 'ENTRY_MANAGER_ENDPOINT is not configured.' };
  }
  if (!sharedSecret) {
    return { ok: false, configured: false, error: 'ENTRY_MANAGER_SHARED_SECRET is not configured.' };
  }

  const setup = pack && pack.competitionSetup || {};
  const booking = pack && pack.booking || {};
  const payload = {
    type: 'entry_manager_competition_setup',
    sharedSecret,
    bookingReference: String(pack && pack.identity && pack.identity.bookingReference || ''),
    competition: {
      name: String(booking.competitionName || ''),
      date: String(booking.competitionDate || ''),
      venue: String(booking.venue || '')
    },
    organiser: {
      name: String(booking.contactPerson || ''),
      email: String(booking.email || ''),
      phone: String(booking.phone || '')
    },
    competitionSetup: {
      events: JSON.parse(JSON.stringify(setup.events || {})),
      program: JSON.parse(JSON.stringify(normaliseProgramme_(setup.program || [])))
    }
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'text/plain; charset=utf-8',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      followRedirects: true
    });
    const status = response.getResponseCode();
    const text = response.getContentText();
    let result = null;
    try { result = JSON.parse(text); } catch (_) {}

    if (status < 200 || status >= 300) {
      return { ok: false, configured: true, error: `Entry Manager returned HTTP ${status}.` };
    }
    if (!result || result.ok !== true) {
      return { ok: false, configured: true, error: String(result && result.error || 'Entry Manager setup did not return a valid result.') };
    }

    return {
      ok: true,
      configured: true,
      bookingReference: String(result.bookingReference || payload.bookingReference),
      managerToken: String(result.managerToken || ''),
      publicEntryToken: String(result.publicEntryToken || ''),
      entryManagerUrl: String(result.entryManagerUrl || ''),
      competitorEntryUrl: String(result.competitorEntryUrl || ''),
      fileId: String(result.fileId || '')
    };
  } catch (error) {
    return { ok: false, configured: true, error: String(error && error.message || error) };
  }
}

function entryManagerInternalEmailBlock_(handoff) {
  if (!handoff || handoff.ok !== true) {
    const message = handoff && handoff.error ? handoff.error : 'Entry Manager setup was not completed.';
    return `
      <div style="border-left:5px solid #9a6700;background:#fff8e6;padding:12px 14px;margin:18px 0">
        <strong>Entry Manager setup needs attention.</strong><br>
        ${escapeHtml_(message)}<br>
        The booking request itself was still received successfully.
      </div>`;
  }

  return `
    <div style="border-left:5px solid #169447;background:#eefaf2;padding:12px 14px;margin:18px 0">
      <strong>Entry Manager competition record created.</strong><br>
      The organiser details, grades/events and confirmed Programme of Events have already been loaded.<br><br>
      <strong>Private Entry Manager:</strong><br>
      <a href="${escapeHtml_(handoff.entryManagerUrl)}">${escapeHtml_(handoff.entryManagerUrl)}</a><br><br>
      <strong>Public competitor entry:</strong><br>
      <a href="${escapeHtml_(handoff.competitorEntryUrl)}">${escapeHtml_(handoff.competitorEntryUrl)}</a><br><br>
      <span style="color:#555">Do not release the organiser links until the booking/deposit process reaches the point you want them sent.</span>
    </div>`;
}
