/* proHUB Script Coverage: version diff, scene alignment, change log and score comparison. */
(function () {
  'use strict';
  var C = window.PHCov, U = C.util, wc = U.wc;
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function r1(x) { return Math.round(x * 10) / 10; }

  /* classic LCS over arrays of keys; returns list of [i,j] matches */
  function lcs(a, b) {
    var n = a.length, m = b.length;
    if (n * m > 4e6) return lcsBand(a, b);
    var t = []; for (var i = 0; i <= n; i++) { t.push(new Uint16Array(m + 1)); }
    for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    var out = []; i = 0; j = 0;
    while (i < n && j < m) { if (a[i] === b[j]) { out.push([i, j]); i++; j++; } else if (t[i + 1][j] >= t[i][j + 1]) i++; else j++; }
    return out;
  }
  /* very large inputs: trim common prefix/suffix then fall back to greedy anchors */
  function lcsBand(a, b) {
    var out = [], s = 0; while (s < a.length && s < b.length && a[s] === b[s]) { out.push([s, s]); s++; }
    var ea = a.length - 1, eb = b.length - 1, tail = [];
    while (ea >= s && eb >= s && a[ea] === b[eb]) { tail.push([ea, eb]); ea--; eb--; }
    var pos = {}; for (var j = s; j <= eb; j++) (pos[b[j]] = pos[b[j]] || []).push(j);
    var last = s - 1;
    for (var i = s; i <= ea; i++) { var ps = pos[a[i]]; if (!ps) continue; for (var k = 0; k < ps.length; k++) if (ps[k] > last) { out.push([i, ps[k]]); last = ps[k]; break; } }
    return out.concat(tail.reverse());
  }
  function wordDiff(a, b) {
    var wa = String(a).split(/(\s+)/).filter(function (x) { return x !== ''; }), wb = String(b).split(/(\s+)/).filter(function (x) { return x !== ''; });
    var ka = wa.map(function (x) { return x.toLowerCase(); }), kb = wb.map(function (x) { return x.toLowerCase(); });
    var mt = lcs(ka, kb), out = [], i = 0, j = 0;
    function flush(ai, bj) { if (ai > i) out.push(['-', wa.slice(i, ai).join('')]); if (bj > j) out.push(['+', wb.slice(j, bj).join('')]); }
    mt.forEach(function (p) { flush(p[0], p[1]); out.push(['=', wa[p[0]]]); i = p[0] + 1; j = p[1] + 1; });
    flush(wa.length, wb.length);
    /* merge adjacent same-op */
    var mg = []; out.forEach(function (o) { var l = mg[mg.length - 1]; if (l && l[0] === o[0]) l[1] += o[1]; else mg.push(o.slice()); });
    return mg;
  }
  function sim(a, b) {
    var A = norm(a).split(' '), B = norm(b).split(' '); if (!A[0] && !B[0]) return 1;
    var sa = {}; A.forEach(function (w) { sa[w] = (sa[w] || 0) + 1; }); var hit = 0; B.forEach(function (w) { if (sa[w] > 0) { sa[w]--; hit++; } });
    return 2 * hit / (A.length + B.length);
  }
  function sceneText(s) { return s.lines.map(function (l) { return l.text; }).join('\n'); }

  /* ---- align scenes of two models ---- */
  function alignScenes(mA, mB) {
    var A = mA.scenes, B = mB.scenes, key = function (s) { return norm(s.heading) + '|' + norm(sceneText(s)).slice(0, 80); };
    var mt = lcs(A.map(key), B.map(key)), pairs = [], usedA = {}, usedB = {};
    mt.forEach(function (p) { pairs.push([p[0], p[1]]); usedA[p[0]] = 1; usedB[p[1]] = 1; });
    /* fuzzy: unmatched scenes in the gaps between anchors */
    var anchors = [[-1, -1]].concat(pairs).concat([[A.length, B.length]]);
    for (var k = 0; k < anchors.length - 1; k++) {
      var a0 = anchors[k][0] + 1, a1 = anchors[k + 1][0] - 1, b0 = anchors[k][1] + 1, b1 = anchors[k + 1][1] - 1;
      var cands = [];
      for (var i = a0; i <= a1; i++) for (var j = b0; j <= b1; j++) { var s = sim(sceneText(A[i]), sceneText(B[j])), hs = norm(A[i].heading) === norm(B[j].heading) ? 0.15 : 0; if (s + hs >= 0.45) cands.push([s + hs, i, j]); }
      cands.sort(function (x, y) { return y[0] - x[0]; });
      var lastI = -1, lastJ = -1, taken = [];
      cands.forEach(function (c) { if (usedA[c[1]] || usedB[c[2]]) return; var ok = taken.every(function (t) { return (t[0] < c[1]) === (t[1] < c[2]) && t[0] !== c[1] && t[1] !== c[2]; }); if (ok) { taken.push([c[1], c[2]]); usedA[c[1]] = usedB[c[2]] = 1; } });
      taken.forEach(function (t) { pairs.push(t); });
    }
    pairs.sort(function (x, y) { return x[1] - y[1]; });
    /* moved scenes: strong match elsewhere among still-unmatched */
    var un = [], ub = [];
    A.forEach(function (s, i) { if (!usedA[i]) un.push(i); }); B.forEach(function (s, j) { if (!usedB[j]) ub.push(j); });
    var moved = [];
    un.forEach(function (i) { var best = -1, bj = -1; ub.forEach(function (j) { if (usedB[j]) return; var s = sim(sceneText(A[i]), sceneText(B[j])); if (s > best) { best = s; bj = j; } }); if (best >= 0.7) { usedB[bj] = 1; usedA[i] = 1; moved.push([i, bj]); } });
    return { pairs: pairs, moved: moved, removed: A.map(function (s, i) { return i; }).filter(function (i) { return !usedA[i]; }), added: B.map(function (s, j) { return j; }).filter(function (j) { return !usedB[j]; }) };
  }

  function lineDiff(la, lb) {
    var ka = la.map(function (l) { return norm(l.type + ' ' + l.text); }), kb = lb.map(function (l) { return norm(l.type + ' ' + l.text); });
    var mt = lcs(ka, kb), hunks = [], i = 0, j = 0;
    function gap(ai, bj) {
      var rem = la.slice(i, ai), add = lb.slice(j, bj), n = Math.min(rem.length, add.length);
      /* pair similar replaced lines for word-level diff */
      var used = {};
      for (var x = 0; x < rem.length; x++) {
        var bestS = 0, bestY = -1; for (var y = 0; y < add.length; y++) { if (used[y]) continue; var s = sim(rem[x].text, add[y].text); if (s > bestS) { bestS = s; bestY = y; } }
        if (bestY >= 0 && bestS >= 0.35) { used[bestY] = 1; rem[x]._pair = bestY; rem[x]._s = bestS; }
      }
      var yDone = 0;
      for (x = 0; x < rem.length; x++) {
        var p = rem[x]._pair;
        if (p != null) {
          for (var y2 = yDone; y2 < p; y2++) if (!used[y2] || true) { if (!add[y2]._shown) { hunks.push({ op: '+', b: add[y2].text, type: add[y2].type, bi: add[y2].i }); add[y2]._shown = 1; } }
          hunks.push({ op: '~', a: rem[x].text, b: add[p].text, type: rem[x].type, words: wordDiff(rem[x].text, add[p].text), ai: rem[x].i, bi: add[p].i }); add[p]._shown = 1; yDone = Math.max(yDone, p + 1);
        } else hunks.push({ op: '-', a: rem[x].text, type: rem[x].type, ai: rem[x].i });
      }
      add.forEach(function (l) { if (!l._shown) hunks.push({ op: '+', b: l.text, type: l.type, bi: l.i }); });
    }
    mt.forEach(function (p) { gap(p[0], p[1]); hunks.push({ op: '=', a: la[p[0]].text, b: lb[p[1]].text, type: lb[p[1]].type, ai: la[p[0]].i, bi: lb[p[1]].i }); i = p[0] + 1; j = p[1] + 1; });
    gap(la.length, lb.length);
    return hunks;
  }
  function hstats(h) {
    var s = { add: 0, del: 0, chg: 0, wAdd: 0, wDel: 0 };
    h.forEach(function (x) {
      if (x.op === '+') { s.add++; s.wAdd += wc(x.b); } else if (x.op === '-') { s.del++; s.wDel += wc(x.a); }
      else if (x.op === '~') { s.chg++; x.words.forEach(function (w) { if (w[0] === '+') s.wAdd += wc(w[1]); if (w[0] === '-') s.wDel += wc(w[1]); }); }
    });
    return s;
  }

  C.diff = function (rawA, rawB, opts) {
    var mA = C.model(rawA, opts), mB = C.model(rawB, opts), al = alignScenes(mA, mB), scenes = [];
    var pairMap = {}; al.pairs.forEach(function (p) { pairMap[p[1]] = p[0]; });
    var movedMap = {}; al.moved.forEach(function (p) { movedMap[p[1]] = p[0]; });
    var remaining = al.removed.slice();
    mB.scenes.forEach(function (sb, j) {
      var ia = pairMap[j], mv = false; if (ia == null && movedMap[j] != null) { ia = movedMap[j]; mv = true; }
      if (ia == null) { var h = sb.lines.map(function (l) { return { op: '+', b: l.text, type: l.type, bi: l.i }; }); scenes.push({ status: 'added', b: sb, bnum: sb.num, hunks: h, stats: { add: h.length, del: 0, chg: 0, wAdd: wc(sceneText(sb)), wDel: 0 }, pages: sb.pages }); return; }
      var sa = mA.scenes[ia], h2 = lineDiff(sa.lines, sb.lines), st = hstats(h2), changed = st.add + st.del + st.chg > 0;
      scenes.push({ status: mv ? 'moved' : changed ? 'changed' : (sa.num !== sb.num ? 'renumbered' : 'same'), a: sa, b: sb, anum: sa.num, bnum: sb.num, hunks: h2, stats: st, pages: sb.pages, dp: sb.pages - sa.pages });
    });
    /* insert removed scenes at their original neighbour position */
    remaining.forEach(function (i) {
      var sa = mA.scenes[i], at = scenes.length; for (var k = 0; k < scenes.length; k++) { if (scenes[k].a && scenes[k].a.idx > sa.idx) { at = k; break; } }
      var h = sa.lines.map(function (l) { return { op: '-', a: l.text, type: l.type, ai: l.i }; });
      scenes.splice(at, 0, { status: 'removed', a: sa, anum: sa.num, hunks: h, stats: { add: 0, del: h.length, chg: 0, wAdd: 0, wDel: wc(sceneText(sa)) }, pages: 0, dp: -sa.pages });
    });
    var D = { mA: mA, mB: mB, scenes: scenes };
    D.totals = { added: scenes.filter(function (s) { return s.status === 'added'; }).length, removed: scenes.filter(function (s) { return s.status === 'removed'; }).length, changed: scenes.filter(function (s) { return s.status === 'changed'; }).length, moved: scenes.filter(function (s) { return s.status === 'moved'; }).length, same: scenes.filter(function (s) { return s.status === 'same' || s.status === 'renumbered'; }).length,
      wAdd: scenes.reduce(function (a, s) { return a + s.stats.wAdd; }, 0), wDel: scenes.reduce(function (a, s) { return a + s.stats.wDel; }, 0), pagesA: r1(mA.pages), pagesB: r1(mB.pages), wordsA: mA.words, wordsB: mB.words, scenesA: mA.live.length, scenesB: mB.live.length };
    /* characters */
    var ca = {}, cb = {}; mA.order.forEach(function (c) { ca[c.name] = c; }); mB.order.forEach(function (c) { cb[c.name] = c; });
    D.chars = { added: Object.keys(cb).filter(function (k) { return !ca[k]; }).map(function (k) { return { name: k, speeches: cb[k].speeches }; }), removed: Object.keys(ca).filter(function (k) { return !cb[k]; }).map(function (k) { return { name: k, speeches: ca[k].speeches }; }),
      changed: Object.keys(cb).filter(function (k) { return ca[k] && Math.abs(cb[k].speeches - ca[k].speeches) >= 3; }).map(function (k) { return { name: k, from: ca[k].speeches, to: cb[k].speeches }; }).sort(function (x, y) { return Math.abs(y.to - y.from) - Math.abs(x.to - x.from); }) };
    D.log = C.changeLog(D);
    return D;
  };

  C.changeLog = function (D) {
    var out = [], T = D.totals;
    function pg(s) { return s && s.pages != null ? ' (' + r1(Math.abs(s.pages || 0)) + ' pp)' : ''; }
    function lab(s) { return 'Sc ' + (s.bnum != null ? s.bnum : s.anum) + (s.b ? ' ' + s.b.heading : s.a ? ' ' + s.a.heading : ''); }
    out.push({ kind: 'summary', text: 'Version B is ' + T.pagesB + ' pages (' + (T.pagesB - T.pagesA >= 0 ? '+' : '') + r1(T.pagesB - T.pagesA) + ') and ' + T.scenesB + ' scenes (' + (T.scenesB - T.scenesA >= 0 ? '+' : '') + (T.scenesB - T.scenesA) + '). ' + T.added + ' scene(s) added, ' + T.removed + ' removed, ' + T.changed + ' changed, ' + T.moved + ' moved, ' + T.same + ' untouched. About ' + T.wAdd + ' words written and ' + T.wDel + ' cut.' });
    D.scenes.forEach(function (s, k) {
      if (s.status === 'same') return;
      var t, st = s.stats;
      if (s.status === 'added') t = lab(s) + ' is new' + pg(s) + '.';
      else if (s.status === 'removed') t = 'Sc ' + s.anum + ' ' + s.a.heading + ' was cut' + pg(s) + '.';
      else if (s.status === 'moved') t = lab(s) + ' moved (was Sc ' + s.anum + ').' + (st.add + st.del + st.chg ? ' Also edited.' : '');
      else if (s.status === 'renumbered') t = 'Sc ' + s.anum + ' is now Sc ' + s.bnum + ' (' + s.b.heading + ').';
      else {
        var parts = []; if (st.chg) parts.push(st.chg + ' line' + (st.chg > 1 ? 's' : '') + ' reworded'); if (st.add) parts.push(st.add + ' added'); if (st.del) parts.push(st.del + ' removed');
        t = lab(s) + ': ' + parts.join(', ') + ' (+' + st.wAdd + '/-' + st.wDel + ' words).';
        var ex = s.hunks.filter(function (h) { return h.op === '~'; })[0] || s.hunks.filter(function (h) { return h.op === '+'; })[0];
        if (ex) t += ' e.g. “' + C.snip(ex.b, 0, 0, 80) + '”';
      }
      out.push({ kind: s.status, sc: s.bnum != null ? s.bnum : s.anum, si: s.b ? s.b.idx : null, k: k, text: t });
    });
    if (D.chars.added.length) out.push({ kind: 'cast', text: 'New speaking characters: ' + D.chars.added.map(function (c) { return U.title(c.name) + ' (' + c.speeches + ')'; }).join(', ') + '.' });
    if (D.chars.removed.length) out.push({ kind: 'cast', text: 'Characters who no longer speak: ' + D.chars.removed.map(function (c) { return U.title(c.name) + ' (' + c.speeches + ')'; }).join(', ') + '.' });
    D.chars.changed.slice(0, 5).forEach(function (c) { out.push({ kind: 'cast', text: U.title(c.name) + ' goes from ' + c.from + ' to ' + c.to + ' speeches.' }); });
    return out;
  };

  /* ---- compare the analyses of two versions ---- */
  C.compareReports = function (Ra, Rb) {
    var o = { overall: [Ra.overall, Rb.overall], cats: {}, axes: {}, params: [], issues: {} };
    Object.keys(Rb.cats).forEach(function (k) { o.cats[k] = [Ra.cats[k].score, Rb.cats[k].score]; });
    Object.keys(Rb.axes).forEach(function (k) { o.axes[k] = [Ra.axes[k].score, Rb.axes[k].score]; });
    Rb.params.forEach(function (p, i) { var a = Ra.params[i]; if (a && a.s != null && p.s != null && Math.abs(p.s - a.s) >= 0.5) o.params.push({ id: p.id, name: p.name, from: a.s, to: p.s, d: r1(p.s - a.s), ev: p.ev }); });
    o.params.sort(function (x, y) { return y.d - x.d; });
    o.improved = o.params.filter(function (x) { return x.d > 0; }); o.regressed = o.params.filter(function (x) { return x.d < 0; }).reverse();
    var ca = {}, cb = {}; Ra.issues.forEach(function (i) { ca[i.rule] = (ca[i.rule] || 0) + 1; }); Rb.issues.forEach(function (i) { cb[i.rule] = (cb[i.rule] || 0) + 1; });
    Object.keys(ca).concat(Object.keys(cb)).forEach(function (k) { if (o.issues[k]) return; o.issues[k] = [ca[k] || 0, cb[k] || 0]; });
    var fx = Ra.issues.filter(function (i) { return i.sev === 'fix'; }).length, fy = Rb.issues.filter(function (i) { return i.sev === 'fix'; }).length;
    o.fixesFrom = fx; o.fixesTo = fy;
    o.text = [];
    var d = r1(Rb.overall - Ra.overall);
    o.text.push('Overall ' + Ra.overall.toFixed(1) + ' → ' + Rb.overall.toFixed(1) + (d ? ' (' + (d > 0 ? '+' : '') + d + ')' : ' (unchanged)') + '. Mechanical fixes outstanding: ' + fx + ' → ' + fy + '.');
    o.improved.slice(0, 4).forEach(function (x) { o.text.push('Better: ' + x.name + ' ' + x.from + ' → ' + x.to + '.'); });
    o.regressed.slice(0, 4).forEach(function (x) { o.text.push('Worse: ' + x.name + ' ' + x.from + ' → ' + x.to + '. ' + x.ev); });
    return o;
  };
})();
