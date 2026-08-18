(() => {
  const VERSION = '1.0.0';

  const style = document.createElement('style');
  style.textContent = `
    .competition-programme-row .programme-drag-handle::before{
      content:''!important;
      display:block;
      width:23px;
      height:23px;
      background-repeat:no-repeat;
      background-position:center;
      background-size:23px 23px;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23111' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4.5 4.5v15'/%3E%3Cpath d='M2.3 6.7 4.5 4.5l2.2 2.2'/%3E%3Cpath d='m2.3 17.3 2.2 2.2 2.2-2.2'/%3E%3Cpath d='M11 12V6.4a1.4 1.4 0 0 1 2.8 0v4.1'/%3E%3Cpath d='M13.8 10V8.9a1.35 1.35 0 0 1 2.7 0v2'/%3E%3Cpath d='M16.5 10.9v-.6a1.3 1.3 0 0 1 2.6 0v3.4c0 3.2-2.1 5.8-5.4 5.8h-.4c-2 0-3.3-.8-4.4-2l-1.5-1.7a1.35 1.35 0 0 1 1.9-1.9l1.7 1.4V12'/%3E%3C/svg%3E");
    }
  `;
  document.head.appendChild(style);

  function removeEmojiReferences() {
    const card = document.getElementById('competitionProgrammeCard');
    const introText = card?.querySelector('.programme-reorder-intro-row p');
    const helpText = card?.querySelector('.programme-reorder-help-text');
    if (!card || !introText || !helpText) return false;

    introText.innerHTML = '<strong>Reorder the programme:</strong> use the drag button beside the arrows to move a round several places, or use the ↑ and ↓ buttons for one-place moves.';

    helpText.innerHTML = `
      <p><strong>Important:</strong> Waimarino Shears will configure the timing system from the confirmed Programme of Events. The order needs to match how your competition will actually run on the day, so check it carefully before submitting your booking.</p>
      <p><strong>Drag:</strong> use the drag button beside the ↑ and ↓ arrows to drag a grade/event round directly to another position.</p>
      <p><strong>Touchscreen:</strong> press and drag only the drag button when you want to reorder. Swipe anywhere else on a programme row to scroll the page normally.</p>
      <p><strong>Arrows:</strong> use ↑ or ↓ to move a round one place at a time. You can place each grade/event round in the exact order required by your competition.</p>`;

    return true;
  }

  function initialise(attempt = 0) {
    if (removeEmojiReferences()) return;
    if (attempt < 40) window.setTimeout(() => initialise(attempt + 1), 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initialise(), { once: true });
  } else {
    initialise();
  }

  window.__waimarinoProgrammeDragIconSvgVersion = VERSION;
})();
