const SETTINGS = {
  receiverEmail: 'Waimarinoshears@gmail.com',
  companyName: 'Waimarino Shears Incorporated',
  senderName: 'Waimarino Shears Booking Pack',
  driveFolderName: 'Waimarino Speed Shear Bookings',
  logoUrl: 'https://turiedmonds.github.io/waimarino-shears-speed-shear-booking-pack/assets/Waimarino%20Shears%20Logo.png'
};

function doGet() {
  return ContentService
    .createTextOutput('Waimarino Shears booking receiver is running.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const pack = parseRequest_(e);
    validatePack_(pack);

    const files = buildBookingFiles_(pack);
    saveBookingFiles_(files);
    sendInternalBookingEmail_(pack, files);
    sendOrganiserConfirmation_(pack, files.pdf);

    return jsonResponse_({ ok: true, bookingId: pack.identity && pack.identity.bookingId || '' });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: String(error && error.message || error) });
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

function validatePack_(pack) {
  if (!pack || pack.type !== 'competition_booking_pack') throw new Error('Unsupported booking file type.');
  if (!pack.booking) throw new Error('Booking details are missing.');
  if (!pack.booking.competitionName) throw new Error('Competition name is missing.');
  if (!pack.booking.contactPerson) throw new Error('Contact person is missing.');
  if (!pack.booking.email) throw new Error('Contact email is missing.');
  if (!pack.booking.termsAccepted) throw new Error('Hire Terms & Conditions have not been accepted.');
}

function buildBookingFiles_(pack) {
  const baseName = safeFileName_(pack.booking.competitionName || 'Speed Shear') + '_' + (pack.booking.competitionDate || 'undated') + '_Booking';
  const json = Utilities.newBlob(
    JSON.stringify(pack, null, 2),
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

  body.setMarginTop(28);
  body.setMarginBottom(28);
  body.setMarginLeft(36);
  body.setMarginRight(36);

  appendLogo_(body);

  const company = body.appendParagraph(SETTINGS.companyName.toUpperCase());
  company.setForegroundColor('#c1121f').setBold(true).setFontSize(10).setSpacingAfter(4);

  const heading = body.appendParagraph('Speed Shear Hire & Booking Pack');
  heading.setHeading(DocumentApp.ParagraphHeading.HEADING1);
  heading.setForegroundColor('#111111').setSpacingBefore(0).setSpacingAfter(6);
  body.appendHorizontalRule();

  const status = body.appendParagraph('BOOKING REQUEST — NOT CONFIRMED UNTIL THE $300 DEPOSIT HAS BEEN PAID');
  status.setBold(true).setForegroundColor('#c1121f').setFontSize(10).setSpacingBefore(4).setSpacingAfter(8);

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
    ['Balance', 'Payable within 14 days after the event'],
    ['Travel', 'Included'],
    ['Accommodation', 'Additional if required']
  ]);

  const entries = pack.entries || {};
  appendSection_(body, 'Entry arrangements', [
    ['Entry method', entryMethodLabel_(entries.method)],
    ['Entries collected digitally', entries.digitalEntries == null ? '—' : entries.digitalEntries ? 'Yes' : 'No']
  ]);

  const judging = pack.competitionSetup && pack.competitionSetup.judging || {};
  appendSection_(body, 'Judging configuration', [
    ['Pen judges', String(judging.penJudges == null ? 0 : judging.penJudges)],
    ['Board judge', judging.boardJudge ? `Yes — ${judging.boardJudges || 0}` : 'No']
  ]);

  const events = pack.competitionSetup && pack.competitionSetup.events || {};
  sectionHeading_(body, 'Competition configuration');

  Object.keys(events).forEach(name => appendEvent_(body, name, events[name]));
  if (!Object.keys(events).length) body.appendParagraph('No grades or events selected.').setSpacingAfter(6);

  appendSection_(body, 'Agreement', [
    ['Terms accepted', pack.booking.termsAccepted ? 'Yes' : 'No'],
    ['Accepted by', pack.booking.acceptedBy],
    ['Accepted at', formatDateTime_(pack.booking.acceptedAt)],
    ['Booking ID', pack.identity && pack.identity.bookingId || '—']
  ]);

  const next = sectionHeading_(body, 'What happens next?');
  next.setSpacingBefore(14);
  body.appendListItem('Waimarino Shears reviews this booking request.');
  body.appendListItem('A $300 deposit invoice is sent to the organiser.');
  body.appendListItem('The booking is confirmed once the deposit has been paid.');

  return doc;
}

function appendLogo_(body) {
  try {
    const response = UrlFetchApp.fetch(SETTINGS.logoUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) return;

    const image = body.appendImage(response.getBlob());
    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();
    const targetHeight = 72;
    if (originalHeight > 0) {
      image.setHeight(targetHeight);
      image.setWidth(Math.round(originalWidth * (targetHeight / originalHeight)));
    }
  } catch (error) {
    console.warn('Logo could not be added:', error);
  }
}

function sectionHeading_(body, heading) {
  const h = body.appendParagraph(heading);
  h.setHeading(DocumentApp.ParagraphHeading.HEADING2)
    .setForegroundColor('#c1121f')
    .setSpacingBefore(12)
    .setSpacingAfter(5);
  return h;
}

