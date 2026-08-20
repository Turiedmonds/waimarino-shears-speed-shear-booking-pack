(() => {
  const HIRE_OPTIONS_VERSION = '1.0.2';
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
  };

  const originalBuildTimingImport_ = buildTimingImport_;
  buildTimingImport_ = function hireAwareBuildTimingImport_(pack) {
    const output = originalBuildTimingImport_(pack);
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

  const originalAppendSection_ = appendSection_;
  appendSection_ = function hireAwareAppendSection_(body, heading, rows) {
    if (heading === 'Booking cost' && activeHirePack_) {
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
          ['Branding cost', 'Additional one-off cost, charged at cost with no markup — price confirmed before ordering'],
          ['Branding payment', 'Added as a separate amount to the deposit invoice and payable before ordering'],
          ['Branding & payment deadline', 'At least 14 days before the competition']
        );
      }

      originalAppendSection_(body, 'Hire configuration', hireRows);
    }
    return originalAppendSection_(body, heading, rows);
  };

  const originalBuildInternalEmailHtml_ = buildInternalEmailHtml_;
  buildInternalEmailHtml_ = function hireAwareBuildInternalEmailHtml_(pack) {
    const html = originalBuildInternalEmailHtml_(pack);
    const stands = normaliseHireStands_(pack && pack.competitionSetup && pack.competitionSetup.stands);
    const branding = !!(pack && pack.hire && pack.hire.competitionBranding);
    const extraRows = [
      emailRow_('Setup type', hireSetupLabel_(pack)),
      emailRow_('Competition stands in use', `${stands} stand${stands === 1 ? '' : 's'}`),
      emailRow_('Competition stand branding', branding ? 'Yes — competition/event branding only' : 'No')
    ];

    if (branding) {
      extraRows.push(
        emailRow_('Branding cost', 'Additional one-off cost, charged at cost with no markup — price confirmed before ordering'),
        emailRow_('Branding payment', 'Added as a separate amount to the deposit invoice and payable before ordering'),
        emailRow_('Branding deadline', 'Competition branding and payment at least 14 days before competition')
      );
    }

    return html.replace('</table>', `${extraRows.join('')}</table>`);
  };

  this.__waimarinoHireOptionsBackendVersion = HIRE_OPTIONS_VERSION;
})();
