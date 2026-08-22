(() => {
  if (window.__waimarinoCleanShearTimeUiVersion) return;
  window.__waimarinoCleanShearTimeUiVersion = '1.0.1';

  if (typeof renderEventSection !== 'function' || typeof validateForReview !== 'function' || typeof buildReview !== 'function') return;

  const ITEM_HEIGHT = 44;
  let pickerCounter = 0;

  const style = document.createElement('style');
  style.textContent = `
    .clean-time-wrap{grid-column:span 2}
    .clean-time-question{margin:0 0 8px;font-weight:700}
    .clean-time-help{margin:0 0 12px;color:#555;line-height:1.45;font-size:.93rem}
    .clean-time-choice{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
    .clean-time-choice label{display:flex;align-items:center;gap:7px;border:1px solid #cfcfcf;border-radius:10px;padding:9px 13px;background:#fff;cursor:pointer;font-weight:700;text-transform:none}
    .clean-time-choice input{margin:0}
    .clean-time-picker{display:flex;align-items:flex-start;gap:18px;flex-wrap:wrap;margin-top:8px}
    .clean-time-wheel-group{min-width:112px}
    .clean-time-wheel-label{display:block;margin:0 0 6px;font-size:.82rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#555}
    .clean-time-wheel{position:relative;width:112px;height:${ITEM_HEIGHT * 3}px;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior:contain;border:1px solid #cfcfcf;border-radius:12px;background:#fff;padding:${ITEM_HEIGHT}px 0;box-sizing:border-box;scrollbar-width:thin}
    .clean-time-wheel::before{content:'';position:sticky;display:block;top:${ITEM_HEIGHT}px;height:${ITEM_HEIGHT}px;margin-top:-${ITEM_HEIGHT}px;border-top:2px solid #c1121f;border-bottom:2px solid #c1121f;background:rgba(193,18,31,.04);pointer-events:none;z-index:2}
    .clean-time-wheel-option{height:${ITEM_HEIGHT}px;display:flex;align-items:center;justify-content:center;scroll-snap-align:center;font-size:1.15rem;font-weight:700;color:#666;cursor:pointer;user-select:none}
    .clean-time-wheel-option[aria-selected="true"]{color:#111;font-size:1.35rem;font-weight:900}
    .clean-time-summary{min-width:220px;align-self:center;border-left:4px solid #c1121f;padding:9px 12px;background:#fff7f7;border-radius:7px;font-weight:800}
    .clean-time-summary small{display:block;margin-top:3px;font-weight:500;color:#555}
    .clean-time-input.clean-time-source{display:none!important}
    @media(max-width:700px){.clean-time-wrap{grid-column:1/-1}.clean-time-picker{gap:12px}.clean-time-wheel,.clean-time-wheel-group{width:100px;min-width:100px}.clean-time-summary{width:100%;min-width:0}}
  `;
  document.head.appendChild(style);

  function parseLimit(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;
    if (/^\d+$/.test(text)) {
      const total = Number.parseInt(text, 10);
      if (!Number.isFinite(total) || total <= 0) return null;
      return { minutes: Math.floor(total / 60), seconds: total % 60 };
    }
    if (/^\d{1,2}:\d{2}$/.test(text)) {
      const [minutes, seconds] = text.split(':').map(Number);
      if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || minutes < 0 || minutes > 99 || seconds < 0 || seconds > 59) return null;
      if ((minutes * 60) + seconds <= 0) return null;
      return { minutes, seconds };
    }
    return null;
  }

  function serialiseLimit(minutes, seconds) {
    const mm = Math.max(0, Math.min(99, Number(minutes) || 0));
    const ss = Math.max(0, Math.min(59, Number(seconds) || 0));
    if ((mm * 60) + ss <= 0) return '';
    return `${mm}:${String(ss).padStart(2, '0')}`;
  }

  function humanLimit(raw) {
    const parsed = parseLimit(raw);
    if (!parsed) return '';
    const parts = [];
    if (parsed.minutes) parts.push(`${parsed.minutes} min`);
    if (parsed.seconds || !parsed.minutes) parts.push(`${parsed.seconds} sec`);
    return parts.join(' ');
  }

  function setSourceValue(input, value) {
    if (!input) return;
    const next = String(value || '');
    if (input.value === next) return;
    input.value = next;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function makeWheel(values, initialValue, onSelect, ariaLabel) {
    const wheel = document.createElement('div');
    wheel.className = 'clean-time-wheel';
    wheel.setAttribute('role', 'listbox');
    wheel.setAttribute('aria-label', ariaLabel);
    wheel.tabIndex = 0;

    values.forEach((value, index) => {
      const option = document.createElement('div');
      option.className = 'clean-time-wheel-option';
      option.setAttribute('role', 'option');
      option.dataset.index = String(index);
      option.dataset.value = String(value.value);
      option.textContent = value.label;
      option.addEventListener('click', () => selectIndex(index, true));
      wheel.appendChild(option);
    });

    let selectedIndex = Math.max(0, values.findIndex(item => Number(item.value) === Number(initialValue)));
    let settleTimer = null;

    function paint() {
      [...wheel.children].forEach((option, index) => {
        option.setAttribute('aria-selected', index === selectedIndex ? 'true' : 'false');
      });
    }

    function selectIndex(index, smooth = false, notify = true) {
      selectedIndex = Math.max(0, Math.min(values.length - 1, index));
      paint();
      wheel.scrollTo({ top: selectedIndex * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' });
      if (notify) onSelect(values[selectedIndex].value);
    }

    wheel.addEventListener('scroll', () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        const index = Math.max(0, Math.min(values.length - 1, Math.round(wheel.scrollTop / ITEM_HEIGHT)));
        selectIndex(index, false, true);
      }, 90);
    }, { passive: true });

    wheel.addEventListener('keydown', event => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      event.preventDefault();
      selectIndex(selectedIndex + (event.key === 'ArrowDown' ? 1 : -1), true, true);
    });

    window.setTimeout(() => selectIndex(selectedIndex, false, false), 0);
    return { element: wheel, setValue(value) { const index = values.findIndex(item => Number(item.value) === Number(value)); if (index >= 0) selectIndex(index, false, false); } };
  }

  function findEventSection(name) {
    return [...document.querySelectorAll('#eventConfigs .event-card')]
      .find(section => section.dataset.event === name) || null;
  }

  function decorateSection(section) {
    if (!section || section.dataset.cleanTimeUiReady === 'true') return;
    const cleanSelect = section.querySelector('.clean-shear-select');
    const wrap = section.querySelector('.clean-time-wrap');
    const sourceInput = wrap?.querySelector('.clean-time-input');
    const sourceLabel = wrap?.querySelector('label');
    if (!cleanSelect || !wrap || !sourceInput) return;

    section.dataset.cleanTimeUiReady = 'true';
    if (sourceLabel) sourceLabel.textContent = 'Maximum clean shear time-limit rule';
    sourceInput.classList.add('clean-time-source');
    sourceInput.type = 'hidden';
    sourceInput.removeAttribute('placeholder');

    const existing = parseLimit(sourceInput.value);
    const id = ++pickerCounter;
    const name = `clean-time-limit-${id}`;

    const ui = document.createElement('div');
    ui.innerHTML = `
      <p class="clean-time-question">Does this clean shear use a maximum time limit?</p>
      <p class="clean-time-help">Some clean shear competitions use a maximum time limit and some do not. If a maximum time limit applies, a competitor whose recorded time goes over that limit is disqualified by the timing system.</p>
      <div class="clean-time-choice" role="radiogroup" aria-label="Maximum clean shear time limit">
        <label><input type="radio" name="${name}" value="yes"> Yes</label>
        <label><input type="radio" name="${name}" value="no"> No</label>
      </div>
      <div class="clean-time-picker hidden">
        <div class="clean-time-wheel-group"><span class="clean-time-wheel-label">Minutes</span><div data-wheel="minutes"></div></div>
        <div class="clean-time-wheel-group"><span class="clean-time-wheel-label">Seconds</span><div data-wheel="seconds"></div></div>
        <div class="clean-time-summary" aria-live="polite"></div>
      </div>
    `;
    sourceInput.insertAdjacentElement('afterend', ui);

    const yesRadio = ui.querySelector('input[value="yes"]');
    const noRadio = ui.querySelector('input[value="no"]');
    const picker = ui.querySelector('.clean-time-picker');
    const summary = ui.querySelector('.clean-time-summary');
    let minutes = existing?.minutes ?? 0;
    let seconds = existing?.seconds ?? 0;

    const minuteValues = Array.from({ length: 100 }, (_, value) => ({ value, label: String(value) }));
    const secondValues = Array.from({ length: 60 }, (_, value) => ({ value, label: String(value).padStart(2, '0') }));

    function updateSummary() {
      const value = serialiseLimit(minutes, seconds);
      if (!value) {
        summary.innerHTML = 'Select a time above 0:00<small>The timing system needs a positive maximum time when this rule is used.</small>';
        return;
      }
      summary.innerHTML = `Maximum clean shear time: ${humanLimit(value)}<small>Saved to the timing system as ${value} (minutes:seconds).</small>`;
    }

    function syncWheels() {
      const value = serialiseLimit(minutes, seconds);
      setSourceValue(sourceInput, value);
      updateSummary();
    }

    const minuteWheel = makeWheel(minuteValues, minutes, value => { minutes = Number(value); syncWheels(); }, 'Minutes');
    const secondWheel = makeWheel(secondValues, seconds, value => { seconds = Number(value); syncWheels(); }, 'Seconds');
    ui.querySelector('[data-wheel="minutes"]').replaceWith(minuteWheel.element);
    ui.querySelector('[data-wheel="seconds"]').replaceWith(secondWheel.element);

    function setChoice(choice) {
      section.dataset.cleanTimeLimitChoice = choice || '';
      yesRadio.checked = choice === 'yes';
      noRadio.checked = choice === 'no';
      picker.classList.toggle('hidden', choice !== 'yes');
      if (choice === 'no') {
        setSourceValue(sourceInput, '');
      } else if (choice === 'yes') {
        syncWheels();
      }
    }

    yesRadio.addEventListener('change', () => { if (yesRadio.checked) setChoice('yes'); });
    noRadio.addEventListener('change', () => { if (noRadio.checked) setChoice('no'); });

    cleanSelect.addEventListener('change', () => {
      if (cleanSelect.value !== 'yes') {
        setChoice('');
        setSourceValue(sourceInput, '');
      }
    });

    if (existing) {
      setChoice('yes');
      minuteWheel.setValue(existing.minutes);
      secondWheel.setValue(existing.seconds);
      updateSummary();
    } else {
      setChoice('');
      updateSummary();
    }
  }

  const originalRenderEventSection = renderEventSection;
  renderEventSection = function cleanTimeAwareRenderEventSection(name, data) {
    originalRenderEventSection(name, data);
    decorateSection(findEventSection(name));
  };

  const originalValidateForReview = validateForReview;
  validateForReview = function cleanTimeAwareValidateForReview() {
    const warnings = originalValidateForReview().filter(warning => !/clean shear is enabled but no time limit has been entered/i.test(String(warning)));
    const events = Object.entries(state?.competitionSetup?.events || {});
    events.forEach(([eventName, event]) => {
      if (!event?.cleanShear) return;
      const section = findEventSection(eventName);
      const choice = section?.dataset.cleanTimeLimitChoice || (String(event.cleanShearTimeLimit || '').trim() ? 'yes' : '');
      if (!choice) {
        warnings.push(`${eventName}: choose whether this clean shear uses a maximum time limit.`);
        return;
      }
      if (choice === 'yes' && !parseLimit(event.cleanShearTimeLimit)) {
        warnings.push(`${eventName}: set the maximum clean shear time.`);
      }
    });
    return warnings;
  };

  const originalBuildReview = buildReview;
  buildReview = function cleanTimeAwareBuildReview() {
    originalBuildReview();
    const entries = Object.entries(state?.competitionSetup?.events || {});
    const cards = [...document.querySelectorAll('#reviewContent .review-event')];
    entries.forEach(([eventName, event], index) => {
      const card = cards[index];
      const paragraph = card?.querySelector('p');
      if (!paragraph) return;
      let cleanText = 'No';
      if (event.cleanShear) {
        const human = humanLimit(event.cleanShearTimeLimit);
        const section = findEventSection(eventName);
        const choice = section?.dataset.cleanTimeLimitChoice || (human ? 'yes' : '');
        if (human) cleanText = `Yes — maximum time ${human}`;
        else if (choice === 'no') cleanText = 'Yes — no maximum time limit';
        else cleanText = 'Yes — time-limit rule not selected';
      }
      paragraph.innerHTML = `<strong>Clean shear:</strong> ${escapeHtml(cleanText)} &nbsp; <strong>Prize placings:</strong> ${escapeHtml(event.prizePlacings || '—')}`;
    });
  };

  document.querySelectorAll('#eventConfigs .event-card').forEach(decorateSection);
})();