function appendSection_(body, heading, rows) {
  sectionHeading_(body, heading);

  const table = body.appendTable(rows.map(row => [String(row[0]), display_(row[1])]));
  for (let r = 0; r < table.getNumRows(); r++) {
    const row = table.getRow(r);
    const labelCell = row.getCell(0);
    const valueCell = row.getCell(1);
    labelCell.setBackgroundColor('#f2f2f2');
    labelCell.editAsText().setBold(true).setForegroundColor('#333333');
    valueCell.editAsText().setForegroundColor('#111111');
  }
}

function appendEvent_(body, name, event) {
  const p = body.appendParagraph(name);
  p.setBold(true).setFontSize(12).setForegroundColor('#111111').setSpacingBefore(7).setSpacingAfter(2);

  const cleanShear = event && event.cleanShear
    ? `Yes${event.cleanShearTimeLimit ? ` — ${event.cleanShearTimeLimit}` : ''}`
    : 'No';
  body.appendParagraph(`Clean shear: ${cleanShear}    Prize placings: ${display_(event && event.prizePlacings)}`)
    .setSpacingBefore(0)
    .setSpacingAfter(4);

  const rounds = event && Array.isArray(event.rounds) ? event.rounds : [];
  if (rounds.length) {
    const tableRows = [['Round', 'Sheep per shearer', 'Qualifying to next round']];
    rounds.forEach(round => tableRows.push([
      display_(round.name),
      display_(round.sheepPerShearer),
      round.qualifiers == null ? '—' : String(round.qualifiers)
    ]));
    const table = body.appendTable(tableRows);
    for (let c = 0; c < 3; c++) {
      table.getRow(0).getCell(c).setBackgroundColor('#111111');
      table.getRow(0).getCell(c).editAsText().setBold(true).setForegroundColor('#ffffff');
    }
  } else {
    body.appendParagraph('No rounds entered.').setSpacingAfter(4);
  }
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

function sendInternalBookingEmail_(pack, files) {
  const subject = `New Speed Shear Booking Request — ${pack.booking.competitionName}`;
  const html = buildInternalEmailHtml_(pack);

  MailApp.sendEmail({
    to: SETTINGS.receiverEmail,
    subject,
    body: `New booking request received for ${pack.booking.competitionName}. The PDF booking pack and timing-system booking file are attached.`,
    htmlBody: html,
    name: SETTINGS.senderName,
    replyTo: pack.booking.email,
    attachments: [files.pdf.copyBlob(), files.json.copyBlob()]
  });
}

function sendOrganiserConfirmation_(pack, pdf) {
  if (!pack.booking.email) return;

  const subject = `Waimarino Shears — Booking Request Received — ${pack.booking.competitionName}`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:640px">
      <h2 style="margin-bottom:6px">Booking request received</h2>
      <p>Hi ${escapeHtml_(pack.booking.contactPerson || '')},</p>
      <p>We have received your booking request for <strong>${escapeHtml_(pack.booking.competitionName || '')}</strong>.</p>
      <p>Your completed Booking Pack is attached for your records.</p>
      <div style="border-left:5px solid #c1121f;background:#fff4f4;padding:12px 14px;margin:18px 0">
        <strong>Your booking is not confirmed yet.</strong><br>
        Waimarino Shears will review the request and send the $300 deposit invoice. The booking is confirmed once the deposit has been paid.
      </div>
      <p>If anything needs checking, we will contact you.</p>
      <p>Waimarino Shears Incorporated</p>
    </div>`;

  MailApp.sendEmail({
    to: pack.booking.email,
    subject,
    body: `We have received your booking request for ${pack.booking.competitionName}. Your booking is not confirmed until the deposit has been paid.`,
    htmlBody: html,
    name: SETTINGS.senderName,
    replyTo: SETTINGS.receiverEmail,
    attachments: [pdf.copyBlob()]
  });
}

function buildInternalEmailHtml_(pack) {
  const judging = pack.competitionSetup && pack.competitionSetup.judging || {};
  return `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:720px">
      <h2 style="margin-bottom:4px">New Speed Shear Booking Request</h2>
      <p style="margin-top:0;color:#666">The full Booking Pack PDF and editable/importable Booking File are attached.</p>
      <table style="border-collapse:collapse;width:100%">
        ${emailRow_('Competition', pack.booking.competitionName)}
        ${emailRow_('Contact', pack.booking.contactPerson)}
        ${emailRow_('Phone', pack.booking.phone)}
        ${emailRow_('Email', pack.booking.email)}
        ${emailRow_('Venue', pack.booking.venue)}
        ${emailRow_('Date', formatEventDate_(pack.booking.competitionDate))}
        ${emailRow_('Start time', formatEventTime_(pack.booking.startTime))}
        ${emailRow_('Pen judges', judging.penJudges == null ? 0 : judging.penJudges)}
        ${emailRow_('Board judge', judging.boardJudge ? `Yes — ${judging.boardJudges || 0}` : 'No')}
        ${emailRow_('Accepted by', pack.booking.acceptedBy)}
        ${emailRow_('Booking ID', pack.identity && pack.identity.bookingId || '—')}
      </table>
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
  return Utilities.formatDate(date, 'Pacific/Auckland', 'd MMM yyyy, h:mm a');
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
