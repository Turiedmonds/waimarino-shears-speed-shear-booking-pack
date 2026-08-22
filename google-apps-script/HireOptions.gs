(() => {
  const HIRE_OPTIONS_VERSION = '1.0.4';
  const FINAL_TERMS_VERSION_ = '22 August 2026';
  const FINAL_APP_VERSION_ = '1.5.1';
  const TRAVEL_POLICY_ = 'Included for competitions up to 200 km by road, one way, from Raetihi. Beyond this distance, an additional travel charge may apply and will be quoted and agreed before the booking is confirmed.';
  let activeHirePack_ = null;

  function normaliseHireSetupType_(value, fallback) {
    if (value === 'full' || value === 'electronics-only') return value;
    return fallback;
  }

  function normaliseHireStands_(value) {
    return Number(value) === 1 ? 1 : 2;
  }

  function hireSetupLabel_(pack) {
    return pack && pack.hire && pack.hire.setupType === 'electronics-only'
      ? 'Electronics & operation on organiser-supplied shearing stand'
      : 'Full Waimarino Shears stand, electronics & operation';
  }

  function parseCleanShearTime_(value) {
    const text = String(value || '').trim();
    if (!text) return null;
    let total = null;
    if (/^\d+$/.test(text)) total = Number.parseInt(text, 10);
    if (/^\d{1,2}:\d{2}$/.test(text)) {
      const parts = text.split(':').map(Number);
      const minutes = parts[0];
      const seconds = parts[1];
      if (Number.isFinite(minutes) && Number.isFinite(seconds) && seconds >= 0 && seconds <= 59) {
        total = (minutes * 60) + seconds;
      }
    }
    if (!Number.isFinite(total) || total <= 0) return null;
    return { minutes: Math.floor(total / 60), seconds: total % 60 };
  }

  function cleanShearTimeLabel_(value) {
    const parsed = parseCleanShearTime_(value);
    if (!parsed) return 'no maximum time limit';
    const parts = [];
    if (parsed.minutes) parts.push(`${parsed.minutes} min`);
    if (parsed.seconds || !parsed.minutes) parts.push(`${parsed.seconds} sec`);
    return `maximum time ${parts.join(' ')}`;
  }

  function cleanShearEmailSummary_(pack) {
    const events = pack && pack.competitionSetup && pack.competitionSetup.events || {};
    const parts = [];
    Object.keys(events).forEach(grade => {
      const event = events[grade] || {};
      if (!event.cleanShear) return;
      parts.push(`${grade}: ${cleanShearTimeLabel_(event.cleanShearTimeLimit)}`);
    });
    return parts.length ? parts.join('; ') : 'None';
  }

  const originalNormalisePack_ = normalisePack_;
  normalisePack_ = function hireAwareNormalisePack_(pack) {
    const hadSetupType = !!(pack && pack.hire &&
      Object.prototype.hasOwnProperty.call(pack.hire, 'setupType'));
    const incomingSetupType = hadSetupType ? pack.hire.setupType : null;
    const hadBrandingChoice = !!(pack && pack.hire &&
      Object.prototype.hasOwnProperty.call(pack.hire, 'competitionBranding'));
    const incomingBrandingChoice = hadBrandingChoice ? pack.hire.competitionBranding : null;

    pack = originalNormalisePack_(pack);
    if (!pack || typeof pack !== 'object') return pack;

    pack.appVersion = FINAL_APP_VERSION_;
    pack.booking = pack.booking || {};
    pack.booking.termsVersion = FINAL_TERMS_VERSION_;

    pack.commercial = pack.commercial || {};
    pack.commercial.travelIncluded = true;
    pack.commercial.travelIncludedOneWayKm = 200;
    pack.commercial.travelOrigin = 'Raetihi';
    pack.commercial.additionalTravelChargeMayApplyBeyondIncludedDistance = true;

    pack.hire = pack.hire || {};
    pack.hire.setupType = hadSetupType
      ? normaliseHireSetupType_(incomingSetupType, '')
      : normaliseHireSetupType_(pack.hire.setupType, 'full');
    if (pack.hire.setupType === 'full') {
      pack.hire.competitionBranding = hadBrandingChoice
        ? (incomingBrandingChoice === true ? true : incomingBrandingChoice === false ? false : null)
        : false;
    } else {
      pack.hire.competitionBranding = false;
    }
    delete pack.hire.brandingAfterEvent;

    pack.competitionSetup = pack.competitionSetup || {};
    pack.competitionSetup.stands = normaliseHireStands_(pack.competitionSetup.stands);
    return pack;
  };

  const originalValidatePack_ = validatePack_;
  validatePack_ = function hireAwareValidatePack_(pack) {
    originalValidatePack_(pack);

    const setupType = pack && pack.hire && pack.hire.setupType;
    if (setupType !== 'full' && setupType !== 'electronics-only') {
      throw new Error('Choose what hire setup will be used.');
    }

    const stands = Number(pack && pack.competitionSetup && pack.competitionSetup.stands);
    if (stands !== 1 && stands !== 2) {
      throw new Error('Competition stands in use must be 1 or 2.');
    }

    if (setupType === 'full' &&
        pack.hire.competitionBranding !== true &&
        pack.hire.competitionBranding !== false) {
      throw new Error('Choose Yes or No for competition stand branding.');
    }

    if (pack.hire && pack.hire.competitionBranding && setupType !== 'full') {
      throw new Error('Competition stand branding is only available when the Waimarino Shears stand is supplied.');
    }

    const events = pack && pack.competitionSetup && pack.competitionSetup.events || {};
    Object.keys(events).forEach(grade => {
      const event = events[grade] || {};
      const rawLimit = String(event.cleanShearTimeLimit || '').trim();
      if (event.cleanShear && rawLimit && !parseCleanShearTime_(rawLimit)) {
        throw new Error(`${grade}: clean shear maximum time is invalid.`);
      }
    });
  };

  const originalBuildTimingImport_ = buildTimingImport_;
  buildTimingImport_ = function hireAwareBuildTimingImport_(pack) {
    const output = originalBuildTimingImport_(pack);
    output.appVersion = FINAL_APP_VERSION_;
    output.competitionSetup = output.competitionSetup || {};
    output.competitionSetup.stands = normaliseHireStands_(pack && pack.competitionSetup && pack.competitionSetup.stands);
    return output;
  };

  const originalCreateBookingDocument_ = createBookingDocument_;
  createBookingDocument_ = function hireAwareCreateBookingDocument_(pack) {
    activeHirePack_ = pack;
    try {
      return originalCreateBookingDocument_(pack);
    } finally {
      activeHirePack_ = null;
    }
  };

  function replaceRowValue_(rows, label, value) {
    return (rows || []).map(row => row && row[0] === label ? [label, value] : row);
  }

  const originalAppendSection_ = appendSection_;
  appendSection_ = function hireAwareAppendSection_(body, heading, rows) {
    let adjustedRows = rows;

    if (heading === 'Booking cost') {
      adjustedRows = replaceRowValue_(adjustedRows, 'Travel', TRAVEL_POLICY_);

      if (activeHirePack_) {
        const pack = activeHirePack_;
        const stands = normaliseHireStands_(pack.competitionSetup && pack.competitionSetup.stands);
        const branding = !!(pack.hire && pack.hire.competitionBranding);
        const hireRows = [
          ['Setup type', hireSetupLabel_(pack)],
          ['Competition stands in use', `${stands} stand${stands === 1 ? '' : 's'}`],
          ['Competition stand branding', branding ? 'Yes — competition/event branding only' : 'No']
        ];

        if (branding) {
          hireRows.push(
            ['Branding cost', 'Supplier actual cost, including GST where applicable, with no markup by Waimarino Shears'],
            ['Branding cost evidence', 'Supplier invoice or other evidence of the actual supplier cost will be provided'],
            ['Branding payment', 'Added as a separate amount to the deposit invoice and payable before ordering'],
            ['Branding ownership', 'Once paid for, the panels are the property of the organiser'],
            ['Branding & payment deadline', 'At least 14 days before the competition']
          );
        }

        originalAppendSection_(body, 'Hire configuration', hireRows);
      }
    }

    if (heading === 'Agreement') {
      adjustedRows = replaceRowValue_(adjustedRows, 'Terms version', FINAL_TERMS_VERSION_);
    }

    return originalAppendSection_(body, heading, adjustedRows);
  };

  const originalAppendEvent_ = appendEvent_;
  appendEvent_ = function cleanShearAwareAppendEvent_(parent, name, event) {
    if (!event || !event.cleanShear) return originalAppendEvent_(parent, name, event);
    const adjusted = Object.assign({}, event, {
      cleanShearTimeLimit: cleanShearTimeLabel_(event.cleanShearTimeLimit)
    });
    return originalAppendEvent_(parent, name, adjusted);
  };

  const originalBuildInternalEmailHtml_ = buildInternalEmailHtml_;
  buildInternalEmailHtml_ = function hireAwareBuildInternalEmailHtml_(pack) {
    const html = originalBuildInternalEmailHtml_(pack);
    const stands = normaliseHireStands_(pack && pack.competitionSetup && pack.competitionSetup.stands);
    const branding = !!(pack && pack.hire && pack.hire.competitionBranding);
    const extraRows = [
      emailRow_('Travel policy', TRAVEL_POLICY_),
      emailRow_('Setup type', hireSetupLabel_(pack)),
      emailRow_('Competition stands in use', `${stands} stand${stands === 1 ? '' : 's'}`),
      emailRow_('Clean shear', cleanShearEmailSummary_(pack)),
      emailRow_('Competition stand branding', branding ? 'Yes — competition/event branding only' : 'No')
    ];

    if (branding) {
      extraRows.push(
        emailRow_('Branding cost', 'Supplier actual cost, including GST where applicable, with no markup by Waimarino Shears'),
        emailRow_('Branding cost evidence', 'Supplier invoice or other evidence of the actual supplier cost will be provided'),
        emailRow_('Branding payment', 'Added as a separate amount to the deposit invoice and payable before ordering'),
        emailRow_('Branding ownership', 'Once paid for, the panels are the property of the organiser'),
        emailRow_('Branding deadline', 'Competition branding and payment at least 14 days before competition')
      );
    }

    return html.replace('</table>', `${extraRows.join('')}</table>`);
  };

  this.__waimarinoHireOptionsBackendVersion = HIRE_OPTIONS_VERSION;
})();
