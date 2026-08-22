(() => {
  if (window.__waimarinoHireOptionsEmailVersion) return;
  window.__waimarinoHireOptionsEmailVersion = '1.0.4';

  const EMAIL = 'Waimarinoshears@gmail.com';
  const TRAVEL_POLICY = 'Included for competitions up to 200 km by road, one way, from Raetihi. Beyond this distance, an additional travel charge may apply and will be quoted and agreed before the booking is confirmed.';

  function setupTypeLabel(value) {
    return value === 'electronics-only'
      ? 'Electronics & operation on organiser-supplied shearing stand'
      : 'Full Waimarino Shears stand, electronics & operation';
  }

  function parseCleanShearTime(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    let total = null;
    if (/^\d+$/.test(text)) total = Number.parseInt(text, 10);
    if (/^\d{1,2}:\d{2}$/.test(text)) {
      const [minutes, seconds] = text.split(':').map(Number);
      if (seconds >= 0 && seconds <= 59) total = (minutes * 60) + seconds;
    }
    if (!Number.isFinite(total) || total <= 0) return null;
    return { minutes: Math.floor(total / 60), seconds: total % 60 };
  }

  function cleanShearTimeLabel(value) {
    const parsed = parseCleanShearTime(value);
    if (!parsed) return 'no maximum time limit';
    const parts = [];
    if (parsed.minutes) parts.push(`${parsed.minutes} min`);
    if (parsed.seconds || !parsed.minutes) parts.push(`${parsed.seconds} sec`);
    return `maximum time ${parts.join(' ')}`;
  }

  function eventSummary(pack) {
    const events = pack.competitionSetup?.events || {};
    const parts = Object.entries(events).map(([name, event]) => {
      const rounds = (event.rounds || []).map(round =>
        `${round.name}: ${round.sheepPerShearer} sheep per shearer${round.qualifiers == null ? '' : `, ${round.qualifiers} qualify`}`
      ).join(' | ');
      const clean = event.cleanShear
        ? `Clean shear: Yes — ${cleanShearTimeLabel(event.cleanShearTimeLimit)}; `
        : 'Clean shear: No; ';
      return `${name} — ${clean}Prize placings: ${event.prizePlacings}; ${rounds}`;
    });
    return parts.length ? parts.join('\n') : 'No grades or events selected.';
  }

  function programmeSummary(pack) {
    const program = Array.isArray(pack.competitionSetup?.program) ? pack.competitionSetup.program : [];
    return program.length
      ? program.map((item, index) => `${index + 1}. ${item.grade || '—'} — ${item.round || '—'}`).join('\n')
      : 'No confirmed programme supplied.';
  }

  function bookingSummary(pack) {
    const entries = pack.entries || {};
    const judging = pack.competitionSetup?.judging || {};
    const stands = Number(pack.competitionSetup?.stands) === 1 ? 1 : 2;
    const branding = pack.hire?.competitionBranding === true;
    const lines = [
      `Competition: ${pack.booking.competitionName || '—'}`,
      `Contact: ${pack.booking.contactPerson || '—'}`,
      `Phone: ${pack.booking.phone || '—'}`,
      `Email: ${pack.booking.email || '—'}`,
      `Venue: ${pack.booking.venue || '—'}`,
      `Date: ${typeof humanDate === 'function' ? humanDate(pack.booking.competitionDate) : (pack.booking.competitionDate || '—')}`,
      `Start time: ${pack.booking.startTime || '—'}`,
      `Travel: ${TRAVEL_POLICY}`,
      '',
      `Setup type: ${setupTypeLabel(pack.hire?.setupType)}`,
      `Competition stands in use: ${stands} stand${stands === 1 ? '' : 's'}`,
      `Competition stand branding: ${branding ? 'Yes — competition/event branding only' : 'No'}`
    ];

    if (branding) {
      lines.push(
        'Branding cost: Supplier actual cost, including GST where applicable, with no markup by Waimarino Shears',
        'Branding cost evidence: Supplier invoice or other evidence of the actual supplier cost will be provided',
        'Branding payment: Added as a separate amount to the deposit invoice and payable before ordering',
        'Branding ownership: Once paid for, the panels are the property of the organiser',
        'Branding & payment deadline: At least 14 days before the competition'
      );
    }

    lines.push(
      '',
      `Entry method: ${entries.method || '—'}`,
      `Digital entries: ${entries.digitalEntries == null ? '—' : entries.digitalEntries ? 'Yes' : 'No'}`,
      `Pen judges: ${judging.penJudges ?? 0}`,
      `Board judge: ${judging.boardJudge ? `Yes — ${judging.boardJudges || 0}` : 'No'}`,
      '', 'Grade / Event Round Format:', eventSummary(pack), '',
      'Programme of Events:', programmeSummary(pack), '',
      `Terms accepted: ${pack.booking.termsAccepted ? 'Yes' : 'No'}`,
      `Terms version: ${pack.booking.termsVersion || '—'}`,
      `Accepted by: ${pack.booking.acceptedBy || '—'}`,
      `Accepted at: ${typeof humanDateTime === 'function' ? humanDateTime(pack.booking.acceptedAt) : (pack.booking.acceptedAt || '—')}`
    );
    return lines.join('\n');
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#emailBookingRequestBtn');
    if (!button || button.disabled) return;
    if (typeof state !== 'undefined' && state.booking?.status === 'submitted') return;

    const warnings = typeof validateForReview === 'function' ? validateForReview() : [];
    if (warnings.length) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const pack = buildPackage(true);
    const subject = `Speed Shear Booking Request — ${pack.booking.competitionName || 'Competition'}`;
    const body = [
      'Hello Waimarino Shears,', '',
      'Please find my speed shear booking request below.', '',
      bookingSummary(pack), '',
      'This booking request is not confirmed until the deposit has been paid.',
      `If changes are needed after submission, I will email ${EMAIL} rather than submitting another booking request.`
    ].join('\n');

    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, true);
})();
