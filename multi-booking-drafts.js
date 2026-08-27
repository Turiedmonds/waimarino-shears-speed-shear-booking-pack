(() => {
  const VERSION = '1.0.0';
  if (window.__waimarinoMultiBookingDraftsVersion) return;
  window.__waimarinoMultiBookingDraftsVersion = VERSION;

  const LEGACY_KEY = typeof STORAGE_KEY === 'undefined' ? 'waimarinoSpeedShearBookingPackDraftV1' : STORAGE_KEY;
  const PREFIX = 'waimarinoSpeedShearBookingPackDraftV2_';
  const INDEX_KEY = 'waimarinoSpeedShearBookingPackDraftIndexV2';
  const ACTIVE_KEY = 'waimarinoSpeedShearBookingPackActiveDraftV2';
  const TAB_KEY = 'waimarinoSpeedShearBookingPackTabDraftV2';
  const SKIP_KEY = 'waimarinoSpeedShearBookingPackSkipDraftOnceV2';
  const RESYNC_KEY = 'waimarinoSpeedShearBookingPackResyncGuardV2';
  let clearing = false;

  const cleanId = value => String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '');
  const keyFor = id => cleanId(id) ? `${PREFIX}${cleanId(id)}` : '';
  const parse = raw => { try { return raw ? JSON.parse(raw) : null; } catch (_) { return null; } };
  const newId = () => window.crypto?.randomUUID?.() || `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const packId = pack => cleanId(pack?.identity?.bookingId || '');
  const readIndex = () => { const value = parse(localStorage.getItem(INDEX_KEY)); return Array.isArray(value) ? value : []; };
  const writeIndex = items => { localStorage.setItem(INDEX_KEY, JSON.stringify(items.slice(0, 50))); refreshButton(); };

  function ensurePackId(pack) {
    pack.identity = pack.identity && typeof pack.identity === 'object' ? pack.identity : {};
    if (!pack.identity.bookingId) pack.identity.bookingId = newId();
    if (!pack.identity.competitionSeriesId) pack.identity.competitionSeriesId = newId();
    if (!pack.identity.createdAt) pack.identity.createdAt = new Date().toISOString();
    pack.identity.updatedAt = new Date().toISOString();
    return pack;
  }

  function metadata(pack) {
    return {
      bookingId: packId(pack),
      competitionName: String(pack?.booking?.competitionName || '').trim(),
      competitionDate: String(pack?.booking?.competitionDate || '').trim(),
      status: String(pack?.booking?.status || 'draft'),
      updatedAt: String(pack?.identity?.updatedAt || new Date().toISOString())
    };
  }

  function upsertIndex(pack) {
    const meta = metadata(pack);
    if (!meta.bookingId) return;
    writeIndex([meta, ...readIndex().filter(item => cleanId(item?.bookingId) !== meta.bookingId)]);
  }

  function currentId() {
    return cleanId(typeof state !== 'undefined' ? state?.identity?.bookingId : '') ||
      cleanId(sessionStorage.getItem(TAB_KEY)) || cleanId(localStorage.getItem(ACTIVE_KEY));
  }

  function setPointers(id) {
    const clean = cleanId(id);
    if (!clean) return;
    sessionStorage.setItem(TAB_KEY, clean);
    localStorage.setItem(ACTIVE_KEY, clean);
  }

  function writePack(pack) {
    const ready = ensurePackId(pack);
    const raw = JSON.stringify(ready);
    localStorage.setItem(keyFor(packId(ready)), raw);
    localStorage.setItem(LEGACY_KEY, raw);
    setPointers(packId(ready));
    upsertIndex(ready);
    return ready;
  }

  function saveCurrent(showMessage = true) {
    if (clearing || window.__waimarinoMultiDraftClearing) return null;
    if (typeof state !== 'undefined' && state?.booking?.status === 'submitted') return null;
    if (typeof syncStateFromForm === 'function') syncStateFromForm();
    if (typeof ensureIds === 'function') ensureIds();
    if (typeof buildPackage !== 'function') return null;
    const pack = writePack(buildPackage(false));
    if (showMessage && typeof showToast === 'function') showToast('Draft saved in this browser.');
    return pack;
  }

  function forget(id) {
    const clean = cleanId(id);
    if (!clean) return;
    localStorage.removeItem(keyFor(clean));
    writeIndex(readIndex().filter(item => cleanId(item?.bookingId) !== clean));
    if (cleanId(localStorage.getItem(ACTIVE_KEY)) === clean) localStorage.removeItem(ACTIVE_KEY);
    if (cleanId(sessionStorage.getItem(TAB_KEY)) === clean) sessionStorage.removeItem(TAB_KEY);
    if (packId(parse(localStorage.getItem(LEGACY_KEY))) === clean) localStorage.removeItem(LEGACY_KEY);
  }

  function migrateLegacy() {
    const pack = parse(localStorage.getItem(LEGACY_KEY));
    if (!pack || pack.type !== 'competition_booking_pack') return null;
    ensurePackId(pack);
    const raw = JSON.stringify(pack);
    localStorage.setItem(keyFor(packId(pack)), raw);
    localStorage.setItem(LEGACY_KEY, raw);
    setPointers(packId(pack));
    upsertIndex(pack);
    if (typeof state !== 'undefined' && !state?.identity?.bookingId) state.identity = { ...(state.identity || {}), ...(pack.identity || {}) };
    return pack;
  }

  function syncCurrentMirror() {
    if (sessionStorage.getItem(SKIP_KEY) === '1') {
      sessionStorage.removeItem(SKIP_KEY);
      sessionStorage.removeItem(RESYNC_KEY);
      sessionStorage.removeItem(TAB_KEY);
      localStorage.removeItem(ACTIVE_KEY);
      localStorage.removeItem(LEGACY_KEY);
      return false;
    }

    let desired = cleanId(sessionStorage.getItem(TAB_KEY)) || cleanId(localStorage.getItem(ACTIVE_KEY));
    if (!desired) desired = packId(migrateLegacy());
    if (!desired) return false;

    const raw = localStorage.getItem(keyFor(desired));
    if (!raw) {
      sessionStorage.removeItem(TAB_KEY);
      localStorage.removeItem(ACTIVE_KEY);
      return false;
    }

    if (packId(parse(localStorage.getItem(LEGACY_KEY))) === desired) {
      sessionStorage.removeItem(RESYNC_KEY);
      setPointers(desired);
      return false;
    }

    localStorage.setItem(LEGACY_KEY, raw);
    setPointers(desired);
    if (sessionStorage.getItem(RESYNC_KEY) !== desired) {
      sessionStorage.setItem(RESYNC_KEY, desired);
      window.location.reload();
      return true;
    }
    sessionStorage.removeItem(RESYNC_KEY);
    return false;
  }

  function esc(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function dateLabel(value) {
    if (!value) return 'Date not entered';
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('en-NZ', { dateStyle: 'medium' }).format(d);
  }

  function validDrafts() {
    return readIndex().filter(item => cleanId(item?.bookingId) && localStorage.getItem(keyFor(item.bookingId)));
  }

  function installUi() {
    const actions = document.querySelector('.header-actions');
    if (!actions) return;

    if (!document.getElementById('savedBookingDraftsBtn')) {
      const button = document.createElement('button');
      button.id = 'savedBookingDraftsBtn';
      button.className = 'button secondary';
      button.type = 'button';
      button.addEventListener('click', showDrafts);
      actions.insertBefore(button, document.getElementById('clearBookingFormBtn') || null);
      actions.classList.remove('hidden');
    }

    if (!document.getElementById('savedBookingDraftsDialog')) {
      const dialog = document.createElement('dialog');
      dialog.id = 'savedBookingDraftsDialog';
      dialog.style.cssText = 'border:0;border-radius:14px;padding:0;max-width:720px;width:min(92vw,720px)';
      dialog.innerHTML = `<div style="padding:20px;background:#fff;color:#111"><div style="display:flex;justify-content:space-between;gap:12px"><div><h3 style="margin:0">Saved booking drafts</h3><p style="margin:5px 0 0;color:#666">Each booking is saved separately in this browser.</p></div><button class="icon-button" type="button" data-close>×</button></div><div id="savedBookingDraftList" style="display:grid;gap:10px;margin-top:16px"></div><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid #ddd"><button class="button primary" type="button" data-new>Start New Booking</button><button class="button secondary" type="button" data-close>Close</button></div></div>`;
      dialog.addEventListener('click', event => {
        if (event.target.closest('[data-close]')) return dialog.close();
        if (event.target.closest('[data-new]')) return startNew();
        const open = event.target.closest('[data-open]'); if (open) return openDraft(open.dataset.open);
        const del = event.target.closest('[data-delete]'); if (del) return deleteDraft(del.dataset.delete);
      });
      document.body.appendChild(dialog);
    }

    replaceClearButton();
    refreshButton();
  }

  function refreshButton() {
    const button = document.getElementById('savedBookingDraftsBtn');
    if (!button) return;
    const count = validDrafts().length;
    button.textContent = count ? `Saved Drafts (${count})` : 'Saved Drafts';
  }

  function showDrafts() {
    try { saveCurrent(false); } catch (_) {}
    const dialog = document.getElementById('savedBookingDraftsDialog');
    const list = document.getElementById('savedBookingDraftList');
    const current = currentId();
    const items = validDrafts();
    list.innerHTML = items.length ? items.map(item => {
      const id = cleanId(item.bookingId), isCurrent = id === current;
      return `<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border:1px solid ${isCurrent ? '#EB1D27' : '#ddd'};border-radius:10px;padding:12px"><div><strong>${esc(item.competitionName || 'Untitled booking')}${isCurrent ? ' — Current' : ''}</strong><div style="color:#666;margin-top:3px">${esc(dateLabel(item.competitionDate))} · ${esc(item.status === 'submitted' ? 'Submitted' : 'Draft')}</div></div><div style="display:flex;gap:7px;flex-wrap:wrap"><button class="button secondary small" type="button" data-open="${id}">${isCurrent ? 'Reload' : 'Open'}</button><button class="button secondary small" type="button" data-delete="${id}">Delete</button></div></div>`;
    }).join('') : '<div style="padding:14px;border:1px dashed #bbb;border-radius:10px;color:#666">No saved booking drafts are stored in this browser yet.</div>';
    dialog.showModal();
  }

  function openDraft(id) {
    const clean = cleanId(id), raw = localStorage.getItem(keyFor(clean));
    if (!raw) return typeof showToast === 'function' ? showToast('That saved draft could not be found.') : undefined;
    try { saveCurrent(false); } catch (_) {}
    localStorage.setItem(LEGACY_KEY, raw);
    setPointers(clean);
    sessionStorage.setItem(RESYNC_KEY, clean);
    window.location.reload();
  }

  function startNew() {
    try { saveCurrent(false); } catch (_) {}
    clearing = true; window.__waimarinoMultiDraftClearing = true;
    sessionStorage.setItem(SKIP_KEY, '1');
    sessionStorage.removeItem(TAB_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(LEGACY_KEY);
    window.location.reload();
  }

  function deleteDraft(id) {
    const clean = cleanId(id), item = readIndex().find(entry => cleanId(entry?.bookingId) === clean);
    if (!window.confirm(`Delete the saved draft for “${item?.competitionName || 'Untitled booking'}” from this browser?`)) return;
    const isCurrent = clean === currentId();
    forget(clean);
    if (isCurrent) {
      clearing = true; window.__waimarinoMultiDraftClearing = true;
      sessionStorage.setItem(SKIP_KEY, '1');
      window.location.reload();
    } else showDrafts();
  }

  function replaceClearButton() {
    const old = document.getElementById('clearBookingFormBtn');
    if (!old || old.dataset.multiDraft === 'true') return;
    const button = old.cloneNode(true);
    button.dataset.multiDraft = 'true';
    old.replaceWith(button);
    button.addEventListener('click', () => {
      const submitted = typeof state !== 'undefined' && state.booking?.status === 'submitted';
      const message = submitted
        ? 'Clear this form from this browser and return to a blank form?\n\nThis does not cancel or change the booking you already submitted.'
        : 'Clear this form and start again?\n\nThis deletes this saved draft from this browser. Other saved booking drafts will not be deleted.';
      if (!window.confirm(message)) return;
      clearing = true; window.__waimarinoMultiDraftClearing = true;
      forget(currentId());
      localStorage.removeItem(LEGACY_KEY);
      sessionStorage.setItem(SKIP_KEY, '1');
      window.location.reload();
    });
  }

  function monitorSubmission() {
    const box = document.getElementById('submissionStatus');
    if (!box) return;
    new MutationObserver(() => {
      if (typeof state === 'undefined' || state.booking?.status !== 'submitted') return;
      forget(currentId());
      localStorage.removeItem(LEGACY_KEY);
      refreshButton();
    }).observe(box, { attributes: true, childList: true, subtree: true });
  }

  if (typeof saveDraft === 'function') {
    saveDraft = function multiBookingSaveDraft(showMessage = true) { return saveCurrent(showMessage); };
    saveDraft.__multiBookingDrafts = true;
  }

  window.bookingDraftStorageKey = id => keyFor(id || currentId());
  window.bookingDraftStartNew = startNew;

  if (syncCurrentMirror()) return;
  installUi();
  monitorSubmission();
})();
