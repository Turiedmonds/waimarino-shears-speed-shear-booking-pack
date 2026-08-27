(() => {
  if (window.__waimarinoBoardJudgeHelpVersion) return;
  window.__waimarinoBoardJudgeHelpVersion = '1.0.1';

  const HELP_TEXT = 'A Board judge monitors competitors on the shearing board for plucking after time has stopped, early starts and false starts.';

  function installBoardJudgeHelp() {
    const select = document.getElementById('hasBoardJudge');
    const field = select?.closest('.field');
    if (!select || !field) return false;

    let help = document.getElementById('boardJudgeHelpText');
    if (!help) {
      help = document.createElement('p');
      help.id = 'boardJudgeHelpText';
      help.className = 'help-text';
      help.style.marginBottom = '0';
      select.insertAdjacentElement('afterend', help);
    }

    help.textContent = HELP_TEXT;
    return true;
  }

  function initialise(attempt = 0) {
    if (installBoardJudgeHelp()) return;
    if (attempt < 30) window.setTimeout(() => initialise(attempt + 1), 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initialise(), { once: true });
  } else {
    initialise();
  }
})();
