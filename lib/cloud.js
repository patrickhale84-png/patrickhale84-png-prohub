/* proHUB cloud save: stores the project's working data in a Wix collection through Velo http-functions (see velo/http-functions.js).
   A project is identified by a long random project code; anyone who has the code can open and save it. */
(function () {
  if (window.PHCloud) return;
  var CFG = 'prohub_cloud_v1';
  var KEYS = ['prehub_master_v1', 'prehub_v3', 'prohub_meta_v1', 'prohub_scriptation_v1', 'prohub_callsheet_v1', 'prohub_schedule_v1', 'prohub_revisions_v1', 'prehub_shotlist', 'prohub_shots_v1', 'prohub_boards_v1', 'prohub_props_tracker_v1', 'ob_letters', 'prehub_quick_notes', 'prohub_gear_v1'];
  var PART = 100000;

  function cfg() { try { var c = JSON.parse(localStorage.getItem(CFG) || 'null'); if (c && typeof c === 'object') { c.last = c.last || {}; c.sent = c.sent || {}; return c; } } catch (e) { } return { base: '', pid: '', last: {}, sent: {}, auto: false }; }
  function put(c) { try { localStorage.setItem(CFG, JSON.stringify(c)); } catch (e) { } }
  function norm(b) { b = String(b || '').trim().replace(/\/+$/, ''); if (b && !/^https?:\/\//i.test(b)) b = 'https://' + b; if (b && !/\/_functions(-dev)?$/.test(b)) b += '/_functions'; return b; }
  function newCode() { var a = new Uint8Array(24); crypto.getRandomValues(a); var s = ''; for (var i = 0; i < a.length; i++) s += 'abcdefghijkmnpqrstuvwxyz23456789'[a[i] % 32]; return s; }
  function split(v) { var o = []; for (var i = 0; i < v.length; i += PART) o.push(v.slice(i, i + PART)); return o.length ? o : ['']; }
  function sig(v) { var h = 5381; for (var i = 0; i < v.length; i++) h = ((h << 5) + h + v.charCodeAt(i)) | 0; return v.length + ':' + (h >>> 0).toString(36); }
  function post(c, path, body) { return fetch(c.base + '/' + path, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }); }
  function get(c, path, q) { return fetch(c.base + '/' + path + '?' + q).then(function (r) { return r.json(); }); }
  function need(c) { if (!c.base) throw new Error('Enter your Wix site address first.'); if (!c.pid) throw new Error('Create or join a project code first.'); }

  function configure(base) { var c = cfg(); c.base = norm(base); put(c); return c; }
  function create() { var c = cfg(); c.pid = newCode(); c.last = {}; c.sent = {}; put(c); return c.pid; }
  function join(pid) { pid = String(pid || '').trim(); if (!/^[A-Za-z0-9_-]{20,64}$/.test(pid)) throw new Error('That project code is not valid.'); var c = cfg(); c.pid = pid; c.last = {}; c.sent = {}; put(c); return pid; }
  function leave() { var c = cfg(); c.pid = ''; c.last = {}; c.sent = {}; put(c); }
  function setAuto(on) { var c = cfg(); c.auto = !!on; put(c); }

  /* send every key that changed since the last send */
  async function push(opts) {
    opts = opts || {}; var c = cfg(); need(c); var sent = 0, conflicts = [], skipped = 0;
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i], v = null; try { v = localStorage.getItem(k); } catch (e) { }
      if (v == null) continue;
      var sg = sig(v); if (!opts.all && c.sent[k] === sg) { skipped++; continue; }
      var ts = Date.now(), r = await post(c, 'save', { pid: c.pid, k: k, ts: ts, base: c.last[k] || 0, parts: split(v), force: !!opts.force });
      if (r && r.ok) { c.last[k] = ts; c.sent[k] = sg; sent++; }
      else if (r && r.conflict) conflicts.push({ k: k, ts: r.ts });
      else throw new Error((r && r.error) || 'The save failed.');
    }
    put(c); return { sent: sent, skipped: skipped, conflicts: conflicts };
  }

  /* replace local data with what is stored for the project */
  async function pull() {
    var c = cfg(); need(c); var r = await get(c, 'load', 'pid=' + encodeURIComponent(c.pid));
    if (!r || !r.ok) throw new Error((r && r.error) || 'The load failed.');
    var n = 0; Object.keys(r.keys).forEach(function (k) { if (KEYS.indexOf(k) < 0) return; var v = r.keys[k].parts.join(''); try { localStorage.setItem(k, v); c.last[k] = r.keys[k].ts; c.sent[k] = sig(v); n++; } catch (e) { } });
    put(c); return { keys: n };
  }

  /* which keys are newer in the cloud than what we last saw */
  async function check() {
    var c = cfg(); need(c); var r = await get(c, 'meta', 'pid=' + encodeURIComponent(c.pid));
    if (!r || !r.ok) throw new Error((r && r.error) || 'The check failed.');
    var newer = []; Object.keys(r.meta).forEach(function (k) { if (r.meta[k] > (c.last[k] || 0)) newer.push(k); });
    return { newer: newer, total: Object.keys(r.meta).length };
  }

  function link() { var c = cfg(); return c.pid ? location.origin + location.pathname + '#cloud=' + c.pid : ''; }
  function fromHash() { var m = /[#&]cloud=([A-Za-z0-9_-]{20,64})/.exec(location.hash || ''); return m ? m[1] : null; }

  /* auto-save: look for changes every 20 seconds */
  var timer = null;
  function tick() { var c = cfg(); if (!c.auto || !c.pid || !c.base) return; push().then(function (r) { if (r.conflicts.length && window.toast) toast('Cloud save paused: someone else saved newer data. Open Export data to choose.'); }).catch(function () { }); }
  function start() { if (!timer) timer = setInterval(tick, 20000); }
  start();

  window.PHCloud = { cfg: cfg, configure: configure, create: create, join: join, leave: leave, setAuto: setAuto, push: push, pull: pull, check: check, link: link, fromHash: fromHash, KEYS: KEYS };
})();
