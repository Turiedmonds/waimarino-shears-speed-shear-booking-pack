/*
Entry Manager handoff foundation.
This file is intentionally isolated from the current live booking flow until the Entry Manager backend is deployed and tested.
*/

const ENTRY_MANAGER_HANDOFF = {
  backendEndpoint: '',
  enabled: false
};

function prepareEntryManagerCompetition_(pack) {
  if (!pack || !pack.identity || !pack.identity.bookingReference) {
    throw new Error('Entry Manager handoff requires a Booking Reference.');
  }

  const setup = pack.competitionSetup || {};
  return {
    schemaVersion: 1,
    type: 'entry_manager_competition_setup',
    bookingReference: String(pack.identity.bookingReference || ''),
    competition: {
      name: String(pack.booking && pack.booking.competitionName || ''),
      date: String(pack.booking && pack.booking.competitionDate || ''),
      venue: String(pack.booking && pack.booking.venue || '')
    },
    organiser: {
      name: String(pack.booking && pack.booking.contactPerson || ''),
      email: String(pack.booking && pack.booking.email || ''),
      phone: String(pack.booking && pack.booking.phone || '')
    },
    grades: Object.keys(setup.events || {}),
    competitionSetup: {
      events: JSON.parse(JSON.stringify(setup.events || {})),
      program: JSON.parse(JSON.stringify(setup.program || []))
    }
  };
}

function createEntryManagerForBooking_(pack) {
  if (!ENTRY_MANAGER_HANDOFF.enabled || !ENTRY_MANAGER_HANDOFF.backendEndpoint) {
    return { ok: false, skipped: true, reason: 'Entry Manager handoff is not deployed yet.' };
  }

  const payload = prepareEntryManagerCompetition_(pack);
  const response = UrlFetchApp.fetch(ENTRY_MANAGER_HANDOFF.backendEndpoint, {
    method: 'post',
    contentType: 'text/plain; charset=utf-8',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  let body = {};
  try { body = JSON.parse(response.getContentText() || '{}'); } catch (_) {}
  if (status < 200 || status >= 300 || !body.ok || !body.entryManagerUrl) {
    throw new Error('Entry Manager competition could not be created.');
  }

  return body;
}

function entryManagerInternalEmailBlock_(handoff) {
  if (!handoff || !handoff.entryManagerUrl) return '';
  return '<div style="border-left:5px solid #EB1D27;background:#fff4f4;padding:12px 14px;margin:18px 0">' +
    '<strong>Entry Manager prepared</strong><br>' +
    'This link is for Waimarino Shears staff until the booking deposit has been confirmed.<br>' +
    '<a href="' + escapeHtml_(handoff.entryManagerUrl) + '">Open Competition Entry Manager</a>' +
    '</div>';
}

/*
When deployment is ready, the booking receiver integration is intentionally small:

1. Existing flow assigns Booking Reference first.
2. Call:
     const entryManager = createEntryManagerForBooking_(pack);
3. Add entryManagerInternalEmailBlock_(entryManager) to the INTERNAL Waimarino Shears email only.
4. Do not add this link to sendOrganiserConfirmation_.

Payment controls when Waimarino Shears releases the already-prepared link; payment does not create/configure the Entry Manager.
*/
