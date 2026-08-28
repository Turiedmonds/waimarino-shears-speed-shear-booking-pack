(() => {
  const VERSION = '1.0.0';
  if (window.__waimarinoDialogVersion === VERSION) return;
  window.__waimarinoDialogVersion = VERSION;

  const replayBypass = new WeakSet();
  const originalConfirm = window.confirm.bind(window);

  function ensureDialog() {
    let dialog = document.getElementById('waimarinoGlobalDialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'waimarinoGlobalDialog';
    dialog.className = 'ws-dialog';
    dialog.setAttribute('aria-labelledby', 'waimarinoDialogTitle');
    dialog.setAttribute('aria-describedby', 'waimarinoDialogMessage');
    dialog.innerHTML = `
      <div class="ws-dialog-card">
        <p class="ws-dialog-eyebrow">Waimarino Shears</p>
        <h2 id="waimarinoDialogTitle" class="ws-dialog-title">Confirm action</h2>
        <div id="waimarinoDialogMessage" class="ws-dialog-message"></div>
        <div id="waimarinoDialogDetail" class="ws-dialog-detail" hidden></div>
        <div class="ws-dialog-actions">
          <button id="waimarinoDialogCancel" class="ws-dialog-button ws-dialog-cancel" type="button">Cancel</button>
          <button id="waimarinoDialogConfirm" class="ws-dialog-button ws-dialog-confirm" type="button">Continue</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    return dialog;
  }

  function openDialog(options = {}) {
    const dialog = ensureDialog();
    const title = dialog.querySelector('#waimarinoDialogTitle');
    const message = dialog.querySelector('#waimarinoDialogMessage');
    const detail = dialog.querySelector('#waimarinoDialogDetail');
    const cancel = dialog.querySelector('#waimarinoDialogCancel');
    const confirm = dialog.querySelector('#waimarinoDialogConfirm');

    title.textContent = String(options.title || 'Confirm action');
    message.textContent = String(options.message || '');
    detail.textContent = String(options.detail || '');
    detail.hidden = !options.detail;
    cancel.textContent = String(options.cancelLabel || 'Cancel');
    confirm.textContent = String(options.confirmLabel || 'Continue');
    cancel.hidden = options.alertOnly === true;
    dialog.dataset.tone = String(options.tone || 'default');

    return new Promise(resolve => {
      let settled = false;

      const finish = value => {
        if (settled) return;
        settled = true;
        cleanup();
        if (dialog.open) dialog.close();
        resolve(value);
      };

      const onCancel = event => {
        event.preventDefault();
        finish(false);
      };

      const onBackdrop = event => {
        if (event.target === dialog && options.alertOnly !== true) finish(false);
      };

      const cleanup = () => {
        cancel.removeEventListener('click', onCancelClick);
        confirm.removeEventListener('click', onConfirmClick);
        dialog.removeEventListener('cancel', onCancel);
        dialog.removeEventListener('click', onBackdrop);
      };

      const onCancelClick = () => finish(false);
      const onConfirmClick = () => finish(true);

      cancel.addEventListener('click', onCancelClick);
      confirm.addEventListener('click', onConfirmClick);
      dialog.addEventListener('cancel', onCancel);
      dialog.addEventListener('click', onBackdrop);
      dialog.showModal();
      window.setTimeout(() => (options.alertOnly === true ? confirm : cancel).focus(), 0);
    });
  }

  window.WaimarinoDialog = {
    confirm(options) {
      return openDialog({ ...options, alertOnly: false });
    },
    async alert(options) {
      await openDialog({ ...options, alertOnly: true, confirmLabel: options?.confirmLabel || 'OK' });
    }
  };

  /* Alerts do not control program flow, so they can safely be replaced globally. */
  window.alert = message => {
    window.WaimarinoDialog.alert({
      title: 'Unable to complete that action',
      message: String(message || ''),
      confirmLabel: 'OK',
      tone: 'error'
    });
  };

  function isFinalRow(row) {
    if (!row) return false;
    if (row.dataset.anchor === 'final') return true;
    const select = row.querySelector('.round-name-select');
    const custom = row.querySelector('.custom-round-name')?.value.trim() || '';
    const name = select?.value === 'custom' ? custom : String(select?.value || '').trim();
    return /^final$/i.test(name);
  }

  function straightFinalCanConfirm(button) {
    const row = button.closest('.round-row[data-anchor="heats"]');
    const list = row?.closest('.round-list');
    if (!row || !list) return false;
    const rows = [...list.querySelectorAll('.round-row')];
    const finalRow = rows.find(candidate => isFinalRow(candidate));
    const extraRounds = rows.filter(candidate => candidate !== row && !isFinalRow(candidate));
    return Boolean(finalRow && extraRounds.length === 0);
  }

  function currentBookingSubmitted() {
    try {
      return typeof state !== 'undefined' && state?.booking?.status === 'submitted';
    } catch (_) {
      return false;
    }
  }

  function reviewHasWarnings() {
    try {
      return typeof validateForReview === 'function' && (validateForReview() || []).length > 0;
    } catch (_) {
      return false;
    }
  }

  function confirmationFor(target) {
    if (target.matches('#clearBookingFormBtn')) {
      return currentBookingSubmitted()
        ? {
            title: 'Clear this form?',
            message: 'Return this browser to a blank booking form?',
            detail: 'This does not cancel or change the booking you already submitted.',
            confirmLabel: 'Clear Form',
            cancelLabel: 'Keep Form',
            tone: 'warning'
          }
        : {
            title: 'Clear this booking draft?',
            message: 'Remove the information saved for this booking from this browser and start again?',
            detail: 'Other saved booking drafts will not be deleted.',
            confirmLabel: 'Clear Draft',
            cancelLabel: 'Keep Draft',
            tone: 'danger'
          };
    }

    if (target.matches('#savedBookingDraftsDialog [data-delete]')) {
      const item = target.closest('#savedBookingDraftList > div');
      const name = String(item?.querySelector('strong')?.textContent || 'this booking draft')
        .replace(/\s+—\s+Current\s*$/i, '')
        .trim();
      return {
        title: 'Delete saved draft?',
        message: `Delete “${name}” from this browser?`,
        detail: 'This removes only this saved browser draft. It does not cancel a booking already submitted to Waimarino Shears.',
        confirmLabel: 'Delete Draft',
        cancelLabel: 'Keep Draft',
        tone: 'danger'
      };
    }

    if (target.matches('#resetProgrammeBtn')) {
      return {
        title: 'Reset Programme of Events?',
        message: 'Replace the current running order with the automatically suggested default order?',
        detail: 'Any custom order you have made will be replaced.',
        confirmLabel: 'Reset Programme',
        cancelLabel: 'Keep Current Order',
        tone: 'warning'
      };
    }

    if (target.matches('.round-row[data-anchor="heats"] .remove-round-btn') && straightFinalCanConfirm(target)) {
      return {
        title: 'Run as a straight Final?',
        message: 'Remove Heats and leave this grade or event as a straight Final?',
        confirmLabel: 'Remove Heats',
        cancelLabel: 'Keep Heats',
        tone: 'warning'
      };
    }

    if (target.matches('#downloadBookingFileBtn') && reviewHasWarnings()) {
      return {
        title: 'Booking still has items to check',
        message: 'There are items listed in the review that still need attention.',
        detail: 'Do you still want to download the Booking File?',
        confirmLabel: 'Download Anyway',
        cancelLabel: 'Go Back',
        tone: 'warning'
      };
    }

    return null;
  }

  function replayClick(target) {
    replayBypass.add(target);
    const previousConfirm = window.confirm;
    window.confirm = () => true;
    try {
      target.click();
    } finally {
      window.confirm = previousConfirm || originalConfirm;
      replayBypass.delete(target);
    }
  }

  document.addEventListener('click', async event => {
    const target = event.target.closest(
      '#clearBookingFormBtn, #savedBookingDraftsDialog [data-delete], #resetProgrammeBtn, .round-row[data-anchor="heats"] .remove-round-btn, #downloadBookingFileBtn'
    );
    if (!target) return;

    if (replayBypass.has(target)) return;

    const options = confirmationFor(target);
    if (!options) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const confirmed = await window.WaimarinoDialog.confirm(options);
    if (confirmed) replayClick(target);
  }, true);

  function harmoniseExistingDialogs() {
    document.getElementById('progressionHelpDialog')?.classList.add('ws-existing-dialog');
    document.getElementById('savedBookingDraftsDialog')?.classList.add('ws-existing-dialog');
  }

  harmoniseExistingDialogs();
  new MutationObserver(harmoniseExistingDialogs).observe(document.documentElement, { childList: true, subtree: true });
})();
