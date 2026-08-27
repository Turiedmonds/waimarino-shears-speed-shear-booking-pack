const SETTINGS = {
  receiverEmail: 'Waimarinoshears@gmail.com',
  companyName: 'Waimarino Shears Incorporated',
  senderName: 'Waimarino Shears Booking Pack',
  driveFolderName: 'Waimarino Speed Shear Bookings',
  logoUrl: 'https://turiedmonds.github.io/waimarino-shears-speed-shear-booking-pack/assets/Waimarino%20Shears%20Logo.png',
  brandRed: '#EB1D27',
  termsEffectiveLabel: '28 August 2026',
  currentAppVersion: '1.5.0',
  timingImportSchemaVersion: 2
};

function doGet() {
  return ContentService
    .createTextOutput('Waimarino Shears booking receiver is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const pack = normalisePack_(parseRequest_(e));
    validatePack_(pack);
    assignBookingReference_(pack);

    const files = buildBookingFiles_(pack);
    saveBookingFiles_(files);

    const entryManagerHandoff = entryManagerHandoffForBooking_(pack);

    sendInternalBookingEmail_(pack, files, entryManagerHandoff);
    sendOrganiserConfirmation_(pack, files.pdf);

    return jsonResponse_({
      ok: true,
      bookingReference: pack.identity && pack.identity.bookingReference || ''
    });
  } catch (error) {
    console.error(error);
    return jsonResponse_({
      ok: false,
      error: String(error && error.message || error)
    });
  }
}

function parseRequest_(e) {
  if (!e) throw new Error('No request data received.');

  let raw = '';
  if (e.postData && e.postData.contents) raw = e.postData.contents;
  if (!raw && e.parameter && e.parameter.payload) raw = e.parameter.payload;
  if (!raw) throw new Error('Booking data was empty.');

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error('Booking data was not valid JSON.');
  }
}

function normaliseProgramme_(program) {
  return (Array.isArray(program) ? program : [])
    .filter(item => item && String(item.grade || '').trim() && String(item.round || '').trim())
    .map((item, index) => ({
      sequence: index + 1,
      grade: String(item.grade || '').trim(),
      round: String(item.round || '').trim()
    }));
}

function normalisePack_(pack) {
  if (!pack || typeof pack !== 'object') return pack;
  pack.appVersion = SETTINGS.currentAppVersion;
  pack.identity = pack.identity || {};
  pack.booking = pack.booking || {};
  pack.booking.termsVersion = SETTINGS.termsEffectiveLabel;
  pack.commercial = pack.commercial || {};
  pack.commercial.balanceDueDaysAfterEvent = 7;
  pack.competitionSetup = pack.competitionSetup || {};
  pack.competitionSetup.program = normaliseProgramme_(pack.competitionSetup.program);
  pack.competitionSetup.programmeConfirmed = pack.competitionSetup.programmeConfirmed === true;
  return pack;
}

function programmeKey_(grade, round) {
  return `${String(grade || '').trim()}\u0000${String(round || '').trim()}`;
}

