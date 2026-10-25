/* proHUB on-set mode and share links.
   On set: today's schedule on a phone, with scenes you can start and finish, cast calls, and location info.
   Share link: a read-only call sheet packed into the link itself. No account, no server. */
(function () {
  if (window.PHOnset) return;
  var SK = 'prohub_onset_v1';
  function g(n) { try { return window[n]; } catch (e) { return undefined; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(m) { try { g('toast')(m); } catch (e) {} }
  function slug(s) { return String(s || 'project').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'project'; }
  function m2t(m) { if (m == null || isNaN(m)) return ''; m = ((Math.round(m) % 1440) + 1440) % 1440; var h = Math.floor(m / 60), x = m % 60, a = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + (x < 10 ? '0' : '') + x + ' ' + a; }
  function nowMin() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function longDate(iso) { if (!iso) return ''; try { return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); } catch (e) { return iso; } }

  var CSS = '#pho{position:fixed;inset:0;z-index:2147482500;background:#05070B;color:#E9EDF5;font-family:system-ui,Segoe UI,sans-serif;display:flex;flex-direction:column;overflow:hidden}' +
    '#pho *{box-sizing:border-box}#pho .ph-hd{flex:0 0 auto;padding:10px 14px;border-bottom:1px solid #1A2233;background:#0B1020;display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between;padding-top:max(10px,env(safe-area-inset-top))}' +
    '#pho .ph-t1{font-weight:800;font-size:15px;letter-spacing:.02em}#pho .ph-t2{font-size:12px;color:#8A99B2}#pho .ph-clk{font:700 22px ui-monospace,Menlo,monospace;color:#A9D95B}' +
    '#pho .ph-bar{flex:0 0 auto;display:flex;gap:6px;flex-wrap:wrap;padding:8px 14px;border-bottom:1px solid #1A2233;background:#080D18}' +
    '#pho .ph-tab,#pho .ph-chip,#pho .ph-btn{font:700 12px system-ui,sans-serif;letter-spacing:.04em;color:#E9EDF5;background:#131B2C;border:1px solid #25344E;border-radius:10px;padding:10px 14px;min-height:44px;cursor:pointer}' +
    '#pho .ph-tab.on,#pho .ph-chip.on{background:#A9D95B;border-color:#A9D95B;color:#05070B}#pho .ph-btn.pri{background:#A9D95B;border-color:#A9D95B;color:#05070B}#pho .ph-btn.dng{color:#FCA5A5}' +
    '#pho button:focus-visible,#pho a:focus-visible,#pho textarea:focus-visible{outline:2px solid #5B68E8;outline-offset:2px}' +
    '#pho .ph-bd{flex:1 1 auto;overflow:auto;padding:12px 14px calc(24px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:10px;-webkit-overflow-scrolling:touch}' +
    '#pho .ph-st{display:flex;flex-wrap:wrap;gap:8px}#pho .ph-st div{flex:1 1 90px;border:1px solid #1A2233;background:#0E1526;border-radius:10px;padding:8px 10px}#pho .ph-st b{display:block;font:700 15px ui-monospace,Menlo,monospace}#pho .ph-st span{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8A99B2}' +
    '#pho .ph-bd>*{flex:0 0 auto}#pho .ph-card{min-width:0;overflow-x:auto;border:1px solid #1A2233;background:#0E1526;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px}' +
    '#pho .ph-card.act{border-color:#A9D95B;box-shadow:0 0 0 1px #A9D95B inset}#pho .ph-card.done{opacity:.55}' +
    '#pho .ph-tm{font:700 12px ui-monospace,Menlo,monospace;color:#8A99B2}#pho .ph-hh{font-weight:800;font-size:15px;line-height:1.25}' +
    '#pho .ph-pl{display:flex;flex-wrap:wrap;gap:5px}#pho .ph-pl span{font-size:11px;border:1px solid #25344E;border-radius:99px;padding:2px 8px;color:#C5D0E4}' +
    '#pho .ph-row{display:flex;flex-wrap:wrap;gap:8px}#pho .ph-meal{text-align:center;color:#8A99B2;border:1px dashed #25344E;border-radius:10px;padding:10px;font-size:13px}' +
    '#pho textarea{width:100%;min-height:64px;background:#080D18;color:#E9EDF5;border:1px solid #25344E;border-radius:8px;padding:8px;font:13px system-ui,sans-serif}' +
    '#pho a{color:#A9D95B}#pho .ph-late{color:#FCA5A5}#pho .ph-ok{color:#A9D95B}#pho .ph-nt{font-size:12px;color:#8A99B2;line-height:1.45}' +
    '#pho table{width:100%;min-width:300px;border-collapse:collapse;font-size:13px}#pho td,#pho th{text-align:left;padding:8px 6px;border-bottom:1px solid #1A2233;vertical-align:top}#pho th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8A99B2}' +
    '@media print{#pho .ph-bar,#pho .ph-hd .btn,#pho .noprint{display:none!important}#pho{position:static;color:#000;background:#fff}#pho .ph-card,#pho .ph-st div{background:#fff;border-color:#999}}';
  function css() { if (document.getElementById('pho-css')) return; var s = document.createElement('style'); s.id = 'pho-css'; s.textContent = CSS; document.head.appendChild(s); }

  /* ---------- pack one shoot day (used by the phone view and the share link) ---------- */
  function pack(d, opt) {
    opt = opt || {}; var M = g('M'), PC = g('PC') || { info: {}, days: {}, cast: {}, crew: [] }, dd = (PC.days && PC.days[d.n]) || {}, sc = g('pcSched')(d), T = sc.T, rows = [];
    sc.rows.forEach(function (r) {
      if (r.meal) { rows.push({ meal: 1, a: r.a, b: r.b }); return; }
      var s = r.s, needs = []; Object.keys(g('CATS') || {}).forEach(function (k) { (s.tags[k] || []).forEach(function (w) { needs.push(w); }); });
      rows.push({ a: r.a, b: r.b, s: { num: s.num, h: s.heading, ie: s.ie, loc: s.loc, tod: s.tod, cast: s.cast, e: s.eighths, note: s.notes || '', needs: needs.slice(0, 12) } });
    });
    var cast = g('pcCastRows')(d).map(function (c) { var o = { role: c.role, actor: c.actor, st: c.status, mu: c.mu, set: c.set, pk: c.pickup, w: c.ward, n: c.notes }; if (opt.phones) o.ph = c.phone; return o; });
    var crew = opt.crew === false ? [] : (PC.crew || []).filter(function (c) { return c.name || c.role; }).map(function (c) { var o = { d: c.dept, r: c.role, n: c.name, c: c.call }; if (opt.phones) o.ph = c.phone; return o; });
    var w = dd.weather, h = dd.hospital;
    return { v: 1, t: M.title, n: d.n, of: M.days.length, date: g('pcDate')(d.n), loc: d.loc, addr: dd.address || '', park: dd.parking || '', notes: dd.notes || '', rev: (PC.info && PC.info.rev) || '',
      gen: T.general, crew: T.crew, shoot: T.shoot, wrap: g('pcWrap')(d), lunch: T.lunchSet,
      wx: w && w.desc ? { d: w.desc, hi: w.hi, lo: w.lo } : null, hosp: h && h.name ? { n: h.name, a: h.address || '', p: h.phone || '' } : null,
      rows: rows, cast: cast, crewList: crew, made: new Date().toISOString() };
  }

  /* ---------- progress ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(SK) || '{}') || {}; } catch (e) { return {}; } }
  function store(o) { try { localStorage.setItem(SK, JSON.stringify(o)); } catch (e) {} }

  /* ---------- on-set view ---------- */
  var S = { day: null, tab: 'sched', timer: null, lock: null };
  function pickDay() {
    var M = g('M'), t = todayIso(), best = null;
    M.days.forEach(function (d) { var dt = g('pcDate')(d.n); if (dt === t) best = best || d; });
    if (best) return best.n;
    var fut = M.days.filter(function (d) { var dt = g('pcDate')(d.n); return dt && dt >= t; });
    return (fut[0] || M.days[0]).n;
  }
  function openOnset() {
    var M = g('M'); if (!M || !M.days || !M.days.length) { toast('Import a script and set up a schedule first. On-set mode needs shoot days.'); return; }
    css(); closeOnset(); S.day = S.day || pickDay(); S.tab = 'sched';
    var el = document.createElement('div'); el.id = 'pho'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'On set'); document.body.appendChild(el); document.body.style.overflow = 'hidden';
    el.addEventListener('click', onClick); el.addEventListener('input', onInput);
    paint(); S.timer = setInterval(tick, 20000); wake();
    document.addEventListener('visibilitychange', onVis);
  }
  function onVis() { if (document.visibilityState === 'visible' && document.getElementById('pho')) { wake(); tick(); } }
  function wake() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { S.lock = l; }, function () {}); } catch (e) {} }
  function closeOnset() { var e = document.getElementById('pho'); if (e) e.remove(); document.body.style.overflow = ''; clearInterval(S.timer); try { S.lock && S.lock.release(); } catch (x) {} S.lock = null; document.removeEventListener('visibilitychange', onVis); }
  function tick() { var c = document.getElementById('pho-clk'); if (c) c.textContent = m2t(nowMin()); var st = document.getElementById('pho-sum'); if (st && S.sum) st.innerHTML = S.sum(); }
  function curDay() { return g('M').days.filter(function (d) { return d.n === S.day; })[0]; }

  function paint() {
    var el = document.getElementById('pho'); if (!el) return; var M = g('M'), d = curDay(), P = pack(d, { phones: true }), prog = (load()[S.day]) || {};
    var live = P.rows.filter(function (r) { return !r.meal; }), done = live.filter(function (r) { return (prog[r.s.num] || {}).st === 'done'; }).length;
    var nextI = -1; live.forEach(function (r, i) { var st = (prog[r.s.num] || {}).st; if (nextI < 0 && st !== 'done') nextI = i; });
    var lastDone = null; live.forEach(function (r) { var p = prog[r.s.num]; if (p && p.st === 'done' && p.at != null) lastDone = { r: r, at: p.at }; });
    var delta = lastDone ? lastDone.at - lastDone.r.b : null;
    S.sum = function () {
      var rem = 0; live.forEach(function (r) { if ((prog[r.s.num] || {}).st !== 'done') rem += r.b - r.a; });
      var est = Math.max(nowMin(), lastDone ? lastDone.at : P.shoot) + rem, late = est - P.wrap;
      return '<div><b>' + done + ' / ' + live.length + '</b><span>Scenes done</span></div><div><b class="' + (delta == null ? '' : delta > 5 ? 'ph-late' : 'ph-ok') + '">' + (delta == null ? '—' : (delta > 0 ? '+' : '') + delta + ' min') + '</b><span>vs schedule</span></div><div><b class="' + (late > 15 ? 'ph-late' : '') + '">' + m2t(est) + '</b><span>Est. wrap (plan ' + m2t(P.wrap) + ')</span></div>';
    };
    var h = '<div class="ph-hd"><div><div class="ph-t1">' + esc(M.title) + '</div><div class="ph-t2">Day ' + d.n + ' of ' + M.days.length + (P.date ? ' · ' + esc(longDate(P.date)) : '') + '</div></div><div class="ph-clk" id="pho-clk">' + m2t(nowMin()) + '</div><div class="ph-row"><button class="ph-btn" data-a="share">Share</button><button class="ph-btn" data-a="close">Close</button></div></div>';
    h += '<div class="ph-bar">' + M.days.map(function (x) { return '<button class="ph-chip' + (x.n === S.day ? ' on' : '') + '" data-a="day" data-n="' + x.n + '">Day ' + x.n + '</button>'; }).join('') + '<span style="flex:1"></span>' +
      [['sched', 'Schedule'], ['cast', 'Cast & crew'], ['info', 'Location']].map(function (t) { return '<button class="ph-tab' + (S.tab === t[0] ? ' on' : '') + '" data-a="tab" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div class="ph-bd">';
    if (S.tab === 'sched') {
      h += '<div class="ph-st"><div><b>' + m2t(P.gen) + '</b><span>General call</span></div><div><b>' + m2t(P.shoot) + '</b><span>First shot</span></div></div><div class="ph-st" id="pho-sum">' + S.sum() + '</div>';
      P.rows.forEach(function (r, ix) {
        if (r.meal) { h += '<div class="ph-meal">Meal · ' + m2t(r.a) + ' to ' + m2t(r.b) + '</div>'; return; }
        var s = r.s, p = prog[s.num] || {}, isNext = live[nextI] && live[nextI].s.num === s.num, cls = 'ph-card' + (p.st === 'done' ? ' done' : p.st === 'active' || isNext ? ' act' : '');
        h += '<div class="' + cls + '"><div class="ph-tm">' + m2t(r.a) + ' – ' + m2t(r.b) + ' · Scene ' + esc(s.num) + ' · ' + (s.e ? s.e + '/8 pg' : '') + (p.st === 'done' ? ' · done ' + m2t(p.at) : p.st === 'active' ? ' · shooting since ' + m2t(p.from) : isNext ? ' · UP NEXT' : '') + '</div>' +
          '<div class="ph-hh">' + esc(s.h) + '</div>' + (s.cast.length ? '<div class="ph-pl">' + s.cast.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>' : '') +
          (s.needs.length ? '<div class="ph-nt">Needs: ' + esc(s.needs.join(', ')) + '</div>' : '') + (s.note ? '<div class="ph-nt">Scene note: ' + esc(s.note) + '</div>' : '') +
          '<div class="ph-row">' + (p.st === 'done' ? '<button class="ph-btn" data-a="undo" data-s="' + esc(s.num) + '">Undo</button>' : (p.st === 'active' ? '' : '<button class="ph-btn' + (isNext ? ' pri' : '') + '" data-a="start" data-s="' + esc(s.num) + '">Start</button>') + '<button class="ph-btn' + (p.st === 'active' ? ' pri' : '') + '" data-a="done" data-s="' + esc(s.num) + '">Mark done</button>') + '<button class="ph-btn" data-a="note" data-s="' + esc(s.num) + '">' + (p.note ? 'Edit note' : 'Add note') + '</button></div>' +
          (p.note ? '<div class="ph-nt">Your note: ' + esc(p.note) + '</div>' : '') + (p.edit ? '<textarea data-s="' + esc(s.num) + '" placeholder="Pickups, continuity, anything for the editor">' + esc(p.note || '') + '</textarea>' : '') + '</div>';
      });
      h += '<div class="ph-row noprint"><button class="ph-btn dng" data-a="reset">Reset today\'s progress</button></div>';
    } else if (S.tab === 'cast') {
      h += '<div class="ph-card"><table><tr><th>Role</th><th>Actor</th><th>MU</th><th>Set</th></tr>' + P.cast.map(function (c) { return '<tr><td>' + esc(c.role) + '<br><span class="ph-nt">' + esc(c.st) + '</span></td><td>' + esc(c.actor) + (c.ph ? '<br><a href="tel:' + esc(String(c.ph).replace(/[^\d+]/g, '')) + '">' + esc(c.ph) + '</a>' : '') + '</td><td>' + m2t(c.mu) + '</td><td>' + m2t(c.set) + '</td></tr>'; }).join('') + '</table></div>';
      if (P.crewList.length) h += '<div class="ph-card"><table><tr><th>Dept</th><th>Name</th><th>Call</th></tr>' + P.crewList.map(function (c) { return '<tr><td>' + esc(c.d) + '<br><span class="ph-nt">' + esc(c.r) + '</span></td><td>' + esc(c.n) + (c.ph ? '<br><a href="tel:' + esc(String(c.ph).replace(/[^\d+]/g, '')) + '">' + esc(c.ph) + '</a>' : '') + '</td><td>' + esc(c.c || '') + '</td></tr>'; }).join('') + '</table></div>';
    } else h += infoHTML(P);
    h += '</div>'; el.innerHTML = h;
  }
  function infoHTML(P) {
    var h = '<div class="ph-card"><div class="ph-hh">' + esc(P.loc || 'Location') + '</div>' + (P.addr ? '<div>' + esc(P.addr) + '</div><div class="ph-row"><a class="ph-btn" style="text-decoration:none;display:inline-flex;align-items:center" href="https://maps.google.com/?q=' + encodeURIComponent(P.addr) + '" target="_blank" rel="noopener">Open in maps</a></div>' : '<div class="ph-nt">No address set for this day.</div>') + (P.park ? '<div class="ph-nt">Parking: ' + esc(P.park) + '</div>' : '') + '</div>';
    if (P.wx) h += '<div class="ph-card"><div class="ph-hh">Weather</div><div>' + esc(P.wx.d) + ', high ' + esc(P.wx.hi) + '° / low ' + esc(P.wx.lo) + '°</div></div>';
    if (P.hosp) h += '<div class="ph-card"><div class="ph-hh">Nearest hospital</div><div>' + esc(P.hosp.n) + '</div>' + (P.hosp.a ? '<div class="ph-nt">' + esc(P.hosp.a) + '</div>' : '') + (P.hosp.p ? '<div class="ph-row"><a class="ph-btn" style="text-decoration:none;display:inline-flex;align-items:center" href="tel:' + esc(String(P.hosp.p).replace(/[^\d+]/g, '')) + '">Call ' + esc(P.hosp.p) + '</a></div>' : '') + '</div>';
    if (P.notes) h += '<div class="ph-card"><div class="ph-hh">Notes</div><div style="white-space:pre-wrap">' + esc(P.notes) + '</div></div>';
    return h;
  }
  function onInput(e) { var t = e.target; if (t.tagName === 'TEXTAREA' && t.getAttribute('data-s')) { var all = load(), pr = all[S.day] = all[S.day] || {}, p = pr[t.getAttribute('data-s')] = pr[t.getAttribute('data-s')] || {}; p.note = t.value; store(all); } }
  function onClick(e) {
    var b = e.target.closest('button'); if (!b) return; var a = b.getAttribute('data-a'), sn = b.getAttribute('data-s'), all = load(), pr = all[S.day] = all[S.day] || {};
    if (a === 'close') return closeOnset(); if (a === 'share') return openShare(S.day);
    if (a === 'day') { S.day = +b.getAttribute('data-n'); return paint(); } if (a === 'tab') { S.tab = b.getAttribute('data-t'); return paint(); }
    if (a === 'start') { pr[sn] = Object.assign(pr[sn] || {}, { st: 'active', from: nowMin() }); }
    else if (a === 'done') { pr[sn] = Object.assign(pr[sn] || {}, { st: 'done', at: nowMin() }); }
    else if (a === 'undo') { var p = pr[sn] || {}; delete p.st; delete p.at; delete p.from; pr[sn] = p; }
    else if (a === 'note') { var q = pr[sn] = pr[sn] || {}; q.edit = !q.edit; }
    else if (a === 'reset') { if (!confirm('Clear start and done marks and notes for this day?')) return; delete all[S.day]; }
    store(all); paint();
  }

  /* ---------- share link ---------- */
  function b64u(buf) { var s = '', a = new Uint8Array(buf); for (var i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(t) { t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; var s = atob(t), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function pipe(stream, bytes) { return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer(); }
  function encode(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (window.CompressionStream) return pipe(new CompressionStream('deflate-raw'), bytes).then(function (b) { return 'z.' + b64u(b); });
    return Promise.resolve('p.' + b64u(bytes));
  }
  function decode(tok) {
    var k = tok.slice(0, 2), raw = unb64u(tok.slice(2));
    if (k === 'z.') { if (!window.DecompressionStream) return Promise.reject(new Error('This browser cannot open compressed links. Use a current Chrome, Safari, Edge or Firefox.')); return pipe(new DecompressionStream('deflate-raw'), raw).then(function (b) { return JSON.parse(new TextDecoder().decode(b)); }); }
    return Promise.resolve(JSON.parse(new TextDecoder().decode(raw)));
  }
  function baseUrl() { return location.origin + location.pathname.replace(/[^\/]*$/, '') + 'filmhub.html'; }

  function openShare(dayN) {
    var M = g('M'); if (!M || !M.days.length) { toast('Set up a schedule first.'); return; } css();
    var old = document.getElementById('pho-sh'); if (old) old.remove();
    var el = document.createElement('div'); el.id = 'pho-sh'; el.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(3,5,10,.78);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif';
    el.innerHTML = '<div id="pho" style="position:static;inset:auto;width:min(520px,100%);max-height:90vh;border:1px solid #25344E;border-radius:14px;background:#0B1020"><div class="ph-hd"><div class="ph-t1">Share a call sheet link</div><button class="ph-btn" data-a="x">Close</button></div><div class="ph-bd">' +
      '<div class="ph-nt">Makes a link that holds a read-only copy of one day. Anyone with the link can open it on any phone, with nothing to install or sign in to. It is a snapshot: send a new link if the schedule changes.</div>' +
      '<label class="ph-nt">Shoot day<br><select id="phs-day" style="width:100%;min-height:44px;background:#080D18;color:#E9EDF5;border:1px solid #25344E;border-radius:8px;padding:8px">' + M.days.map(function (d) { var dt = g('pcDate')(d.n); return '<option value="' + d.n + '"' + (d.n === dayN ? ' selected' : '') + '>Day ' + d.n + (dt ? ' · ' + dt : '') + ' · ' + esc(d.loc || '') + '</option>'; }).join('') + '</select></label>' +
      '<label class="ph-nt"><input type="checkbox" id="phs-ph"> Include phone numbers</label><label class="ph-nt"><input type="checkbox" id="phs-cr" checked> Include the crew list</label>' +
      '<div class="ph-row"><button class="ph-btn pri" data-a="make">Create link</button></div><div id="phs-out"></div></div></div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target === el) return el.remove(); var b = e.target.closest('button'); if (!b) return; var a = b.getAttribute('data-a');
      if (a === 'x') return el.remove();
      if (a === 'make') {
        var d = M.days.filter(function (x) { return x.n === +document.getElementById('phs-day').value; })[0], P = pack(d, { phones: document.getElementById('phs-ph').checked, crew: document.getElementById('phs-cr').checked });
        encode(P).then(function (tok) {
          var url = baseUrl() + '#share=' + tok, out = document.getElementById('phs-out');
          out.innerHTML = '<textarea id="phs-url" readonly style="min-height:90px">' + esc(url) + '</textarea><div class="ph-nt">' + url.length.toLocaleString() + ' characters' + (url.length > 8000 ? '. Long for a text message: turn off the crew list to shorten it.' : '.') + '</div><div class="ph-row"><button class="ph-btn pri" data-a="copy">Copy link</button>' + (navigator.share ? '<button class="ph-btn" data-a="send">Send…</button>' : '') + '<button class="ph-btn" data-a="test">Preview</button></div>';
          out.__u = url;
        });
      } else if (a === 'copy') { var u = document.getElementById('phs-out').__u; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { toast('Link copied.'); }, function () { var t = document.getElementById('phs-url'); t.select(); toast('Press copy on the selected text.'); }); }
      else if (a === 'send') navigator.share({ title: 'Call sheet', url: document.getElementById('phs-out').__u }).catch(function () {});
      else if (a === 'test') window.open(document.getElementById('phs-out').__u, '_blank', 'noopener');
    });
  }

  /* ---------- read-only viewer for a shared link ---------- */
  function viewShare(P) {
    css(); var el = document.getElementById('pho-view'); if (el) el.remove();
    el = document.createElement('div'); el.id = 'pho-view'; el.style.cssText = 'position:fixed;inset:0;z-index:2147483200;background:#05070B';
    var inner = document.createElement('div'); inner.id = 'pho';
    var live = P.rows.filter(function (r) { return !r.meal; });
    var h = '<div class="ph-hd"><div><div class="ph-t1">' + esc(P.t) + '</div><div class="ph-t2">Call sheet · Day ' + P.n + ' of ' + P.of + (P.date ? ' · ' + esc(longDate(P.date)) : '') + (P.rev ? ' · ' + esc(P.rev) + ' revision' : '') + '</div></div><div class="ph-row noprint"><button class="ph-btn" data-a="ics">Add to calendar</button><button class="ph-btn" data-a="print">Print</button></div></div><div class="ph-bd">';
    h += '<div class="ph-st"><div><b>' + m2t(P.gen) + '</b><span>General call</span></div><div><b>' + m2t(P.shoot) + '</b><span>First shot</span></div><div><b>' + m2t(P.wrap) + '</b><span>Est. wrap</span></div></div>';
    h += '<div class="ph-card"><div class="ph-hh">' + esc(P.loc || '') + '</div>' + (P.addr ? '<div>' + esc(P.addr) + '</div><div class="ph-row noprint"><a class="ph-btn" style="text-decoration:none;display:inline-flex;align-items:center" href="https://maps.google.com/?q=' + encodeURIComponent(P.addr) + '" target="_blank" rel="noopener">Open in maps</a></div>' : '') + (P.park ? '<div class="ph-nt">Parking: ' + esc(P.park) + '</div>' : '') + (P.wx ? '<div class="ph-nt">Weather: ' + esc(P.wx.d) + ', ' + esc(P.wx.hi) + '° / ' + esc(P.wx.lo) + '°</div>' : '') + '</div>';
    h += '<div class="ph-card"><table><tr><th>Time</th><th>Scene</th><th>Cast</th></tr>' + P.rows.map(function (r) { return r.meal ? '<tr><td>' + m2t(r.a) + '</td><td colspan="2" class="ph-nt">Meal</td></tr>' : '<tr><td>' + m2t(r.a) + '</td><td><b>' + esc(r.s.num) + '</b> ' + esc(r.s.h) + (r.s.needs && r.s.needs.length ? '<br><span class="ph-nt">Needs: ' + esc(r.s.needs.join(', ')) + '</span>' : '') + '</td><td>' + esc((r.s.cast || []).join(', ')) + '</td></tr>'; }).join('') + '</table></div>';
    if (P.cast.length) h += '<div class="ph-card"><table><tr><th>Role</th><th>Actor</th><th>MU</th><th>Set</th></tr>' + P.cast.map(function (c) { return '<tr><td>' + esc(c.role) + '</td><td>' + esc(c.actor) + (c.ph ? '<br><a href="tel:' + esc(String(c.ph).replace(/[^\d+]/g, '')) + '">' + esc(c.ph) + '</a>' : '') + '</td><td>' + m2t(c.mu) + '</td><td>' + m2t(c.set) + '</td></tr>'; }).join('') + '</table></div>';
    if (P.crewList && P.crewList.length) h += '<div class="ph-card"><table><tr><th>Dept</th><th>Name</th><th>Call</th></tr>' + P.crewList.map(function (c) { return '<tr><td>' + esc(c.d) + ' <span class="ph-nt">' + esc(c.r) + '</span></td><td>' + esc(c.n) + (c.ph ? '<br><a href="tel:' + esc(String(c.ph).replace(/[^\d+]/g, '')) + '">' + esc(c.ph) + '</a>' : '') + '</td><td>' + esc(c.c || '') + '</td></tr>'; }).join('') + '</table></div>';
    if (P.hosp) h += '<div class="ph-card"><div class="ph-hh">Nearest hospital</div><div>' + esc(P.hosp.n) + '</div><div class="ph-nt">' + esc(P.hosp.a) + '</div>' + (P.hosp.p ? '<a href="tel:' + esc(String(P.hosp.p).replace(/[^\d+]/g, '')) + '">' + esc(P.hosp.p) + '</a>' : '') + '</div>';
    if (P.notes) h += '<div class="ph-card"><div class="ph-hh">Notes</div><div style="white-space:pre-wrap">' + esc(P.notes) + '</div></div>';
    h += '<div class="ph-nt">Read-only copy made ' + esc(new Date(P.made).toLocaleString()) + '. The schedule may have changed since: ask for a fresh link before relying on it.</div></div>';
    inner.innerHTML = h; el.appendChild(inner); document.body.appendChild(el); document.body.style.overflow = 'hidden';
    inner.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var a = b.getAttribute('data-a');
      if (a === 'print') window.print();
      else if (a === 'ics' && P.date) {
        var ymd = P.date.replace(/-/g, ''), f = function (m) { return String(Math.floor(m / 60) % 24).padStart(2, '0') + String(m % 60).padStart(2, '0') + '00'; };
        var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//proHUB//Call sheet//EN', 'BEGIN:VEVENT', 'UID:prohub-' + slug(P.t) + '-day' + P.n + '@prohub', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''), 'SUMMARY:' + (P.t + ' - Day ' + P.n).replace(/[,;\\]/g, ' '), 'DTSTART:' + ymd + 'T' + f(P.gen), 'DTEND:' + ymd + 'T' + f(P.wrap)];
        if (P.addr) L.push('LOCATION:' + P.addr.replace(/[,;\\]/g, ' ')); L.push('END:VEVENT', 'END:VCALENDAR');
        var a2 = document.createElement('a'); a2.href = URL.createObjectURL(new Blob([L.join('\r\n') + '\r\n'], { type: 'text/calendar' })); a2.download = slug(P.t) + '_day' + P.n + '.ics'; document.body.appendChild(a2); a2.click(); setTimeout(function () { a2.remove(); }, 500);
      } else if (a === 'ics') toast('This day has no date, so there is nothing to add to a calendar.');
    });
  }
  function route() {
    var m = /[#&]share=([^&]+)/.exec(location.hash);
    if (m) { decode(m[1]).then(function (P) { if (P && P.v === 1 && P.rows) viewShare(P); else toast('That link could not be read.'); }, function (e) { toast(e.message || 'That link could not be read.'); }); return; }
    if (/#onset\b/.test(location.hash)) { var tries = 0, t = setInterval(function () { tries++; var M = g('M'); if (M && M.days && M.days.length) { clearInterval(t); openOnset(); } else if (tries > 25) { clearInterval(t); toast('Import a script and set up a schedule first.'); } }, 200); }
  }
  window.PHOnset = { open: openOnset, close: closeOnset, share: openShare, pack: pack, encode: encode, decode: decode, view: viewShare };
  window.addEventListener('hashchange', route); route();
})();
