/* proHUB cloud save for logged-in Wix members. The app runs inside a page on the Wix site; that page's code passes requests to a
   backend web module (velo/backend/proHubCloud.web.js) which checks the member on the server. Nothing is stored for anonymous visitors. */
(function () {
  if (window.PHCloud) return;
  var CFG = 'prohub_cloud_v1';
  var KEYS = ['prehub_master_v1', 'prehub_v3', 'prohub_meta_v1', 'prohub_scriptation_v1', 'prohub_callsheet_v1', 'prohub_schedule_v1', 'prohub_revisions_v1', 'prehub_shotlist', 'prohub_shots_v1', 'prohub_boards_v1', 'prohub_props_tracker_v1', 'ob_letters', 'prehub_quick_notes', 'prohub_gear_v1'];
  var PART = 100000, pend = {}, seq = 0, listening = false;

  function cfg() { try { var c = JSON.parse(localStorage.getItem(CFG) || 'null'); if (c && typeof c === 'object') { c.last = c.last || {}; c.sent = c.sent || {}; return c; } } catch (e) { } return { pid: '', name: '', last: {}, sent: {}, auto: false }; }
  function put(c) { try { localStorage.setItem(CFG, JSON.stringify(c)); } catch (e) { } }
  function split(v) { var o = []; for (var i = 0; i < v.length; i += PART) o.push(v.slice(i, i + PART)); return o.length ? o : ['']; }
  function sig(v) { var h = 5381; for (var i = 0; i < v.length; i++) h = ((h << 5) + h + v.charCodeAt(i)) | 0; return v.length + ':' + (h >>> 0).toString(36); }

  function listen() {
    if (listening) return; listening = true;
    window.addEventListener('message', function (e) { var m = e.data; if (!m || m.type !== 'ph-cloud-reply' || !pend[m.id]) return; var p = pend[m.id]; delete pend[m.id]; clearTimeout(p.t); if (m.ok) p.res(m.result); else p.rej(new Error(m.error === 'login' ? 'Please log in to save to the cloud.' : (m.error || 'The request failed.'))); });
  }
  function call(op, args, ms) {
    listen();
    return new Promise(function (res, rej) {
      if (window.parent === window) return rej(new Error('Cloud save works when this page is open inside rooksproductions.com.'));
      var id = 'c' + (++seq) + Date.now(); pend[id] = { res: res, rej: rej, t: setTimeout(function () { delete pend[id]; rej(new Error('The website did not answer. Is this page open inside rooksproductions.com?')); }, ms || 30000) };
      try { window.parent.postMessage({ type: 'ph-cloud', id: id, op: op, args: args || [] }, '*'); } catch (e) { clearTimeout(pend[id].t); delete pend[id]; rej(e); }
    });
  }

  function hello() { return call('hello', [], 2500).then(function (r) { return { embedded: true, loggedIn: !!r.loggedIn }; }, function () { return { embedded: false, loggedIn: false }; }); }
  function login() { return call('login', [], 120000); }
  function whoami() { return call('whoami'); }
  function projects() { return call('listProjects'); }
  function share(emails) { var c = cfg(); return call('shareProject', [c.pid, emails]); }
  function select(pid, name) { var c = cfg(); c.pid = pid; c.name = name || ''; c.last = {}; c.sent = {}; put(c); }
  function leave() { var c = cfg(); c.pid = ''; c.name = ''; c.last = {}; c.sent = {}; put(c); }
  function setAuto(on) { var c = cfg(); c.auto = !!on; put(c); }
  function create(name) { return call('createProject', [name]).then(function (r) { select(r.pid, name); return r.pid; }); }
  function remove() { var c = cfg(); return call('removeProject', [c.pid]).then(function (r) { leave(); return r; }); }

  async function push(opts) {
    opts = opts || {}; var c = cfg(); if (!c.pid) throw new Error('Choose or create a project first.'); var sent = 0, conflicts = [];
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i], v = null; try { v = localStorage.getItem(k); } catch (e) { } if (v == null) continue;
      var sg = sig(v); if (!opts.all && c.sent[k] === sg) continue;
      var ts = Date.now(), r = await call('saveKey', [c.pid, k, ts, c.last[k] || 0, split(v), !!opts.force], 60000);
      if (r && r.ok) { c.last[k] = ts; c.sent[k] = sg; sent++; } else if (r && r.conflict) conflicts.push({ k: k, ts: r.ts, by: r.by || '' });
    }
    put(c); return { sent: sent, conflicts: conflicts };
  }
  async function pull() {
    var c = cfg(); if (!c.pid) throw new Error('Choose or create a project first.'); var r = await call('loadProject', [c.pid], 60000), n = 0;
    Object.keys(r.keys).forEach(function (k) { if (KEYS.indexOf(k) < 0) return; var v = r.keys[k].parts.join(''); try { localStorage.setItem(k, v); c.last[k] = r.keys[k].ts; c.sent[k] = sig(v); n++; } catch (e) { } });
    put(c); return { keys: n };
  }
  async function check() {
    var c = cfg(); if (!c.pid) return { newer: [] }; var r = await call('projectMeta', [c.pid]), newer = [], by = '';
    Object.keys(r.meta).forEach(function (k) { if (r.meta[k].ts > (c.last[k] || 0)) { newer.push(k); by = r.meta[k].by || by; } }); return { newer: newer, by: by };
  }

  var timer = null;
  function tick() { var c = cfg(); if (!c.auto || !c.pid) return; push().then(function (r) { if (r.conflicts.length && window.toast) toast('Cloud save paused: ' + (r.conflicts[0].by || 'someone') + ' saved newer data. Open Export data to choose.'); }).catch(function () { }); }
  if (window.parent !== window) timer = setInterval(tick, 20000);

  window.PHCloud = { cfg: cfg, hello: hello, login: login, whoami: whoami, projects: projects, share: share, select: select, leave: leave, setAuto: setAuto, create: create, remove: remove, push: push, pull: pull, check: check, KEYS: KEYS };
})();
