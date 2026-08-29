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

(() => {
  const VERSION = '1.0.0';
  if (window.__waimarinoSelectVersion === VERSION) return;
  window.__waimarinoSelectVersion = VERSION;

  const WRAPPED_DATASET = 'wsCustomSelectReady';
  const WRAPPED_ATTR = 'data-ws-custom-select-ready';
  const SELECTOR = 'main select';
  let activeSelect = null;

  function installStyles() {
    if (document.getElementById('waimarinoSelectStyles')) return;
    const style = document.createElement('style');
    style.id = 'waimarinoSelectStyles';
    style.textContent = `
.ws-native-select-hidden{
  position:absolute!important;
  width:1px!important;
  height:1px!important;
  padding:0!important;
  margin:-1px!important;
  overflow:hidden!important;
  clip:rect(0 0 0 0)!important;
  white-space:nowrap!important;
  border:0!important;
  opacity:0!important;
  pointer-events:none!important;
}

.ws-select-button{
  width:100%;
  min-height:43px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:10px 11px;
  border:1px solid #bdbdbd;
  border-radius:9px;
  background:#fff;
  color:var(--text,#111);
  text-align:left;
  font:inherit;
  cursor:pointer;
}

.ws-select-button:hover:not(:disabled){
  border-color:var(--brand-2,#EB1D27);
}

.ws-select-button:focus-visible{
  outline:3px solid rgba(235,29,39,.15);
  border-color:var(--brand-2,#EB1D27);
}

.ws-select-button:disabled{
  background:#eee;
  color:#333;
  cursor:not-allowed;
  opacity:.55;
}

.ws-select-button-text{
  min-width:0;
  overflow-wrap:anywhere;
}

.ws-select-chevron{
  width:9px;
  height:9px;
  flex:0 0 9px;
  border-right:2px solid currentColor;
  border-bottom:2px solid currentColor;
  transform:rotate(45deg) translateY(-2px);
  opacity:.72;
}

.ws-select-dialog{
  width:min(560px,calc(100vw - 28px));
  max-width:560px;
}

.ws-select-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
}

.ws-select-close{
  width:36px;
  height:36px;
  flex:0 0 36px;
  display:grid;
  place-items:center;
  border:1px solid #b7b7b7;
  border-radius:9px;
  background:#fff;
  color:#222;
  font-size:1.35rem;
  line-height:1;
  cursor:pointer;
}

.ws-select-close:hover,
.ws-select-close:focus-visible{
  border-color:var(--ws-dialog-red,#EB1D27);
  color:var(--ws-dialog-red,#EB1D27);
}

.ws-select-options{
  display:grid;
  gap:8px;
  max-height:min(55vh,430px);
  overflow:auto;
  margin-top:18px;
  padding-right:2px;
  overscroll-behavior:contain;
}

.ws-select-option{
  width:100%;
  min-height:46px;
  padding:11px 13px;
  border:1px solid #d0d0d0;
  border-radius:10px;
  background:#fff;
  color:#222;
  text-align:left;
  font:inherit;
  font-weight:750;
  line-height:1.35;
  cursor:pointer;
}

.ws-select-option:hover:not(:disabled),
.ws-select-option:focus-visible{
  border-color:var(--ws-dialog-red,#EB1D27);
  background:#fff7f7;
  outline:none;
}

.ws-select-option.selected{
  border-color:var(--ws-dialog-red,#EB1D27);
  background:#fff1f2;
  color:#7c1017;
}

.ws-select-option:disabled{
  background:#f2f2f2;
  color:#777;
  cursor:not-allowed;
  opacity:.65;
}

.ws-select-actions{
  margin-top:16px;
}

@media(max-width:600px){
  .ws-select-options{max-height:52vh}
  .ws-select-option{min-height:48px}
}
    `;
    document.head.appendChild(style);
  }

  function optionLabel(option) {
    return String(option?.textContent || '').trim();
  }

  function selectLabel(select) {
    if (!select) return 'Select an option';
    const explicit = select.labels?.[0];
    if (explicit?.textContent.trim()) return explicit.textContent.trim();
    const local = select.closest('.field')?.querySelector('label');
    return local?.textContent.trim() || select.getAttribute('aria-label') || 'Select an option';
  }

  function ensureDialog() {
    let dialog = document.getElementById('waimarinoSelectDialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'waimarinoSelectDialog';
    dialog.className = 'ws-dialog ws-select-dialog';
    dialog.setAttribute('aria-labelledby', 'waimarinoSelectTitle');
    dialog.innerHTML = `
      <div class="ws-dialog-card ws-select-card">
        <p class="ws-dialog-eyebrow">Waimarino Shears</p>
        <div class="ws-select-head">
          <h2 id="waimarinoSelectTitle" class="ws-dialog-title">Select an option</h2>
          <button class="ws-select-close" type="button" aria-label="Close">×</button>
        </div>
        <div id="waimarinoSelectOptions" class="ws-select-options" role="listbox"></div>
        <div class="ws-dialog-actions ws-select-actions">
          <button class="ws-dialog-button ws-dialog-cancel" type="button" data-select-cancel>Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    const close = () => {
      if (dialog.open) dialog.close();
      activeSelect = null;
    };

    dialog.querySelector('.ws-select-close')?.addEventListener('click', close);
    dialog.querySelector('[data-select-cancel]')?.addEventListener('click', close);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) close();
    });

    return dialog;
  }

  function syncButton(select) {
    const button = select?._waimarinoSelectButton;
    if (!select || !button) return;
    const option = select.options[select.selectedIndex];
    const text = optionLabel(option) || selectLabel(select);
    button.querySelector('.ws-select-button-text').textContent = text;
    button.classList.toggle('has-value', Boolean(select.value));
    button.disabled = Boolean(select.disabled);
    button.setAttribute('aria-disabled', String(Boolean(select.disabled)));
  }

  function syncAll() {
    document.querySelectorAll(`${SELECTOR}[${WRAPPED_ATTR}]`).forEach(syncButton);
  }

  function buildOptions(select) {
    const dialog = ensureDialog();
    const title = dialog.querySelector('#waimarinoSelectTitle');
    const optionsBox = dialog.querySelector('#waimarinoSelectOptions');
    title.textContent = selectLabel(select);
    optionsBox.innerHTML = '';

    [...select.options].forEach(option => {
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.className = 'ws-select-option';
      choice.dataset.value = option.value;
      choice.setAttribute('role', 'option');
      choice.setAttribute('aria-selected', String(option.selected));
      choice.disabled = Boolean(option.disabled);
      choice.textContent = optionLabel(option) || '—';
      if (option.selected) choice.classList.add('selected');

      choice.addEventListener('click', () => {
        if (choice.disabled) return;
        const previousValue = select.value;
        select.value = option.value;
        syncButton(select);
        if (select.value !== previousValue) {
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (dialog.open) dialog.close();
        activeSelect = null;
        window.setTimeout(syncAll, 0);
      });

      optionsBox.appendChild(choice);
    });
  }

  function openPicker(select) {
    if (!select || select.disabled) return;
    const dialog = ensureDialog();
    if (typeof dialog.showModal !== 'function') return;
    activeSelect = select;
    syncButton(select);
    buildOptions(select);
    dialog.showModal();
    window.setTimeout(() => {
      const selected = dialog.querySelector('.ws-select-option.selected:not(:disabled)');
      const first = dialog.querySelector('.ws-select-option:not(:disabled)');
      (selected || first || dialog.querySelector('[data-select-cancel]'))?.focus();
    }, 0);
  }

  function decorate(select) {
    if (!(select instanceof HTMLSelectElement)) return;
    if (select.dataset[WRAPPED_DATASET] === 'true') {
      syncButton(select);
      return;
    }
    if (select.closest('dialog#waimarinoSelectDialog')) return;
    if (typeof HTMLDialogElement === 'undefined' || typeof HTMLDialogElement.prototype.showModal !== 'function') return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ws-select-button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.innerHTML = '<span class="ws-select-button-text"></span><span class="ws-select-chevron" aria-hidden="true"></span>';
    button.addEventListener('click', () => openPicker(select));

    select.dataset[WRAPPED_DATASET] = 'true';
    select.classList.add('ws-native-select-hidden');
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.insertAdjacentElement('afterend', button);
    select._waimarinoSelectButton = button;
    syncButton(select);
  }

  function scan(root = document) {
    if (root instanceof HTMLSelectElement && root.matches(SELECTOR)) decorate(root);
    root.querySelectorAll?.(SELECTOR).forEach(decorate);
  }

  function initialise() {
    installStyles();
    scan();
    const observer = new MutationObserver(mutations => {
      let needsSync = false;
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (!(node instanceof Element)) return;
            scan(node);
          });
          needsSync = true;
        }
        if (mutation.type === 'attributes' && mutation.target instanceof HTMLSelectElement) {
          decorate(mutation.target);
          needsSync = true;
        }
      });
      if (needsSync) window.setTimeout(syncAll, 0);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled']
    });

    document.addEventListener('input', event => {
      if (event.target instanceof HTMLSelectElement) syncButton(event.target);
    }, true);
    document.addEventListener('change', () => window.setTimeout(syncAll, 0), true);
    window.addEventListener('pageshow', () => window.setTimeout(syncAll, 0));
    [0, 100, 500, 1500].forEach(delay => window.setTimeout(syncAll, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
