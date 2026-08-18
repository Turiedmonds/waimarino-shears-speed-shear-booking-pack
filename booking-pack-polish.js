(() => {
  const POLISH_VERSION = '1.5.2';
  const TEAM_NAMES_KEY = 'teamEventNames';
  let rowDragState = null;

  const COPY_ROUND_HELP_TEXT = 'Use Copy Round Format when another grade or event will use the same round structure. For example, if Intermediate has already been set up as Heats, Semi-final and Final, and Senior will use the same structure, copy the Intermediate round format to Senior instead of creating it again from scratch. After copying, check the sheep per shearer and number qualifying for every round, because these can still differ between grades or events.';

  function uniqueNames(values) {
    const seen = new Set();
    return (values || []).map(value => String(value || '').trim()).filter(value => {
      const key = value.toLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function showMessage(message) {
    if (typeof showToast === 'function') showToast(message);
  }

  function installMultiTeamEvents() {
    if (typeof state === 'undefined' || typeof selectedGrades !== 'function' || typeof syncEventSections !== 'function') return false;
    const choices = document.getElementById('gradeChoices');
    const teamCheckbox = choices?.querySelector('input[value="Team"]');
    if (!choices || !teamCheckbox || document.getElementById('teamEventsWrap')) return Boolean(document.getElementById('teamEventsWrap'));

    const teamLabel = teamCheckbox.closest('label');
    if (teamLabel) {
      teamLabel.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('Team')) node.textContent = ' Team event(s)';
      });
    }

    const wrap = document.createElement('div');
    wrap.id = 'teamEventsWrap';
    wrap.className = 'team-events-wrap hidden';
    wrap.innerHTML = `
      <div class="team-events-heading">
        <div>
          <strong>Team event names</strong>
          <p class="help-text">Give each Team event its own unique name, for example “Intermediate Teams” or “Open Teams”. Each name will be treated as a separate event in the Programme of Events and timing-system setup.</p>
        </div>
        <button id="addTeamEventBtn" class="button secondary small" type="button">Add another Team event</button>
      </div>
      <div id="teamEventNameList" class="team-event-name-list"></div>`;
    choices.insertAdjacentElement('afterend', wrap);

    let teamNames = [];
    try {
      const raw = localStorage.getItem(typeof STORAGE_KEY === 'undefined' ? 'waimarinoSpeedShearBookingPackDraftV1' : STORAGE_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      teamNames = uniqueNames(saved?.competitionSetup?.[TEAM_NAMES_KEY] || state.competitionSetup?.[TEAM_NAMES_KEY] || []);
    } catch (_) {
      teamNames = uniqueNames(state.competitionSetup?.[TEAM_NAMES_KEY] || []);
    }
    if (!teamNames.length && state.competitionSetup?.events?.Team) teamNames = ['Team'];

    const otherToggle = document.getElementById('otherGradeToggle');
    const otherName = document.getElementById('otherGradeName');
    if (teamNames.length) {
      teamCheckbox.checked = true;
      if (otherToggle?.checked && teamNames.some(name => name === otherName?.value.trim())) {
        otherToggle.checked = false;
        if (otherName) otherName.value = '';
        document.getElementById('otherGradeWrap')?.classList.add('hidden');
      }
    }

    const getTeamNames = () => teamCheckbox.checked ? uniqueNames(teamNames) : [];

    const originalSelectedGrades = selectedGrades;
    selectedGrades = function selectedGradesWithTeams() {
      const names = [];
      choices.querySelectorAll('input[type="checkbox"]:checked').forEach(input => {
        if (input.value === 'Other') {
          const custom = document.getElementById('otherGradeName')?.value.trim();
          if (custom) names.push(custom);
        } else if (input.value === 'Team') {
          const currentTeams = getTeamNames();
          if (currentTeams.length) names.push(...currentTeams);
          else names.push('Team');
        } else {
          names.push(input.value);
        }
      });
      return uniqueNames(names);
    };
    selectedGrades.__multiTeamOriginal = originalSelectedGrades;

    function nextDefaultTeamName() {
      if (!teamNames.length) return 'Team';
      let number = 2;
      while (teamNames.some(name => name.toLowerCase() === `team ${number}`.toLowerCase())) number += 1;
      return `Team ${number}`;
    }

    function renderTeamRows() {
      wrap.classList.toggle('hidden', !teamCheckbox.checked);
      const list = wrap.querySelector('#teamEventNameList');
      if (!list) return;
      if (teamCheckbox.checked && !teamNames.length) teamNames = ['Team'];
      list.innerHTML = teamNames.map((name, index) => `
        <div class="team-event-name-row" data-team-index="${index}">
          <div class="field">
            <label for="teamEventName${index}">Team event ${index + 1}</label>
            <input id="teamEventName${index}" class="team-event-name-input" type="text" value="${String(name).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')}" data-old-name="${String(name).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')}" placeholder="e.g. Open Teams">
          </div>
          ${teamNames.length > 1 ? `<button class="icon-button remove-team-event-btn" type="button" aria-label="Remove Team event ${index + 1}">×</button>` : ''}
        </div>`).join('');
    }

    function saveTeamNamesToState() {
      state.competitionSetup = state.competitionSetup || {};
      state.competitionSetup[TEAM_NAMES_KEY] = getTeamNames();
    }

    function notifyStructureChanged() {
      saveTeamNamesToState();
      choices.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function migrateTeamEventName(oldName, newName) {
      if (!oldName || !newName || oldName === newName) return;
      let current = {};
      try { current = typeof collectEventsFromDom === 'function' ? collectEventsFromDom() : {}; } catch (_) {}
      const existing = current[oldName] || state.competitionSetup?.events?.[oldName];
      if (existing) {
        state.competitionSetup = state.competitionSetup || {};
        state.competitionSetup.events = state.competitionSetup.events || {};
        state.competitionSetup.events[newName] = JSON.parse(JSON.stringify(existing));
        delete state.competitionSetup.events[oldName];
      }
    }

    teamCheckbox.addEventListener('change', () => {
      if (teamCheckbox.checked && !teamNames.length) teamNames = ['Team'];
      if (!teamCheckbox.checked) teamNames = [];
      renderTeamRows();
      saveTeamNamesToState();
    });

    wrap.querySelector('#addTeamEventBtn')?.addEventListener('click', () => {
      if (!teamCheckbox.checked) teamCheckbox.checked = true;
      teamNames.push(nextDefaultTeamName());
      renderTeamRows();
      notifyStructureChanged();
      const inputs = wrap.querySelectorAll('.team-event-name-input');
      const newest = inputs[inputs.length - 1];
      newest?.focus();
      newest?.select();
    });

    wrap.addEventListener('change', event => {
      const input = event.target.closest('.team-event-name-input');
      if (!input) return;
      const row = input.closest('.team-event-name-row');
      const index = Number.parseInt(row?.dataset.teamIndex, 10);
      if (!Number.isInteger(index)) return;
      const oldName = String(input.dataset.oldName || teamNames[index] || '').trim();
      let newName = input.value.trim();
      if (!newName) {
        newName = oldName || nextDefaultTeamName();
        input.value = newName;
        showMessage('Each Team event needs a name.');
      }
      const duplicate = teamNames.some((name, i) => i !== index && name.toLowerCase() === newName.toLowerCase());
      if (duplicate) {
        input.value = oldName;
        showMessage('Team event names must be unique.');
        return;
      }
      migrateTeamEventName(oldName, newName);
      teamNames[index] = newName;
      input.dataset.oldName = newName;
      renderTeamRows();
      notifyStructureChanged();
    });

    wrap.addEventListener('click', event => {
      const remove = event.target.closest('.remove-team-event-btn');
      if (!remove) return;
      const row = remove.closest('.team-event-name-row');
      const index = Number.parseInt(row?.dataset.teamIndex, 10);
      if (!Number.isInteger(index) || teamNames.length <= 1) return;
      const removedName = teamNames[index];
      teamNames.splice(index, 1);
      if (state.competitionSetup?.events) delete state.competitionSetup.events[removedName];
      renderTeamRows();
      notifyStructureChanged();
    });

    if (typeof buildPackage === 'function') {
      const previousBuildPackage = buildPackage;
      buildPackage = function buildPackageWithTeamNames(submitted = false) {
        saveTeamNamesToState();
        const pack = previousBuildPackage(submitted);
        pack.competitionSetup = pack.competitionSetup || {};
        pack.competitionSetup[TEAM_NAMES_KEY] = getTeamNames();
        return pack;
      };
    }

    renderTeamRows();
    saveTeamNamesToState();
    if (teamCheckbox.checked && teamNames.length) {
      try { syncEventSections(); } catch (_) {}
    }
    return true;
  }

  function moveRowUsingButtons(fromIndex, toIndex) {
    if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex) || fromIndex === toIndex) return;
    let current = fromIndex;
    const direction = toIndex > fromIndex ? 'down' : 'up';
    while (current !== toIndex) {
      const row = document.querySelector(`#competitionProgrammeList .competition-programme-row[data-index="${current}"]`);
      const button = row?.querySelector(`.programme-move-btn[data-move="${direction}"]`);
      if (!button || button.disabled) break;
      button.click();
      current += direction === 'down' ? 1 : -1;
    }
  }

  function clearDragTargets(list) {
    list?.querySelectorAll('.programme-drag-target-before, .programme-drag-target-after').forEach(row => {
      row.classList.remove('programme-drag-target-before', 'programme-drag-target-after');
    });
  }

  function installProgrammeHelp(card) {
    if (!card || card.dataset.reorderHelpInstalled === 'true') return;
    card.dataset.reorderHelpInstalled = 'true';

    const heading = card.querySelector('.competition-programme-heading');
    const guidance = heading?.nextElementSibling;
    if (!guidance) return;

    const oldBottomHelp = card.querySelector('.help-text.no-print');
    oldBottomHelp?.remove();

    const intro = document.createElement('div');
    intro.className = 'programme-reorder-intro no-print';
    intro.innerHTML = `
      <div class="programme-reorder-intro-row">
        <p><strong>Reorder the programme:</strong> drag the grade/event and round text to move it several places, or use the ↑ and ↓ buttons for one-place moves.</p>
        <button type="button" class="programme-reorder-help" aria-label="Help with Programme of Events reordering" aria-expanded="false" title="How does Programme of Events reordering work?">?</button>
      </div>
      <div class="programme-reorder-help-text hidden">
        <p>The confirmed Programme of Events tells the timing system which grade/event round comes next, so the order needs to match how your competition will actually run on the day.</p>
        <p><strong>Mouse:</strong> point to the grade/event and round text until the grab cursor appears, then drag it to the required position.</p>
        <p><strong>Touchscreen:</strong> press and drag the grade/event and round text. To scroll the page normally, swipe on the number or blank area of a programme row instead.</p>
        <p><strong>Arrows:</strong> use ↑ or ↓ to move a round one place at a time. You can place any grade/event round in the exact order required by your competition.</p>
      </div>`;

    guidance.insertAdjacentElement('afterend', intro);
    const helpButton = intro.querySelector('.programme-reorder-help');
    const helpText = intro.querySelector('.programme-reorder-help-text');
    helpButton?.addEventListener('click', () => {
      const opening = helpText?.classList.contains('hidden');
      helpText?.classList.toggle('hidden', !opening);
      helpButton.setAttribute('aria-expanded', String(Boolean(opening)));
    });
  }

  function refreshCopyRoundHelpText() {
    document.querySelectorAll('.copy-round-format-help-text').forEach(help => {
      help.textContent = COPY_ROUND_HELP_TEXT;
    });
  }

  function scheduleCopyRoundHelpTextRefresh() {
    window.setTimeout(refreshCopyRoundHelpText, 60);
  }

  function installTextAreaDrag() {
    const list = document.getElementById('competitionProgrammeList');
    const card = document.getElementById('competitionProgrammeCard');
    if (!list || !card || list.dataset.textAreaDrag === 'true') return Boolean(list?.dataset.textAreaDrag === 'true');
    list.dataset.textAreaDrag = 'true';
    installProgrammeHelp(card);

    list.addEventListener('pointerdown', event => {
      if (event.button > 0) return;
      const dragArea = event.target.closest('.programme-label');
      if (!dragArea) return;
      const row = dragArea.closest('.competition-programme-row');
      if (!row) return;
      const fromIndex = Number.parseInt(row.dataset.index, 10);
      if (!Number.isInteger(fromIndex)) return;

      event.preventDefault();
      try { dragArea.setPointerCapture(event.pointerId); } catch (_) {}
      rowDragState = {
        pointerId: event.pointerId,
        dragArea,
        row,
        fromIndex,
        startY: event.clientY,
        targetIndex: fromIndex,
        position: 'before',
        moved: false
      };
      row.classList.add('programme-row-dragging');
      document.body.classList.add('programme-reordering');
    }, true);

    list.addEventListener('pointermove', event => {
      if (!rowDragState || event.pointerId !== rowDragState.pointerId) return;
      event.preventDefault();
      if (!rowDragState.moved && Math.abs(event.clientY - rowDragState.startY) < 8) return;

      const rows = [...list.querySelectorAll('.competition-programme-row')].filter(row => row !== rowDragState.row);
      if (!rows.length) return;

      let closest = null;
      let distance = Infinity;
      rows.forEach(row => {
        const rect = row.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const candidate = Math.abs(event.clientY - center);
        if (candidate < distance) {
          distance = candidate;
          closest = { row, center };
        }
      });
      if (!closest) return;

      const targetIndex = Number.parseInt(closest.row.dataset.index, 10);
      const position = event.clientY < closest.center ? 'before' : 'after';
      clearDragTargets(list);
      closest.row.classList.add(position === 'before' ? 'programme-drag-target-before' : 'programme-drag-target-after');
      rowDragState.targetIndex = targetIndex;
      rowDragState.position = position;
      rowDragState.moved = true;

      if (event.clientY < 80) window.scrollBy({ top: -18, behavior: 'auto' });
      if (event.clientY > window.innerHeight - 80) window.scrollBy({ top: 18, behavior: 'auto' });
    }, true);

    function finish(event, cancelled = false) {
      if (!rowDragState || event.pointerId !== rowDragState.pointerId) return;
      const drag = rowDragState;
      rowDragState = null;
      clearDragTargets(list);
      drag.row.classList.remove('programme-row-dragging');
      document.body.classList.remove('programme-reordering');
      try { drag.dragArea.releasePointerCapture(event.pointerId); } catch (_) {}
      if (cancelled || !drag.moved) return;

      let insertIndex = drag.targetIndex + (drag.position === 'after' ? 1 : 0);
      if (insertIndex > drag.fromIndex) insertIndex -= 1;
      const maxIndex = Math.max(0, list.querySelectorAll('.competition-programme-row').length - 1);
      insertIndex = Math.max(0, Math.min(insertIndex, maxIndex));
      moveRowUsingButtons(drag.fromIndex, insertIndex);
    }

    list.addEventListener('pointerup', event => finish(event, false), true);
    list.addEventListener('pointercancel', event => finish(event, true), true);
    return true;
  }

  const style = document.createElement('style');
  style.textContent = `
    .programme-drag-handle{display:none!important}
    .competition-programme-row{grid-template-columns:38px minmax(0,1fr) auto!important;cursor:default;touch-action:pan-y}
    .competition-programme-row .programme-label{cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
    .competition-programme-row.programme-row-dragging .programme-label{cursor:grabbing}
    .competition-programme-row .programme-move-actions{cursor:default}
    .competition-programme-row .programme-move-btn{cursor:pointer}
    .programme-reorder-intro{margin:10px 0 14px;padding:11px 12px;border:1px solid var(--line,#ddd);border-left:4px solid var(--brand-2);border-radius:9px;background:#fafafa}
    .programme-reorder-intro-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
    .programme-reorder-intro-row p{margin:0}
    .programme-reorder-help{display:inline-grid;place-items:center;flex:0 0 auto;width:30px;height:30px;border:1px solid #999;border-radius:50%;background:#fff;color:#444;font-weight:900;line-height:1;cursor:pointer}
    .programme-reorder-help:hover{border-color:var(--brand-2);color:var(--brand-2)}
    .programme-reorder-help-text{margin-top:10px;padding-top:10px;border-top:1px solid var(--line,#ddd)}
    .programme-reorder-help-text p{margin:0 0 8px;color:#444;font-size:.92rem}
    .programme-reorder-help-text p:last-child{margin-bottom:0}
    .team-events-wrap{margin-top:12px;padding:14px;border:1px solid var(--line,#ddd);border-radius:10px;background:var(--surface-soft,#fafafa)}
    .team-events-wrap.hidden{display:none}
    .team-events-heading{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}
    .team-events-heading p{margin:4px 0 0;max-width:760px}
    .team-event-name-list{display:grid;gap:10px;margin-top:12px}
    .team-event-name-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}
    .team-event-name-row .field{margin:0}
    @media(max-width:700px){.competition-programme-row{grid-template-columns:34px minmax(0,1fr)!important}.programme-sequence{grid-row:1 / span 2}.programme-label{grid-column:2}.programme-move-actions{grid-column:2}.team-event-name-row{grid-template-columns:1fr auto}.programme-reorder-intro-row{align-items:center}}
  `;
  document.head.appendChild(style);

  function initialise() {
    installMultiTeamEvents();
    if (!installTextAreaDrag()) window.setTimeout(initialise, 80);
    scheduleCopyRoundHelpTextRefresh();
  }

  const gradeChoices = document.getElementById('gradeChoices');
  const eventConfigs = document.getElementById('eventConfigs');
  gradeChoices?.addEventListener('change', scheduleCopyRoundHelpTextRefresh);
  eventConfigs?.addEventListener('input', scheduleCopyRoundHelpTextRefresh);
  eventConfigs?.addEventListener('change', scheduleCopyRoundHelpTextRefresh);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialise, { once: true });
  else initialise();

  window.__waimarinoBookingPackPolishVersion = POLISH_VERSION;
})();
