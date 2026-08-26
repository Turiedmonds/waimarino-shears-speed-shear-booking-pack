(() => {
  if (window.__waimarinoBoardJudgeHelpVersion) return;
  window.__waimarinoBoardJudgeHelpVersion = '1.0.0';

  function installBoardJudgeHelp() {
    const select = document.getElementById('hasBoardJudge');
    const field = select?.closest('.field');
    if (!select || !field || document.getElementById('boardJudgeHelpText')) return Boolean(document.getElementById('boardJudgeHelpText'));

    const help = document.createElement('p');
    help.id = 'boardJudgeHelpText';
    help.className = 'help-text';
    help.textContent = 'A Board judge monitors the shearing board for events such as early starts, false starts and plucking after time.';
    help.style.marginBottom = '0';
    select.insertAdjacentElement('afterend', help);
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
