/* proHUB safety net: automatic snapshots of everything saved in this browser,
   a history panel to restore or download them, and optional auto-save to a folder. */
(function () {
  if (window.PHSafety) return;
  var DB = 'prohub-safety', ST = 'snaps', META = 'meta', MAX_AUTO = 20, MAX_MANUAL = 30, EVERY = 120000;
  var SKIP = /tmdb_key/i, lastHash = null, timer = null;

  function open() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB, 2);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains(ST)) d.createObjectStore(ST, { keyPath: 'id' });
        if (!d.objectStoreNames.contains(META)) d.createObjectStore(META);
      };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function run(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(store, mode), s = t.objectStore(store), req = fn(s);
        t.oncomplete = function () { res(req ? req.result : undefined); db.close(); };
        t.onerror = t.onabort = function () { rej(t.error); db.close(); };
      });
    });
  }
  function dump() {
    var k = {};
    try { for (var i = 0; i < localStorage.length; i++) { var n = localStorage.key(i); if (!SKIP.test(n)) k[n] = localStorage.getItem(n); } } catch (e) {}
    return k;
  }
  function projectName() {
    try { var p = JSON.parse(localStorage.getItem('prehub_v3') || '{}'); return p.projectName || 'project'; } catch (e) { return 'project'; }
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + ':' + s.length; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
  function pkg(snap) { return { app: 'stellar-nursery-master', v: 1, exported: snap.t, project: snap.name, keys: JSON.parse(snap.data) }; }

  function prune() {
    return run(ST, 'readonly', function (s) { return s.getAll(); }).then(function (all) {
      all.sort(function (a, b) { return b.id - a.id; });
      var autos = all.filter(function (x) { return x.auto; }), manual = all.filter(function (x) { return !x.auto; });
      var drop = autos.slice(MAX_AUTO).concat(manual.slice(MAX_MANUAL));
      if (!drop.length) return;
      return run(ST, 'readwrite', function (s) { drop.forEach(function (x) { s.delete(x.id); }); });
    });
  }
  function snapshot(reason, auto) {
    var keys = dump(), json = JSON.stringify(keys), n = Object.keys(keys).length;
    if (!n) return Promise.resolve(null);
    var h = hash(json);
    if (auto && h === lastHash) return Promise.resolve(null);
    var snap = { id: Date.now(), t: new Date().toISOString(), name: projectName(), reason: reason || 'Snapshot', auto: !!auto, size: json.length, hash: h, items: n, data: json };
    return run(ST, 'readwrite', function (s) { return s.put(snap); }).then(function () {
      lastHash = h; return prune();
    }).then(function () { return writeFolder(snap); }).then(function () { return snap; }, function () { return null; });
  }
  function list() {
    return run(ST, 'readonly', function (s) { return s.getAll(); }).then(function (all) {
      return all.sort(function (a, b) { return b.id - a.id; }).map(function (x) { return { id: x.id, t: x.t, name: x.name, reason: x.reason, auto: x.auto, size: x.size, items: x.items }; });
    });
  }
  function get(id) { return run(ST, 'readonly', function (s) { return s.get(id); }); }
  function remove(id) { return run(ST, 'readwrite', function (s) { return s.delete(id); }); }
  function restore(id) {
    return get(id).then(function (snap) {
      if (!snap) throw new Error('missing');
      return snapshot('Before restore', false).then(function () {
        var keys = JSON.parse(snap.data);
        Object.keys(keys).forEach(function (k) { try { localStorage.setItem(k, keys[k]); } catch (e) {} });
        return snap;
      });
    });
  }
  function download(id) {
    return get(id).then(function (snap) {
      if (!snap) return;
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(pkg(snap))], { type: 'application/json' }));
      a.download = String(snap.name).replace(/\W+/g, '_').toLowerCase() + '_' + snap.t.slice(0, 16).replace(/[:T]/g, '') + '.json';
      document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); URL.revokeObjectURL(a.href); }, 800);
    });
  }

  /* optional folder auto-save (Chrome, Edge and other browsers with the File System Access API) */
  var canFolder = !!window.showDirectoryPicker;
  function folderHandle() { return run(META, 'readonly', function (s) { return s.get('dir'); }).catch(function () { return null; }); }
  function writeFolder(snap) {
    if (!canFolder) return Promise.resolve();
    return folderHandle().then(function (h) {
      if (!h) return;
      return h.queryPermission({ mode: 'readwrite' }).then(function (p) {
        if (p !== 'granted') return;
        var base = 'prohub-backup-' + String(snap.name).replace(/\W+/g, '_').toLowerCase();
        return h.getFileHandle(base + '-latest.json', { create: true }).then(function (f) { return f.createWritable(); }).then(function (w) {
          return w.write(JSON.stringify(pkg(snap))).then(function () { return w.close(); });
        });
      });
    }).catch(function () {});
  }
  function pickFolder() {
    return window.showDirectoryPicker({ mode: 'readwrite' }).then(function (h) {
      return run(META, 'readwrite', function (s) { return s.put(h, 'dir'); }).then(function () { return h; });
    });
  }
  function folderState() {
    if (!canFolder) return Promise.resolve({ ok: false });
    return folderHandle().then(function (h) {
      if (!h) return { ok: true, name: null };
      return h.queryPermission({ mode: 'readwrite' }).then(function (p) { return { ok: true, name: h.name, perm: p, h: h }; });
    });
  }

  /* history panel */
  var CSS = '#phs{position:fixed;inset:0;z-index:2147482000;background:rgba(3,5,10,.72);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,Segoe UI,sans-serif}' +
    '#phs .bx{width:min(640px,100%);max-height:min(86vh,720px);display:flex;flex-direction:column;background:#0B1020;color:#E9EDF5;border:1px solid #25344E;border-radius:14px;overflow:hidden}' +
    '#phs header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #1A2233}' +
    '#phs h2{margin:0;font-size:16px}#phs p{margin:0;color:#8A99B2;font-size:13px;line-height:1.45}' +
    '#phs .bd{padding:14px 16px;overflow:auto;display:flex;flex-direction:column;gap:12px}' +
    '#phs button{font:600 12px system-ui,sans-serif;letter-spacing:.04em;color:#E9EDF5;background:#131B2C;border:1px solid #25344E;border-radius:8px;padding:8px 12px;cursor:pointer}' +
    '#phs button:hover{border-color:#A9D95B}#phs button.pri{background:#A9D95B;border-color:#A9D95B;color:#05070B}#phs button.dng{color:#FCA5A5}' +
    '#phs button:focus-visible{outline:2px solid #5B68E8;outline-offset:2px}' +
    '#phs .row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border:1px solid #1A2233;border-radius:10px;background:#0E1526}' +
    '#phs .row b{font-size:13px}#phs .row small{display:block;color:#8A99B2;font-size:12px}#phs .acts{display:flex;gap:6px;flex-wrap:wrap}' +
    '#phs .tag{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#8A99B2;border:1px solid #25344E;border-radius:99px;padding:1px 7px;margin-left:6px}' +
    '#phs .fold{padding:10px 12px;border:1px dashed #25344E;border-radius:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between}';
  function ensureCss() { if (document.getElementById('phs-css')) return; var s = document.createElement('style'); s.id = 'phs-css'; s.textContent = CSS; document.head.appendChild(s); }
  function close() { var e = document.getElementById('phs'); if (e) e.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function render() {
    var el = document.getElementById('phs'); if (!el) return;
    Promise.all([list(), folderState()]).then(function (r) {
      var rows = r[0], f = r[1], bd = el.querySelector('.bd');
      var h = '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="pri" data-a="snap">Save a snapshot now</button></div>';
      if (f.ok) {
        h += '<div class="fold"><div><b style="font-size:13px">Auto-save to a folder</b><small style="color:#8A99B2;font-size:12px;display:block">' +
          (f.name ? 'Writing the newest copy to "' + esc(f.name) + '"' + (f.perm === 'granted' ? '' : ' (tap Allow to continue)') : 'Pick a folder on this computer. Every snapshot also lands there as a file.') + '</small></div><div class="acts">' +
          (f.name && f.perm !== 'granted' ? '<button data-a="allow">Allow</button>' : '') + '<button data-a="folder">' + (f.name ? 'Change folder' : 'Choose folder') + '</button></div></div>';
      }
      h += '<p>Snapshots are kept in this browser: the newest ' + MAX_AUTO + ' automatic ones and ' + MAX_MANUAL + ' that you save. Download one to keep it somewhere safe.</p>';
      if (!rows.length) h += '<p>No snapshots yet. Work for a few minutes, or save one now.</p>';
      rows.forEach(function (x) {
        h += '<div class="row"><div><b>' + esc(new Date(x.t).toLocaleString()) + '</b><span class="tag">' + esc(x.auto ? 'Auto' : x.reason) + '</span><small>' + esc(x.name) + ' · ' + x.items + ' items · ' + size(x.size) + '</small></div>' +
          '<div class="acts"><button data-a="restore" data-id="' + x.id + '">Restore</button><button data-a="dl" data-id="' + x.id + '">Download</button><button class="dng" data-a="del" data-id="' + x.id + '">Delete</button></div></div>';
      });
      bd.innerHTML = h;
    });
  }
  function openPanel() {
    ensureCss(); close();
    var el = document.createElement('div'); el.id = 'phs'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Backups and history');
    el.innerHTML = '<div class="bx"><header><h2>Backups &amp; history</h2><button data-a="x" aria-label="Close">Close</button></header><div class="bd"></div></div>';
    document.body.appendChild(el); document.addEventListener('keydown', onKey);
    el.addEventListener('click', function (e) {
      if (e.target === el) return close();
      var b = e.target.closest('button'); if (!b) return;
      var a = b.getAttribute('data-a'), id = +b.getAttribute('data-id');
      if (a === 'x') close();
      else if (a === 'snap') snapshot('Saved by you', false).then(render);
      else if (a === 'dl') download(id);
      else if (a === 'del') { if (confirm('Delete this snapshot?')) remove(id).then(render); }
      else if (a === 'restore') {
        if (confirm('Restore this snapshot?\n\nA snapshot of the current state is saved first, so you can undo this.')) restore(id).then(function () { location.reload(); });
      }
      else if (a === 'folder') pickFolder().then(function () { return snapshot('Folder set', false); }).then(render, render);
      else if (a === 'allow') folderState().then(function (s) { return s.h && s.h.requestPermission({ mode: 'readwrite' }); }).then(function () { return snapshot('Folder allowed', false); }).then(render, render);
    });
    render();
  }

  function start() {
    var top = true; try { top = window.top === window; } catch (e) {}
    if (!top || !window.indexedDB) return;
    setTimeout(function () { snapshot('Opened', true); }, 4000);
    timer = setInterval(function () { snapshot('Auto', true); }, EVERY);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') snapshot('Auto', true); });
  }
  window.PHSafety = { snapshot: snapshot, list: list, restore: restore, download: download, open: openPanel, close: close };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