function programmeCounts_(items) {
  const counts = {};
  (items || []).forEach(item => {
    const key = programmeKey_(item.grade, item.round);
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function validateProgramme_(setup) {
  const events = setup && setup.events || {};
  const program = normaliseProgramme_(setup && setup.program);
  if (!setup || setup.programmeConfirmed !== true) throw new Error('Programme of Events running order has not been confirmed.');
  if (!program.length) throw new Error('Programme of Events running order is missing.');

  const expected = [];
  Object.keys(events).forEach(grade => {
    const rounds = events[grade] && Array.isArray(events[grade].rounds) ? events[grade].rounds : [];
    rounds.forEach(round => expected.push({ grade, round: String(round && round.name || '').trim() }));
  });

  const expectedCounts = programmeCounts_(expected);
  const actualCounts = programmeCounts_(program);
  const expectedKeys = Object.keys(expectedCounts);
  const actualKeys = Object.keys(actualCounts);
  if (expected.length !== program.length || expectedKeys.length !== actualKeys.length) {
    throw new Error('Programme of Events running order does not match the configured grades and rounds.');
  }
  for (let i = 0; i < expectedKeys.length; i++) {
    const key = expectedKeys[i];
    if (actualCounts[key] !== expectedCounts[key]) {
      throw new Error('Programme of Events running order does not match the configured grades and rounds.');
    }
  }
}

function validatePack_(pack) {
  if (!pack || pack.type !== 'competition_booking_pack') throw new Error('Unsupported booking file type.');
  if (!pack.booking) throw new Error('Booking details are missing.');
  if (!pack.booking.competitionName) throw new Error('Competition name is missing.');
  if (!pack.booking.contactPerson) throw new Error('Contact person is missing.');
  if (!pack.booking.email) throw new Error('Contact email is missing.');
  if (!pack.booking.termsAccepted) throw new Error('Hire Terms & Conditions have not been accepted.');
  validateProgramme_(pack.competitionSetup || {});
}

function competitionYear_(value) {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(String(value || ''));
  if (match) return match[1];
  return Utilities.formatDate(new Date(), 'Pacific/Auckland', 'yyyy');
}

function assignBookingReference_(pack) {
  pack.identity = pack.identity || {};
  if (pack.identity.bookingReference) return pack.identity.bookingReference;

  const year = competitionYear_(pack.booking && pack.booking.competitionDate);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const properties = PropertiesService.getScriptProperties();
    const key = `bookingReferenceCounter_${year}`;
    const current = Number(properties.getProperty(key) || 0);
    const next = current + 1;
    properties.setProperty(key, String(next));
    pack.identity.bookingReference = `WS-${year}-${String(next).padStart(4, '0')}`;
    return pack.identity.bookingReference;
  } finally {
    lock.releaseLock();
  }
}

function buildTimingImport_(pack) {
  const setup = pack.competitionSetup || {};
  return {
    schemaVersion: SETTINGS.timingImportSchemaVersion,
    type: 'speed_shear_timing_import',
    appVersion: SETTINGS.currentAppVersion,
    bookingReference: pack.identity && pack.identity.bookingReference || '',
    competition: {
      name: pack.booking.competitionName || '',
      venue: pack.booking.venue || '',
      date: pack.booking.competitionDate || '',
      startTime: pack.booking.startTime || ''
    },
    competitionSetup: {
      events: JSON.parse(JSON.stringify(setup.events || {})),
      judging: JSON.parse(JSON.stringify(setup.judging || {})),
      program: JSON.parse(JSON.stringify(normaliseProgramme_(setup.program)))
    }
  };
}

function buildBookingFiles_(pack) {
  const displayDate = formatFileDate_(pack.booking.competitionDate);
  const baseName = safeFileName_(pack.booking.competitionName || 'Speed Shear') + '_' + displayDate + '_Booking';
  const timingImport = buildTimingImport_(pack);
  const json = Utilities.newBlob(
    JSON.stringify(timingImport, null, 2),
    'application/json',
    baseName + '.json'
  );

  const doc = createBookingDocument_(pack);
  const docId = doc.getId();
  doc.saveAndClose();
  Utilities.sleep(500);

  const tempDocFile = DriveApp.getFileById(docId);
  const pdf = tempDocFile.getAs(MimeType.PDF).setName(baseName + '.pdf');
  tempDocFile.setTrashed(true);

  return { pdf, json };
}

function createBookingDocument_(pack) {
  const title = `${pack.booking.competitionName || 'Speed Shear'} — Booking Pack`;
  const doc = DocumentApp.create(title);
  const body = doc.getBody();

  body.setMarginTop(24);
  body.setMarginBottom(24);
  body.setMarginLeft(34);
  body.setMarginRight(34);

  appendLogo_(body);

  const heading = body.appendParagraph('Speed Shear Hire & Booking Pack');
  heading.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  heading.setForegroundColor('#111111').setSpacingBefore(2).setSpacingAfter(5);
  body.appendHorizontalRule();

  const status = body.appendParagraph('BOOKING REQUEST — NOT CONFIRMED UNTIL THE $300 DEPOSIT HAS BEEN PAID');
  status.setBold(true).setForegroundColor(SETTINGS.brandRed).setFontSize(10).setSpacingBefore(4).setSpacingAfter(7);

  appendSection_(body, 'Booking details', [
    ['Competition / Speed Shear', pack.booking.competitionName],
    ['Contact person', pack.booking.contactPerson],
    ['Phone', pack.booking.phone],
    ['Email', pack.booking.email],
    ['Venue / location', pack.booking.venue],
    ['Competition date', formatEventDate_(pack.booking.competitionDate)],
    ['Start time', formatEventTime_(pack.booking.startTime)]
  ]);

  appendSection_(body, 'Booking cost', [
    ['Hire fee', 'NZ$750 + GST'],
    ['Deposit', 'NZ$300 — due no later than 14 days before the event'],
    ['Balance', 'Payable within 7 days after completion of the event'],
    ['Travel', 'Included'],
    ['Accommodation', 'Additional if required']
  ]);

  const entries = pack.entries || {};
  appendSection_(body, 'Entry arrangements', [
    ['Entry method', entryMethodLabel_(entries.method)],
    ['Entries collected digitally', entries.digitalEntries == null ? '—' : entries.digitalEntries ? 'Yes' : 'No']
  ]);

  const setup = pack.competitionSetup || {};
  const judging = setup.judging || {};
  appendSection_(body, 'Judging configuration', [
    ['Pen judges', String(judging.penJudges == null ? 0 : judging.penJudges)],
    ['Board judge', judging.boardJudge ? `Yes — ${judging.boardJudges || 0}` : 'No']
  ]);

  appendRoundFormatSection_(body, setup.events || {});
  appendConfirmedRunningOrder_(body, setup.program || []);

  appendSection_(body, 'Agreement', [
    ['Terms accepted', pack.booking.termsAccepted ? 'Yes' : 'No'],
    ['Terms version', SETTINGS.termsEffectiveLabel],
    ['Accepted by', pack.booking.acceptedBy],
    ['Accepted at', formatDateTime_(pack.booking.acceptedAt)],
    ['Booking Reference', pack.identity && pack.identity.bookingReference || '—']
  ]);

  appendNextSteps_(body);

  return doc;
}

function appendLogo_(body) {
  try {
    const response = UrlFetchApp.fetch(SETTINGS.logoUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) return;

    const image = body.appendImage(response.getBlob());
    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();
    const targetHeight = 70;
    if (originalHeight > 0) {
      image.setHeight(targetHeight);
      image.setWidth(Math.round(originalWidth * (targetHeight / originalHeight)));
    }
  } catch (error) {
    console.warn('Logo could not be added:', error);
  }
}

function appendBlock_(body, builder) {
  const wrapper = body.appendTable([['']]);
  wrapper.setBorderWidth(0);
  const cell = wrapper.getRow(0).getCell(0);
  cell.clear();
  builder(cell);
  body.appendParagraph('').setFontSize(2).setSpacingBefore(0).setSpacingAfter(0);
}

function sectionHeading_(parent, heading) {
  const h = parent.appendParagraph(heading);
  h.setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setForegroundColor(SETTINGS.brandRed)
    .setSpacingBefore(5)
    .setSpacingAfter(4);
  return h;
}

function appendSection_(body, heading, rows) {
  appendBlock_(body, cell => {
    sectionHeading_(cell, heading);
    const table = cell.appendTable(rows.map(row => [String(row[0]), display_(row[1])]));
    for (let r = 0; r < table.getNumRows(); r++) {
      const row = table.getRow(r);
      const labelCell = row.getCell(0);
      const valueCell = row.getCell(1);
      labelCell.setBackgroundColor('#f2f2f2');
      labelCell.editAsText().setBold(true).setForegroundColor('#333333');
      valueCell.editAsText().setForegroundColor('#111111');
    }
  });
}

function appendRoundFormatSection_(body, events) {
  appendBlock_(body, cell => {
    sectionHeading_(cell, 'Grade / Event Round Format');
    const names = Object.keys(events || {});
    names.forEach(name => appendEvent_(cell, name, events[name]));
    if (!names.length) cell.appendParagraph('No grades or events selected.').setSpacingAfter(4);
  });
}

function appendEvent_(parent, name, event) {
  const p = parent.appendParagraph(name);
  p.setBold(true).setFontSize(12).setForegroundColor('#111111').setSpacingBefore(5).setSpacingAfter(2);

  const summary = [];
  if (event && event.cleanShear) {
    summary.push(`Clean shear: Yes${event.cleanShearTimeLimit ? ` — ${event.cleanShearTimeLimit}` : ''}`);
  }
  summary.push(`Prize placings: ${display_(event && event.prizePlacings)}`);
  parent.appendParagraph(summary.join('    '))
    .setSpacingBefore(0)
    .setSpacingAfter(3);

  const rounds = event && Array.isArray(event.rounds) ? event.rounds : [];
  if (rounds.length) {
    const tableRows = [['Round', 'Sheep per shearer', 'Qualifying to next round']];
    rounds.forEach(round => tableRows.push([
      display_(round.name),
      display_(round.sheepPerShearer),
      round.qualifiers == null ? '—' : String(round.qualifiers)
    ]));
    const table = parent.appendTable(tableRows);
    for (let c = 0; c < 3; c++) {
      table.getRow(0).getCell(c).setBackgroundColor('#111111');
      table.getRow(0).getCell(c).editAsText().setBold(true).setForegroundColor('#ffffff');
    }
  } else {
    parent.appendParagraph('No rounds entered.').setSpacingAfter(4);
  }
}

function programmeGroupLabel_(roundName) {
  const raw = String(roundName || '').trim();
  const lower = raw.toLowerCase();
  if (/^heats?$/.test(lower)) return 'Heats';
  if (/^quarter[-\s]?finals?$/.test(lower)) return 'Quarter-finals';
  if (/^semi[-\s]?finals?$/.test(lower)) return 'Semi-finals';
  if (/^finals?$/.test(lower)) return 'Finals';
  return raw || 'Other round';
}

function programmeGroups_(program) {
  const groups = [];
  normaliseProgramme_(program).forEach(item => {
    const label = programmeGroupLabel_(item.round);
    const previous = groups.length ? groups[groups.length - 1] : null;
    if (!previous || previous.label !== label) {
      groups.push({ label, items: [item] });
    } else {
      previous.items.push(item);
    }
  });
  return groups;
}

function appendConfirmedRunningOrder_(body, program) {
  appendBlock_(body, cell => {
    sectionHeading_(cell, 'Programme of Events');
    cell.appendParagraph('Confirmed by organiser. This is the running order supplied for timing-system setup.')
      .setBold(true)
      .setSpacingBefore(0)
      .setSpacingAfter(5);

    const groups = programmeGroups_(program);
    if (!groups.length) {
      cell.appendParagraph('No confirmed running order supplied.').setSpacingAfter(4);
      return;
    }

    groups.forEach(group => {
      const groupHeading = cell.appendParagraph(group.label);
      groupHeading.setBold(true).setFontSize(11).setForegroundColor('#111111').setSpacingBefore(5).setSpacingAfter(2);

      const tableRows = [['Order', 'Grade / event']];
      group.items.forEach(item => tableRows.push([
        String(item.sequence),
        display_(item.grade)
      ]));
      const table = cell.appendTable(tableRows);
      for (let c = 0; c < 2; c++) {
        table.getRow(0).getCell(c).setBackgroundColor('#111111');
        table.getRow(0).getCell(c).editAsText().setBold(true).setForegroundColor('#ffffff');
      }
    });
  });
}

function appendNextSteps_(body) {
  appendBlock_(body, cell => {
    sectionHeading_(cell, 'What happens next?');
    cell.appendParagraph('1. Waimarino Shears reviews this booking request.').setSpacingAfter(2);
    cell.appendParagraph('2. A $300 deposit invoice is sent to the organiser.').setSpacingAfter(2);
    cell.appendParagraph('3. The booking is confirmed once the deposit has been paid.').setSpacingAfter(2);
    cell.appendParagraph(`4. If changes are needed after submission, email ${SETTINGS.receiverEmail} and quote your Booking Reference. Please do not submit another booking request.`).setSpacingAfter(2);
  });
}

function saveBookingFiles_(files) {
  const folder = getOrCreateFolder_(SETTINGS.driveFolderName);
  folder.createFile(files.pdf.copyBlob());
  folder.createFile(files.json.copyBlob());
}

function getOrCreateFolder_(name) {
  const existing = DriveApp.getFoldersByName(name);
  return existing.hasNext() ? existing.next() : DriveApp.createFolder(name);
}

function sendInternalBookingEmail_(pack, files, entryManagerHandoff) {
  const reference = pack.identity && pack.identity.bookingReference || '';
  const subject = `New Speed Shear Booking Request — ${reference} — ${pack.booking.competitionName}`;
  const html = buildInternalEmailHtml_(pack, entryManagerHandoff);

  const entryManagerStatus =
    entryManagerHandoff && entryManagerHandoff.ok === true
      ? ' Entry Manager competition record created successfully.'
      : ' Entry Manager setup needs attention.';

  MailApp.sendEmail({
    to: SETTINGS.receiverEmail,
    subject,
    body: `New booking request received for ${pack.booking.competitionName}. Booking Reference: ${reference}. The PDF booking pack and timing-system import file are attached.${entryManagerStatus}`,
    htmlBody: html,
    name: SETTINGS.senderName,
    replyTo: pack.booking.email,
    attachments: [files.pdf.copyBlob(), files.json.copyBlob()]
  });
}

function sendOrganiserConfirmation_(pack, pdf) {
  if (!pack.booking.email) return;

  const reference = pack.identity && pack.identity.bookingReference || '';
  const subject = `Waimarino Shears — Booking Request Received — ${reference}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:640px">
      <h2 style="margin-bottom:6px">Booking request received</h2>
      <p>Hi ${escapeHtml_(pack.booking.contactPerson || '')},</p>
      <p>We have received your booking request for <strong>${escapeHtml_(pack.booking.competitionName || '')}</strong>.</p>
      <p><strong>Booking Reference:</strong> ${escapeHtml_(reference)}</p>
      <p>Your completed Booking Pack PDF is attached for your records.</p>
      <div style="border-left:5px solid ${SETTINGS.brandRed};background:#fff4f4;padding:12px 14px;margin:18px 0">
        <strong>Your booking is not confirmed yet.</strong><br>
        Waimarino Shears will review the request and send the $300 deposit invoice. The booking is confirmed once the deposit has been paid.
      </div>
      <p><strong>Need to make a change?</strong> Email <a href="mailto:${SETTINGS.receiverEmail}">${SETTINGS.receiverEmail}</a> and quote your Booking Reference. Please do not submit another booking request.</p>
      <p>If anything needs checking, we will contact you.</p>
      <p>Waimarino Shears Incorporated</p>
    </div>`;

  MailApp.sendEmail({
    to: pack.booking.email,
    subject,
    body: `We have received your booking request for ${pack.booking.competitionName}. Booking Reference: ${reference}. Your Booking Pack PDF is attached. Your booking is not confirmed until the deposit has been paid. If changes are needed, email ${SETTINGS.receiverEmail}, quote your Booking Reference, and do not submit another booking request.`,
    htmlBody: html,
    name: SETTINGS.senderName,
    replyTo: SETTINGS.receiverEmail,
    attachments: [pdf.copyBlob()]
  });
}

function buildInternalEmailHtml_(pack, entryManagerHandoff) {
  const judging = pack.competitionSetup && pack.competitionSetup.judging || {};
  return `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:720px">
      <h2 style="margin-bottom:4px">New Speed Shear Booking Request</h2>
      <p style="margin-top:0;color:#666">The full Booking Pack PDF and timing-system import file are attached.</p>
      <table style="border-collapse:collapse;width:100%">
        ${emailRow_('Booking Reference', pack.identity && pack.identity.bookingReference || '—')}
        ${emailRow_('Competition', pack.booking.competitionName)}
        ${emailRow_('Contact', pack.booking.contactPerson)}
        ${emailRow_('Phone', pack.booking.phone)}
        ${emailRow_('Email', pack.booking.email)}
        ${emailRow_('Venue', pack.booking.venue)}
        ${emailRow_('Date', formatEventDate_(pack.booking.competitionDate))}
        ${emailRow_('Start time', formatEventTime_(pack.booking.startTime))}
        ${emailRow_('Pen judges', judging.penJudges == null ? 0 : judging.penJudges)}
        ${emailRow_('Board judge', judging.boardJudge ? `Yes — ${judging.boardJudges || 0}` : 'No')}
        ${emailRow_('Programme confirmed', pack.competitionSetup && pack.competitionSetup.programmeConfirmed ? 'Yes' : 'No')}
        ${emailRow_('Accepted by', pack.booking.acceptedBy)}
        ${emailRow_('Terms version', SETTINGS.termsEffectiveLabel)}
      </table>

      ${entryManagerInternalEmailBlock_(entryManagerHandoff)}

      <p style="margin-top:18px"><strong>Status:</strong> Booking request received — awaiting review and deposit invoice.</p>
    </div>`;
}

function emailRow_(label, value) {
  return `<tr><td style="padding:7px;border-bottom:1px solid #ddd;font-weight:bold;width:34%">${escapeHtml_(label)}</td><td style="padding:7px;border-bottom:1px solid #ddd">${escapeHtml_(display_(value))}</td></tr>`;
}

function entryMethodLabel_(value) {
  if (value === 'pre-entry') return 'Pre-entry only';
  if (value === 'on-day') return 'Entries on the day only';
  if (value === 'both') return 'Both';
  return display_(value);
}

function display_(value) {
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

function formatEventDate_(value) {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return String(value);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return String(value);

  return `${Number(match[3])} ${months[monthIndex]} ${match[1]}`;
}

function formatFileDate_(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  return match ? `${match[3]}-${match[2]}-${match[1]}` : 'undated';
}

function formatEventTime_(value) {
  if (!value) return '—';
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value));
  if (!match) return String(value);

  const hour24 = Number(match[1]);
  if (hour24 < 0 || hour24 > 23) return String(value);
  const hour12 = hour24 % 12 || 12;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  return `${hour12}:${match[2]} ${suffix}`;
}

function formatDateTime_(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return Utilities.formatDate(date, 'Pacific/Auckland', 'd MMMM yyyy, h:mm a');
}

function safeFileName_(value) {
  return String(value || 'Speed_Shear')
    .trim()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'Speed_Shear';
}

function escapeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
