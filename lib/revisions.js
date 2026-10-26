/* proHUB script revisions: colour sequence, change marks, locked page numbers (12, 12A, 12B) and revised-page output.
   State lives in localStorage under prohub_revisions_v1. The script itself is the transmitted master (prehub_master_v1). */
(function () {
  if (window.PHRev) return;
  var KEY = 'prohub_revisions_v1', MKEY = 'prehub_master_v1';
  var COLORS = ['WHITE', 'BLUE', 'PINK', 'YELLOW', 'GREEN', 'GOLDENROD', 'BUFF', 'SALMON', 'CHERRY'];
  var TINT = { WHITE: null, BLUE: [0.62, 0.78, 1], PINK: [1, 0.72, 0.82], YELLOW: [1, 0.96, 0.55], GREEN: [0.66, 0.92, 0.68], GOLDENROD: [0.93, 0.78, 0.35], BUFF: [0.94, 0.86, 0.68], SALMON: [1, 0.68, 0.6], CHERRY: [0.9, 0.35, 0.4] };

  function jget(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function iso(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function hash(s) { s = String(s).replace(/\s+/g, ' ').trim().toLowerCase(); var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function lineHash(l) { return hash((l.type || '') + '|' + (l.text || '')); }

  function load() { var s = jget(KEY); if (!s || typeof s !== 'object') s = {}; s.revs = s.revs || []; s.lock = s.lock || { on: false, pages: [] }; return s; }
  function save(s) { return jset(KEY, s); }

  function colorName(n) { var c = COLORS[n % COLORS.length], r = Math.floor(n / COLORS.length); return r === 0 ? c : (r === 1 ? 'DOUBLE ' : 'TRIPLE ') + c; }
  function baseColor(name) { return String(name || 'WHITE').replace(/^(DOUBLE|TRIPLE)\s+/, ''); }
  function counts(lines) { var m = {}; lines.forEach(function (l) { if (!String(l.text || '').trim()) return; var h = lineHash(l); m[h] = (m[h] || 0) + 1; }); return m; }

  function status() {
    var s = load(), last = s.revs[s.revs.length - 1] || null;
    return { revs: s.revs.map(function (r) { return { n: r.n, color: r.color, date: r.date, changed: r.changed }; }), current: last ? last.color : null, date: last ? last.date : null, next: colorName(s.revs.length), lock: !!s.lock.on, lockPages: (s.lock.pages || []).length };
  }

  /* Issue a new revision. The first issue is the WHITE baseline. Later issues star every line that is not in the previous issue. */
  function issue() {
    var master = jget(MKEY); if (!master || !master.lines || !master.lines.length) return { ok: false, msg: 'There is no script to issue yet.' };
    var s = load(), prev = s.revs[s.revs.length - 1] || null, n = s.revs.length, color = colorName(n), changed = 0;
    if (prev && prev.counts) {
      var pool = {}; Object.keys(prev.counts).forEach(function (k) { pool[k] = prev.counts[k]; });
      master.lines.forEach(function (l) {
        if (!String(l.text || '').trim()) { delete l.rv; return; }
        var h = lineHash(l);
        if (pool[h] > 0) { pool[h]--; delete l.rv; } else { l.rv = 1; changed++; }
      });
      if (!changed) return { ok: false, msg: 'Nothing has changed since the ' + prev.color + ' revision, so there is nothing to issue.' };
    } else { master.lines.forEach(function (l) { delete l.rv; }); }
    var date = iso();
    s.revs.push({ n: n, color: color, date: date, changed: changed, counts: counts(master.lines) });
    master.shoot = { color: color, date: date };
    jset(MKEY, master); save(s);
    return { ok: true, color: color, changed: changed, date: date };
  }

  function undoIssue() {
    var s = load(); if (s.revs.length < 1) return { ok: false, msg: 'No revisions to undo.' };
    var removed = s.revs.pop(), master = jget(MKEY);
    if (master) { var prev = s.revs[s.revs.length - 1]; master.shoot = prev ? { color: prev.color, date: prev.date } : null; if (!prev) delete master.shoot; jset(MKEY, master); }
    save(s); return { ok: true, color: removed.color };
  }

  /* Locked pages: store the lines found on each page so that later pagination can be matched back to the locked numbers. */
  function setLock(pageLogs) {
    var s = load(), seen = {}, starts = [];
    pageLogs.forEach(function (log) { log.forEach(function (h, i) { var k = h + '#' + (seen[h] || 0); seen[h] = (seen[h] || 0) + 1; if (i === 0) starts.push(k); }); if (!log.length) starts.push(''); });
    s.lock = { on: true, at: iso(), pages: pageLogs.map(function (p) { return p.slice(0, 80); }), starts: starts }; save(s); return s.lock.pages.length;
  }
  /* For the layout pass: where each locked page began, so unchanged pages keep their breaks. */
  function lockInfo() { var s = load(); if (!s.lock.on || !s.lock.starts || !s.lock.starts.length) return null; var map = {}; s.lock.starts.forEach(function (k, i) { if (k && map[k] === undefined) map[k] = i; }); return { map: map }; }
  function unlock() { var s = load(); s.lock.on = false; save(s); }
  function relock() { var s = load(); if (s.lock.pages && s.lock.pages.length) { s.lock.on = true; save(s); return true; } return false; }

  function letters(k) { var o = ''; k = k + 1; while (k > 0) { var r = (k - 1) % 26; o = String.fromCharCode(65 + r) + o; k = Math.floor((k - 1) / 26); } return o; }

  /* labelPages([[hash,...],...]) -> ['1','2','2A','3',...] */
  function labelPages(logs) {
    var s = load(), out = [];
    if (!s.lock.on || !s.lock.pages.length) return logs.map(function (_, i) { return String(i + 1); });
    var where = {}; s.lock.pages.forEach(function (pg, pi) { pg.forEach(function (h) { (where[h] = where[h] || {})[pi] = 1; }); });
    var used = {}, suffix = {}, lastBase = 1;
    logs.forEach(function (log, i) {
      var score = {}, best = -1, bs = 0;
      log.forEach(function (h) { var w = where[h]; if (w) Object.keys(w).forEach(function (pi) { score[pi] = (score[pi] || 0) + 1; }); });
      Object.keys(score).forEach(function (pi) { if (score[pi] > bs) { bs = score[pi]; best = +pi; } });
      var base = best >= 0 ? best + 1 : lastBase;
      if (base < lastBase) base = lastBase;
      var label;
      if (!used[base]) { used[base] = 1; label = String(base); } else { suffix[base] = (suffix[base] || 0); label = base + letters(suffix[base]); suffix[base]++; }
      lastBase = base; out.push(label);
    });
    return out;
  }

  /* Called by the script page builder once the whole script is laid out. pgs = [{pg, log:[hash], rv:bool}] */
  function finishPages(D, pgs, o) {
    o = o || {};
    window.PH_LASTPAGES = pgs.map(function (p) { return p.log; });
    var labels = labelPages(window.PH_LASTPAGES), st = status(), color = st.current, tint = TINT[baseColor(color)];
    var saved = D.pg, hdr = o.hdr !== false;
    pgs.forEach(function (p, i) {
      D.pg = p.pg;
      if (hdr && i > 0) D.drawLine(labels[i] + '.', D.pg.w - 72 - 60, 42, { font: 'm', size: 12, align: 'right', w: 60 });
      if (p.rv && color && color !== 'WHITE') {
        if (!o.hasLabel) D.drawLine(color + ' REV. ' + (st.date ? st.date.slice(5, 7) + '/' + st.date.slice(8, 10) + '/' + st.date.slice(0, 4) : ''), D.pg.w - 72 - 200, 56, { font: 'm', size: 9, align: 'right', w: 200 });
        if (o.tint !== false && tint && !(D.o && D.o.bw)) {
          try { p.pg.page.drawRectangle({ x: 0, y: 0, width: p.pg.w, height: p.pg.h, color: D.L.rgb(tint[0], tint[1], tint[2]), opacity: 0.28, borderWidth: 0 }); } catch (e) { }
        }
      }
    });
    D.pg = saved;
    if (o.revisedOnly && pgs.some(function (p) { return p.rv; })) {
      for (var i = pgs.length - 1; i >= 0; i--) {
        if (pgs[i].rv) continue;
        var idx = D.pages.indexOf(pgs[i].pg); if (idx < 0) continue;
        try { D.pdf.removePage(idx); D.pages.splice(idx, 1); } catch (e) { }
      }
    }
    return labels;
  }

  window.PHRev = { COLORS: COLORS, TINT: TINT, h: hash, lineHash: lineHash, load: load, status: status, issue: issue, undoIssue: undoIssue, setLock: setLock, lockInfo: lockInfo, unlock: unlock, relock: relock, labelPages: labelPages, finishPages: finishPages, baseColor: baseColor };
})();
