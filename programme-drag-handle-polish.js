(() => {
  const VERSION = '1.0.0';

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
