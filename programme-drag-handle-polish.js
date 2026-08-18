(() => {
  const VERSION = '1.1.0';
  let dragState = null;

  const style = document.createElement('style');
  style.textContent = `
    .competition-programme-row{
      grid-template-columns:38px minmax(0,1fr) auto 40px!important;
      cursor:default!important;
      touch-action:pan-y!important;
    }
    .competition-programme-row .programme-sequence{
      grid-column:1!important;
      grid-row:1!important;
    }
    .competition-programme-row .programme-label{
      grid-column:2!important;
      grid-row:1!important;
      cursor:default!important;
      touch-action:pan-y!important;
      pointer-events:none;
      user-select:auto!important;
      -webkit-user-select:auto!important;
    }
    .competition-programme-row .programme-move-actions{
      grid-column:3!important;
      grid-row:1!important;
    }
    .competition-programme-row .programme-drag-handle{
      display:grid!important;
      place-items:center;
      grid-column:4!important;
      grid-row:1!important;
      width:38px;
      height:36px;
      padding:0;
      border:1px solid #aaa;
      border-radius:8px;
      background:#fff;
      color:#111;
      font-size:0!important;
      cursor:grab!important;
      touch-action:none!important;
      user-select:none!important;
      -webkit-user-select:none!important;
      -webkit-touch-callout:none!important;
    }
    .competition-programme-row .programme-drag-handle::before{
      content:'👆';
      font-size:20px;
      line-height:1;
    }
    .competition-programme-row .programme-drag-handle:active{
      cursor:grabbing!important;
    }
    .competition-programme-row.programme-row-dragging .programme-label{
      cursor:default!important;
    }
    @media(max-width:700px){
      .competition-programme-row{
        grid-template-columns:34px minmax(0,1fr) auto 38px!important;
      }
      .competition-programme-row .programme-sequence{
        grid-column:1!important;
        grid-row:1!important;
      }
      .competition-programme-row .programme-label{
        grid-column:2!important;
        grid-row:1!important;
      }
      .competition-programme-row .programme-move-actions{
        grid-column:3!important;
        grid-row:1!important;
      }
      .competition-programme-row .programme-drag-handle{
        grid-column:4!important;
        grid-row:1!important;
      }
    }
  `;
  document.head.appendChild(style);

  function tidyProgrammeHelp() {
    const card = document.getElementById('competitionProgrammeCard');
    const intro = card?.querySelector('.programme-reorder-intro');
    const introText = intro?.querySelector('.programme-reorder-intro-row p');
    const helpText = intro?.querySelector('.programme-reorder-help-text');
    if (!card || !intro || !introText || !helpText) return false;

    introText.innerHTML = '<strong>Reorder the programme:</strong> use the 👆 drag button beside the arrows to move a round several places, or use the ↑ and ↓ buttons for one-place moves.';

    helpText.innerHTML = `
      <p><strong>Important:</strong> Waimarino Shears will configure the timing system from the confirmed Programme of Events. The order needs to match how your competition will actually run on the day, so check it carefully before submitting your booking.</p>
      <p><strong>Drag:</strong> use the 👆 button beside the ↑ and ↓ arrows to drag a grade/event round directly to another position.</p>
      <p><strong>Touchscreen:</strong> press and drag only the 👆 button when you want to reorder. Swipe anywhere else on a programme row to scroll the page normally.</p>
      <p><strong>Arrows:</strong> use ↑ or ↓ to move a round one place at a time. You can place each grade/event round in the exact order required by your competition.</p>`;

    card.querySelector('.programme-order-warning')?.remove();
    return true;
  }

  function refreshHandleTitles() {
    document.querySelectorAll('#competitionProgrammeList .programme-drag-handle').forEach(handle => {
      handle.title = 'Drag to reorder';
    });
  }

  function clearDragTargets() {
    document.querySelectorAll('#competitionProgrammeList .programme-drag-target-before, #competitionProgrammeList .programme-drag-target-after').forEach(row => {
      row.classList.remove('programme-drag-target-before', 'programme-drag-target-after');
    });
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
    refreshHandleTitles();
  }

  function beginHandleDrag(event) {
    const row = event.target.closest('#competitionProgrammeList .competition-programme-row');
    if (!row) return;

    const moveButton = event.target.closest('.programme-move-btn');
    if (moveButton) return;

    const handle = event.target.closest('.programme-drag-handle');
    if (!handle) {
      event.stopPropagation();
      return;
    }

    if (event.button > 0) return;
    event.stopPropagation();
    event.preventDefault();

    const fromIndex = Number.parseInt(row.dataset.index, 10);
    if (!Number.isInteger(fromIndex)) return;

    dragState = {
      pointerId: event.pointerId,
      row,
      fromIndex,
      startY: event.clientY,
      targetIndex: fromIndex,
      position: 'before',
      moved: false
    };

    row.classList.add('programme-row-dragging');
    document.body.classList.add('programme-reordering');
  }

  function updateHandleDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    event.stopPropagation();
    event.preventDefault();

    if (!dragState.moved && Math.abs(event.clientY - dragState.startY) < 8) return;

    const rows = [...document.querySelectorAll('#competitionProgrammeList .competition-programme-row')]
      .filter(row => row !== dragState.row);
    if (!rows.length) return;

    let closest = null;
    let closestDistance = Infinity;
    rows.forEach(row => {
      const rect = row.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(event.clientY - center);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = { row, center };
      }
    });
    if (!closest) return;

    const targetIndex = Number.parseInt(closest.row.dataset.index, 10);
    const position = event.clientY < closest.center ? 'before' : 'after';
    clearDragTargets();
    closest.row.classList.add(position === 'before' ? 'programme-drag-target-before' : 'programme-drag-target-after');
    dragState.targetIndex = targetIndex;
    dragState.position = position;
    dragState.moved = true;

    if (event.clientY < 80) window.scrollBy({ top: -18, behavior: 'auto' });
    if (event.clientY > window.innerHeight - 80) window.scrollBy({ top: 18, behavior: 'auto' });
  }

  function finishHandleDrag(event, cancelled = false) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    event.stopPropagation();

    const drag = dragState;
    dragState = null;
    clearDragTargets();
    drag.row.classList.remove('programme-row-dragging');
    document.body.classList.remove('programme-reordering');

    if (cancelled || !drag.moved) return;

    let insertIndex = drag.targetIndex + (drag.position === 'after' ? 1 : 0);
    if (insertIndex > drag.fromIndex) insertIndex -= 1;
    const maxIndex = Math.max(0, document.querySelectorAll('#competitionProgrammeList .competition-programme-row').length - 1);
    insertIndex = Math.max(0, Math.min(insertIndex, maxIndex));
    moveRowUsingButtons(drag.fromIndex, insertIndex);
  }

  document.addEventListener('pointerdown', beginHandleDrag, true);
  document.addEventListener('pointermove', updateHandleDrag, true);
  document.addEventListener('pointerup', event => finishHandleDrag(event, false), true);
  document.addEventListener('pointercancel', event => finishHandleDrag(event, true), true);

  function initialise(attempt = 0) {
    const ready = tidyProgrammeHelp();
    refreshHandleTitles();
    if (!ready && attempt < 40) window.setTimeout(() => initialise(attempt + 1), 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initialise(), { once: true });
  } else {
    initialise();
  }

  window.__waimarinoProgrammeDragHandlePolishVersion = VERSION;
})();
