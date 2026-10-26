/* proHUB Script Coverage: measurements and line-level findings (format, grammar, prose, dialogue).
   Every finding carries the scene, page and quoted text it came from, and a fix where one is certain. */
(function () {
  'use strict';
  var C = window.PHCov, U = C.util, L = C.LEX, W = U.W, wc = U.wc, mean = U.mean, clamp = U.clamp;

  function snip(t, i, n, len) {
    t = String(t || ''); n = n || 0; len = len || 96;
    var a = Math.max(0, i - Math.floor((len - n) / 2)), b = Math.min(t.length, a + len);
    if (b - a < len) a = Math.max(0, b - len);
    var s = t.slice(a, b).trim();
    return (a > 0 ? '…' : '') + s + (b < t.length ? '…' : '');
  }
  C.snip = snip;
  function pgN(pg) { return Math.floor(pg) + 1; }

  C.measure = function (m) {
    var X = { m: m, find: [], hit: {} };
    var S = m.scenes;

    function F(o) { o.pg = o.pg == null ? 0 : o.pg; X.find.push(o); return o; }
    X.F = F;
    function hitOf(sc, pg, q, extra) { var o = { si: sc.idx, sc: sc.num, pg: pgN(pg), q: q }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
    X.hitOf = hitOf;
    /* scan every speech / action paragraph / heading with a regex; returns cited hits */
    X.scanD = function (rx, max) {
      var out = []; rx = new RegExp(rx.source, rx.flags.replace('g', '') + 'g');
      m.speeches.forEach(function (sp) { rx.lastIndex = 0; var mm; while ((mm = rx.exec(sp.txt))) { out.push(hitOf(S[sp.sc], sp.pg, snip(sp.txt, mm.index, mm[0].length), { ch: sp.ch, m: mm[0], li: sp.li, idx: mm.index })); if (mm[0].length === 0) rx.lastIndex++; if (out.length >= (max || 400)) return; } });
      return out;
    };
    X.scanA = function (rx, max) {
      var out = []; rx = new RegExp(rx.source, rx.flags.replace('g', '') + 'g');
      m.paras.forEach(function (p) { rx.lastIndex = 0; var mm; while ((mm = rx.exec(p.txt))) { out.push(hitOf(S[p.sc], p.pg, snip(p.txt, mm.index, mm[0].length), { m: mm[0], li: p.li, idx: mm.index })); if (mm[0].length === 0) rx.lastIndex++; if (out.length >= (max || 400)) return; } });
      return out;
    };
    X.countD = function (rx) { var t = 0; m.speeches.forEach(function (sp) { t += U.count(rx, sp.txt); }); return t; };
    X.countA = function (rx) { var t = 0; m.paras.forEach(function (p) { t += U.count(rx, p.txt); }); return t; };
    X.allA = m.paras.map(function (p) { return p.txt; }).join(' ');
    X.allD = m.speeches.map(function (p) { return p.txt; }).join(' ');
    X.wA = Math.max(1, m.wordsA); X.wD = Math.max(1, m.wordsD);
    X.per10 = function (n) { return m.pages ? n / (m.pages / 10) : 0; };

    /* ---- scene intensity and shape ---- */
    var nameTok = {}; m.order.forEach(function (c) { c.name.split(/\s+/).forEach(function (w) { nameTok[w.toUpperCase()] = 1; }); });
    var stuntRx = new RegExp(window.PH_AUTO.stunt.source, 'gi'), sfxRx = new RegExp(window.PH_AUTO.sfx.source, 'gi');
    m.live.forEach(function (s) {
      var aT = s.paras.map(function (p) { return p.txt; }).join(' '), dT = s.speeches.map(function (p) { return p.txt; }).join(' ');
      var tg = U.count(stuntRx, aT) + U.count(sfxRx, aT), ex = U.count(/!/g, aT + ' ' + dT);
      var caps = (aT.match(/\b[A-Z]{4,}\b/g) || []).filter(function (w) { return !nameTok[w]; }).length;
      var conf = U.count(L.conflict, aT + ' ' + dT);
      s.aT = aT; s.dT = dT; s.tg = tg;
      s.int = 100 * (tg * 2 + ex * 0.8 + caps * 0.25 + conf * 1.2) / Math.max(60, s.words);
    });
    var sorted = m.live.map(function (s) { return s.int; }).sort(function (a, b) { return a - b; });
    m.live.forEach(function (s) { var lo = 0, hi = sorted.length; while (lo < hi) { var md = (lo + hi) >> 1; if (sorted[md] < s.int) lo = md + 1; else hi = md; } s.ip = sorted.length > 1 ? lo / (sorted.length - 1) : .5; });
    X.intMed = U.median(sorted);

    /* dead zones: long runs of low-intensity scenes */
    X.dead = [];
    (function () {
      var run = [];
      function flush() { if (run.length >= 6 || (run.length >= 3 && run.reduce(function (a, s) { return a + s.pages; }, 0) >= 9)) X.dead.push({ from: run[0], to: run[run.length - 1], n: run.length, pages: run.reduce(function (a, s) { return a + s.pages; }, 0) }); run = []; }
      m.live.forEach(function (s) { if (s.ip < 0.42) run.push(s); else flush(); }); flush();
    })();

    /* deciles */
    X.dec = function (pg) { return clamp(Math.floor(m.posOf(pg) * 10), 0, 9); };
    X.perDecile = function (arr) { var d = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; arr.forEach(function (h) { d[clamp(Math.floor(((h.pg - 1) / Math.max(1, m.pages)) * 10), 0, 9)]++; }); return d; };

    /* ---- characters ---- */
    var top = m.order.filter(function (c) { return c.speeches >= 8; }).slice(0, 25);
    X.top = top;
    var para = m.paras;
    var introAll = [];
    top.forEach(function (c) {
      var first = c.name.split(/\s+/).filter(function (w) { return !/^(DR|MR|MRS|MS|CAPT|COL|GEN|SGT|LT|THE|OLD|YOUNG|YOUNG|OFFICER|AGENT|PRIVATE|CAPTAIN|GENERAL|COLONEL|SERGEANT|DOCTOR|PROFESSOR|SIR|MISS)\.?$/.test(w); })[0] || c.name;
      c.tok = first.replace(/[^A-Za-z'’-]/g, '');
      if (c.tok.length < 3) return;
      var rx = new RegExp('\\b' + c.tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      var seen = 0;
      for (var i = 0; i < para.length; i++) {
        var mm = rx.exec(para[i].txt);
        if (mm) { c.intro = { p: para[i], idx: mm.index, text: mm[0], caps: mm[0] === mm[0].toUpperCase() && mm[0].length > 1 }; break; }
      }
      /* appearance of the character: dialogue before any mention in action */
      if (c.intro) c.introBeforeSpeech = c.intro.p.pg <= c.first + 0.01; else c.introBeforeSpeech = false;
      if (c.intro) {
        var sen = U.sentences(c.intro.p.txt), hit = sen.filter(function (x) { return rx.test(x); })[0] || '';
        var after = hit.slice(Math.max(0, hit.search(rx))).slice(0, 160);
        c.introSentence = after;
        c.phys = /\b(\d{2}s?|early|mid|late|twenties|thirties|forties|fifties|sixties|young|old|elderly|tall|short|thin|heavy|bald|beard|hair|eyes|scar|wears|dressed|wearing|handsome|beautiful|gaunt|muscular|slight|weathered|lean|stout|pale|tan)\b/i.test(after);
        c.role = (L.roles.filter(function (r) { return new RegExp('\\b' + r + '\\b', 'i').test(after); })[0]) || '';
        var pron = (after.match(/\b(he|his|him)\b/gi) || []).length - (after.match(/\b(she|her|hers)\b/gi) || []).length;
        c.gender = pron > 0 ? 'm' : pron < 0 ? 'f' : '';
      }
    });
    /* convention: characters introduced in CAPS on first mention */
    var withIntro = top.filter(function (c) { return c.intro; });
    X.capsConv = withIntro.length >= 4 && withIntro.filter(function (c) { return c.intro.caps; }).length / withIntro.length >= 0.5;

    /* minor, one-line and late characters */
    X.minor = m.order.filter(function (c) { return c.speeches <= 1; });
    X.lateChars = m.order.filter(function (c) { return c.speeches >= 6 && m.posOf(c.first * 1) > 0.55; });
    X.genericName = /^(MAN|WOMAN|GUY|GIRL|BOY|PERSON|VOICE|KID|LADY|CROWD|FIRST|SECOND|THIRD|FOURTH|ANOTHER|OTHER|MALE|FEMALE|STRANGER|GUARD|SOLDIER|OFFICER|CLERK|WAITER|WAITRESS|TECHNICIAN|ANNOUNCER|REPORTER|NURSE|DOCTOR|DRIVER)(\s+\d+|\s*#\d+|\s*(ONE|TWO|THREE|1|2|3))?$|^[A-Z ]+\s+#?\d+$/;
    /* confusable names */
    X.simNames = [];
    for (var i = 0; i < top.length; i++) for (var j = i + 1; j < top.length; j++) {
      var a = top[i].tok || '', b = top[j].tok || '';
      if (!a || !b || a === b) continue;
      if ((a[0].toUpperCase() === b[0].toUpperCase() && U.lev(a.toUpperCase(), b.toUpperCase()) <= 1) || (a.length <= 5 && b.length <= 5 && a[0].toUpperCase() === b[0].toUpperCase() && a.slice(-1).toUpperCase() === b.slice(-1).toUpperCase() && Math.abs(a.length - b.length) <= 1))
        X.simNames.push([top[i], top[j]]);
    }
    /* cue variants of the same person (DR. RAILLY / RAILLY) */
    X.variants = [];
    (function () {
      var by = {};
      m.order.forEach(function (c) { var key = c.name.split(/\s+/).slice(-1)[0].replace(/[^A-Z]/g, ''); if (key.length > 2) (by[key] = by[key] || []).push(c); });
      Object.keys(by).forEach(function (k) { var g = by[k].filter(function (c) { return c.speeches >= 2; }); if (g.length > 1 && g.some(function (c) { return c.speeches >= 5; }) && !g.some(function (c) { return /\band\b|&/i.test(c.name); })) X.variants.push(g); });
    })();

    /* protagonist and antagonist */
    m.protag = m.order[0] || null;
    X.protag = m.protag;
    X.antag = null;
    if (m.protag) {
      var pS = m.protag.scenes, cand = m.order.slice(1, 14).filter(function (c) { return c.nScenes >= 3 && c.speeches >= 6; });
      var best = -1;
      cand.forEach(function (c) {
        var tx = c.text.join(' '), thr = U.count(L.threat, tx) / Math.max(1, wc(tx)) * 100;
        var tk = c.tok && c.tok.length > 2 ? new RegExp('\\b' + c.tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i') : null, aw = 0, an = 0;
        if (tk) m.paras.forEach(function (p) { if (tk.test(p.txt)) { aw += wc(p.txt); an += U.count(L.threat, p.txt) + U.count(L.violence || /$^/, p.txt); } });
        var athr = aw ? an / aw * 100 : 0;
        var shared = 0; Object.keys(c.scenes).forEach(function (k) { if (pS[k]) shared++; });
        var sc = athr * 4 + thr * 1.5 + shared / Math.max(1, c.nScenes) * 2 + c.share * 3 + (c.role && /^(killer|colonel|captain|general|agent|sheriff|president|mayor|doctor|dr|mr|detective)$/i.test(c.role) ? 0.3 : 0);
        c.threat = athr; c.threatScore = sc; if (sc > best) { best = sc; X.antag = c; }
      });
    }

    /* ---- speeches: length, monologues, ping-pong, exposition ---- */
    X.speechLens = m.speeches.map(function (sp) { return wc(sp.txt); });
    X.avgSpeech = mean(X.speechLens);
    X.mono = m.speeches.filter(function (sp, i) { return X.speechLens[i] >= 100; });
    X.pingpong = [];
    S.forEach(function (s) {
      var run = [];
      function flush() { if (run.length >= 12) X.pingpong.push({ s: s, n: run.length, q: run[0].txt }); run = []; }
      s.speeches.forEach(function (sp, k) { var ok = wc(sp.txt) <= 6 && sp.par.length === 0; var prev = run.length ? run[run.length - 1] : null; if (ok && (!prev || prev.ch !== sp.ch)) run.push(sp); else { flush(); if (ok) run.push(sp); } });
      flush();
    });
    X.nose = X.scanD(L.onNose);
    X.expo = X.scanD(L.exposition);
    X.deflect = X.scanD(L.deflect);
    X.questions = m.speeches.filter(function (sp) { return /\?\s*$/.test(sp.txt); }).length;
    X.excl = m.speeches.filter(function (sp) { return /!\s*$/.test(sp.txt); }).length;
    X.greets = m.speeches.filter(function (sp) { return L.greet.test(sp.txt) || L.bye.test(sp.txt); });
    X.parens = m.speeches.reduce(function (a, sp) { return a + sp.par.length; }, 0);
    X.parenLong = []; X.parenAdv = [];
    m.speeches.forEach(function (sp) { sp.par.forEach(function (p) { var inner = p.replace(/^\(|\)$/g, ''); if (wc(inner) > 4) X.parenLong.push(hitOf(S[sp.sc], sp.pg, p, { ch: sp.ch })); if (/^\(?\w+ly\b/i.test(inner) && !/^(only|early)/i.test(inner)) X.parenAdv.push(hitOf(S[sp.sc], sp.pg, p, { ch: sp.ch })); }); });
    /* repeated lines */
    (function () {
      var map = {}; m.speeches.forEach(function (sp) { var k = sp.txt.toLowerCase().replace(/[^a-z ]/g, '').trim(); if (wc(k) >= 5) (map[k] = map[k] || []).push(sp); });
      X.repeats = Object.keys(map).filter(function (k) { return map[k].length >= 3; }).map(function (k) { return map[k]; });
    })();
    X.lastDlgNoPunct = m.speeches.filter(function (sp) { return sp.txt && !/[.!?…"')\]-]\s*$/.test(sp.txt) && wc(sp.txt) > 3; });

    /* ---- voice vectors ---- */
    X.voice = [];
    top.slice(0, 10).forEach(function (c) {
      if (c.speeches < 15) return;
      var tx = c.text.join(' '), n = Math.max(1, wc(tx)), sen = U.sentences(tx);
      var v = [
        mean(c.text.map(wc)),
        mean(sen.map(wc)),
        U.count(/\w('s|n't|'re|'ll|'ve|'d|'m)\b/gi, tx) / n * 100,
        U.count(/\?/g, tx) / Math.max(1, c.speeches) * 100,
        U.count(/!/g, tx) / Math.max(1, c.speeches) * 100,
        (U.count(L.profane.f, tx) + U.count(L.profane.s, tx) + U.count(L.profane.mild, tx)) / n * 100,
        mean(W(tx).map(function (w) { return w.length; })),
        U.count(/\b(i|me|my|mine|i'm|i'll|i've)\b/gi, tx) / n * 100,
        U.count(/\b(you|your|you're)\b/gi, tx) / n * 100,
        U.count(L.filler, tx) / n * 100
      ];
      X.voice.push({ c: c, v: v });
    });
    if (X.voice.length >= 2) {
      var k = X.voice[0].v.length, mu = [], sd = [];
      for (var f = 0; f < k; f++) { var col = X.voice.map(function (o) { return o.v[f]; }); mu[f] = mean(col); sd[f] = U.stdev(col) || 1; }
      X.voice.forEach(function (o) { o.z = o.v.map(function (x, f) { return (x - mu[f]) / sd[f]; }); });
      X.voicePairs = [];
      for (var a2 = 0; a2 < X.voice.length; a2++) for (var b2 = a2 + 1; b2 < X.voice.length; b2++) {
        var d = 0; for (var q = 0; q < k; q++) d += Math.pow(X.voice[a2].z[q] - X.voice[b2].z[q], 2);
        X.voicePairs.push({ a: X.voice[a2].c, b: X.voice[b2].c, d: Math.sqrt(d / k) });
      }
      X.voicePairs.sort(function (x, y) { return x.d - y.d; });
      X.voiceMin = X.voicePairs[0].d; X.voiceMean = mean(X.voicePairs.map(function (p) { return p.d; }));
    } else { X.voicePairs = []; X.voiceMin = null; X.voiceMean = null; }
    /* signature words (log-odds against everyone else) */
    (function () {
      var tot = {}, N = 0; m.order.forEach(function (c) { var t = {}; W(c.text.join(' ').toLowerCase()).forEach(function (w) { if (w.length < 4) return; t[w] = (t[w] || 0) + 1; tot[w] = (tot[w] || 0) + 1; N++; }); c.tf = t; c.nW = wc(c.text.join(' ')); });
      X.sigShare = [];
      top.slice(0, 8).forEach(function (c) {
        if (c.speeches < 15) return;
        var rest = Math.max(1, N - Object.keys(c.tf).reduce(function (a, w) { return a + c.tf[w]; }, 0)), own = Math.max(1, Object.keys(c.tf).reduce(function (a, w) { return a + c.tf[w]; }, 0));
        var sc = [];
        Object.keys(c.tf).forEach(function (w) { var a = c.tf[w], b = (tot[w] || 0) - a; if (a < 4) return; var lo = Math.log((a / own + 1e-6) / ((b + 0.5) / rest)); sc.push([w, lo, a]); });
        sc.sort(function (x, y) { return y[1] - x[1]; });
        c.sig = sc.slice(0, 8).map(function (x) { return x[0]; });
        c.sigN = sc.filter(function (x) { return x[1] > 1.6; }).length;
      });
    })();
    /* speech drift across the script */
    X.drift = [];
    top.slice(0, 6).forEach(function (c) {
      if (c.speeches < 30) return;
      var parts = [[], [], []]; var sps = m.speeches.filter(function (sp) { return sp.ch === c.name; });
      sps.forEach(function (sp, i) { parts[Math.min(2, Math.floor(i / (sps.length / 3)))].push(sp.txt); });
      var vs = parts.map(function (p) { var tx = p.join(' '), n = Math.max(1, wc(tx)); return [mean(U.sentences(tx).map(wc)), U.count(/\w('s|n't|'re|'ll|'ve|'d|'m)\b/gi, tx) / n * 100, U.count(/\?/g, tx) / Math.max(1, p.length) * 100]; });
      var dd = 0; for (var f = 0; f < 3; f++) { var col = vs.map(function (v) { return v[f]; }); dd += (Math.max.apply(null, col) - Math.min.apply(null, col)) / (Math.max.apply(null, col) + Math.min.apply(null, col) + 1e-6); }
      X.drift.push({ c: c, d: dd / 3 });
    });

    /* ---- action prose ---- */
    X.paraLong = m.paras.filter(function (p) { return p.rl > 5; });
    X.paraAvgRL = mean(m.paras.map(function (p) { return p.rl; }));
    X.unfilm = X.scanA(L.unfilm);
    X.hedge = X.scanA(L.hedge);
    X.camera = X.scanA(L.camera);
    X.passive = X.scanA(L.passive);
    X.progressive = X.scanA(L.progressive);
    X.adverbs = X.scanA(L.adverb).filter(function (h) { return !L.notAdverb.test(h.m); });
    X.past = X.countA(L.pastRx); X.pres = X.countA(L.presentRx);
    X.pastShare = X.past + X.pres ? X.past / (X.past + X.pres) : 0;
    X.sentLens = []; m.paras.forEach(function (p) { U.sentences(p.txt).forEach(function (s) { X.sentLens.push(wc(s)); }); });
    X.longSent = [];
    m.paras.forEach(function (p) { U.sentences(p.txt).forEach(function (s) { if (wc(s) > 40) X.longSent.push(hitOf(S[p.sc], p.pg, snip(s, 0, 0, 110))); }); });
    /* repeated sentence openers */
    X.openers = [];
    m.paras.forEach(function (p) {
      var sen = U.sentences(p.txt), run = 0, last = '';
      sen.forEach(function (s, i) { var w = (s.match(/^\W*(\w+)/) || [])[1]; w = w ? w.toLowerCase() : ''; if (w && w === last) run++; else { if (run >= 3) X.openers.push(hitOf(S[p.sc], p.pg, snip(p.txt, 0, 0, 100), { n: run + 1, w: last })); run = 0; } last = w; });
      if (run >= 3) X.openers.push(hitOf(S[p.sc], p.pg, snip(p.txt, 0, 0, 100), { n: run + 1, w: last }));
    });
    /* verb dominance */
    X.verbTop = (function () {
      var cnt = {}, tot = 0; var vrx = /\b(looks|turns|walks|stares|takes|moves|steps|stands|sits|pulls|runs|goes|comes|holds|smiles|nods|picks|reaches|opens|starts|begins|watches|sees|glances|grabs|puts|enters|leaves|falls|hits|stops|waits|follows|keeps|gets|makes|pushes|throws)\b/gi;
      var mm; var t = X.allA; while ((mm = vrx.exec(t))) { var w = mm[1].toLowerCase(); cnt[w] = (cnt[w] || 0) + 1; tot++; }
      var arr = Object.keys(cnt).map(function (k) { return [k, cnt[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
      return { arr: arr.slice(0, 8), tot: tot, top: arr[0] ? arr[0][1] / X.wA * 100 : 0 };
    })();
    X.ttr = (function () { var ws = W(X.allA.toLowerCase()).slice(0, 8000), set = {}; ws.forEach(function (w) { set[w] = 1; }); return ws.length ? Object.keys(set).length / ws.length : 0; })();
    X.sensory = {}; Object.keys(L.sense).forEach(function (k) { X.sensory[k] = X.scanA(L.sense[k]); });
    X.simile = X.scanA(L.simile);
    X.melo = X.scanA(L.melo);
    X.body = X.scanA(L.body);
    X.silence = X.scanA(L.silence);
    X.humor = X.scanA(L.humor).concat(X.scanD(L.humor));
    X.release = X.scanA(L.release);

    /* flesch-kincaid grade of action prose */
    X.fk = (function () {
      var ws = W(X.allA), sen = Math.max(1, X.sentLens.length), syl = 0;
      ws.forEach(function (w) { var s = w.toLowerCase().replace(/[^a-z]/g, '').replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g); syl += s ? s.length : 1; });
      return ws.length ? 0.39 * (ws.length / sen) + 11.8 * (syl / ws.length) - 15.59 : 0;
    })();

    /* ---- headings, locations, time ---- */
    X.headings = S.map(function (s) {
      var h = s.heading || '', hasTod = /\s[-–—]\s*[A-Z][A-Z .\/]*$/.test(h) || /\b(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|AFTERNOON|SUNSET|SUNRISE|LATER|CONTINUOUS|MOMENTS LATER|SAME|NOON|MIDNIGHT|TWILIGHT)\b/.test(h);
      return { s: s, h: h, hasTod: hasTod };
    });
    X.noTod = X.headings.filter(function (o) { return !o.s.omit && !o.hasTod; });
    X.locCount = {};
    m.live.forEach(function (s) { var k = (s.loc || '').replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim(); if (!k) return; X.locCount[k] = (X.locCount[k] || 0) + 1; });
    X.locs = Object.keys(X.locCount).sort(function (a, b) { return X.locCount[b] - X.locCount[a]; });
    X.locVariants = [];
    for (var a3 = 0; a3 < X.locs.length; a3++) for (var b3 = a3 + 1; b3 < X.locs.length && b3 < 400; b3++) {
      var x = X.locs[a3], y = X.locs[b3];
      if (x.length > 5 && y.length > 5 && (U.lev(x, y) <= 2 || (x.indexOf(y) === 0 && x.length - y.length <= 14) || (y.indexOf(x) === 0 && y.length - x.length <= 14)) && x !== y) X.locVariants.push([x, y]);
    }
    X.int = m.live.filter(function (s) { return /^INT/.test(s.ie); }).length;
    X.ext = m.live.length - X.int;
    X.night = m.live.filter(function (s) { return /NIGHT|DUSK|EVENING|MIDNIGHT/.test(s.heading) || s.tod === 'NIGHT'; }).length;
    X.trans = []; S.forEach(function (s) { s.trans.forEach(function (t) { X.trans.push(hitOf(s, t.pg, t.text, { li: t.li })); }); });
    X.cutTo = X.trans.filter(function (t) { return /CUT TO|SMASH CUT|MATCH CUT/i.test(t.q); });

    /* ---- line-level format and grammar findings with fixes ---- */
    X.fixes = [];
    function fix(f) { X.fixes.push(f); }
    var rowsAD = [];
    S.forEach(function (s) { s.lines.forEach(function (l) { if (l.type === 'action' || l.type === 'dialogue') rowsAD.push({ l: l, s: s }); }); });
    var dashDouble = 0, dashEm = 0, ellDots = 0, ellChar = 0, ellSpaced = 0, qStraight = 0, qCurly = 0, dbl = 0, sgl = 0;
    rowsAD.forEach(function (o) {
      var t = o.l.text;
      dashDouble += U.count(/\w--\w|\s--\s|\w--$|^--\w/g, t); dashEm += U.count(/—/g, t);
      ellDots += U.count(/\.\.\./g, t); ellChar += U.count(/…/g, t); ellSpaced += U.count(/\. \. \./g, t);
      qStraight += U.count(/["']/g, t) - U.count(/\w'\w/g, t); qCurly += U.count(/[“”]/g, t);
      dbl += U.count(/[.!?]\s{2}\S/g, t); sgl += U.count(/[.!?] \S/g, t);
    });
    X.style = { dashDouble: dashDouble, dashEm: dashEm, ellDots: ellDots, ellChar: ellChar, ellSpaced: ellSpaced, qStraight: qStraight, qCurly: qCurly, dbl: dbl, sgl: sgl };
    function pgOfRow(o) { var p = null; for (var i = 0; i < o.s.paras.length; i++) if (o.s.paras[i].rows.indexOf(o.l) >= 0) p = o.s.paras[i]; if (!p) for (var j = 0; j < o.s.speeches.length; j++) if (o.s.speeches[j].rows.indexOf(o.l) >= 0) p = o.s.speeches[j]; return p ? p.pg : o.s.pg0; }
    var ABBR = /(?:\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr|Capt|Col|Gen|Sgt|Lt|Mt|vs|etc|No|Fr|Rev|Hon)|\b[A-Za-z]|a\.m|p\.m|e\.g|i\.e|U\.S|D\.C)\.$/;
    var rules = [
      { id: 'G01', cls: 'grammar', name: 'Repeated word', rx: /\b([A-Za-z]{2,})\s+\1\b/gi, ok: function (mm) { return !/^(had|that|very|no|so|bye|knock|ha|ho|ah|oh|tick|boom|bang|go|never|well|yes|now|blah|choo|cha|la|na|yeah|please|come|run|more|long|little|bad|big|mm|hmm|walla|buffalo|pa|ma|ding|dong)$/i.test(mm[1]) && !/^(\w)\1/.test(mm[1]) ; }, repl: function (mm) { return mm[1]; }, msg: function (mm) { return 'The word “' + mm[1] + '” is repeated.'; } },
      { id: 'G02', cls: 'grammar', name: 'could of / should of', rx: /\b(could|should|would|must|might) of\b/gi, repl: function (mm) { return mm[1] + ' have'; }, msg: function (mm) { return '“' + mm[0] + '” should be “' + mm[1] + ' have”.'; } },
      { id: 'G03', cls: 'grammar', name: 'your / you’re', rx: /\byour (going|not|welcome|right|wrong|being|gonna|always|never|just|here|there|crazy|kidding|sure|doing|getting|making|telling|late|early|lucky|dead|alive|fired|under arrest|all|so|too|very|really|a (good|great|bad|fool|liar|genius|idiot|man|woman))\b/gi, repl: function (mm) { return "you're " + mm[0].slice(5); }, msg: function () { return '“your” here should be “you’re” (you are).'; } },
      { id: 'G04', cls: 'grammar', name: 'its / it’s', rx: /\bits (a|an|the|not|been|going|just|only|time|so|too|very|really|my|your|his|her|their|our|all|like|okay|ok|true|late|over|gone|done|what|how|about|me|you|him|us|no|never|always|still|already|now|here|there)\b/gi, ok: function (mm, t, i) { return !/\b(its) (own|way)\b/i.test(mm[0]) && !/\b(of|in|on|at|from|by|with|and|to)\s+$/i.test(t.slice(Math.max(0, i - 6), i)) === true || true; }, repl: function (mm) { return "it's " + mm[0].slice(4); }, msg: function () { return '“its” here should be “it’s” (it is / it has).'; } },
      { id: 'G05', cls: 'grammar', name: 'it’s possessive', rx: /\bit's (own|tail|head|eyes|name|face|color|colour|mouth|owner|surface|shell|wings|body|master|mother|nest|paws|teeth|claws|skin)\b/gi, repl: function (mm) { return 'its ' + mm[1]; }, msg: function () { return '“it’s” here should be the possessive “its”.'; } },
      { id: 'G06', cls: 'grammar', name: 'their / there / they’re', rx: /\b(?:there|they're) (car|house|home|friends?|mother|father|eyes|hands|own|kids|children|faces|heads|guns|weapons|boss|names?|lives|money|team|family|parents|clothes)\b/gi, repl: function (mm) { return 'their ' + mm[1]; }, msg: function () { return 'This looks like the possessive “their”.'; } },
      { id: 'G07', cls: 'grammar', name: 'then / than', rx: /\b(more|less|better|worse|bigger|smaller|rather|other|older|younger|faster|slower|greater|higher|lower|larger|taller|longer|shorter|easier|harder|stronger|weaker|louder|closer|farther|further) then\b/gi, repl: function (mm) { return mm[1] + ' than'; }, msg: function () { return '“then” after a comparison should be “than”.'; } },
      { id: 'G08', cls: 'grammar', name: 'to / too', rx: /\bto (much|many|late|early|soon|bad)\b(?! (of|for|to))/gi, ok: function (mm, t, i) { return !/\b(go|get|come|have|had|want|used|going|how|due|up|back|close)\s*$/i.test(t.slice(Math.max(0, i - 8), i)); }, repl: function (mm) { return 'too ' + mm[1]; }, msg: function () { return '“to” here should be “too”.'; } },
      { id: 'G09', cls: 'grammar', name: 'a / an', rx: /\b(a|an) ([A-Za-z][A-Za-z'-]*)\b/g, ok: function (mm) { var w = mm[2], art = mm[1].toLowerCase(), lw = w.toLowerCase(); if (w === w.toUpperCase() && w.length > 1) return false; var vowelSound = /^(?:[aeiou]|hour|honest|honor|honour|heir)/.test(lw) && !/^(?:uni(?!nt)|use|usu|uti|ubiq|eu|one|once|ewe|euro)/.test(lw); var consSound = !vowelSound; if (art === 'a' && vowelSound) return /^[aeiou]/.test(lw) || /^h/.test(lw); if (art === 'an' && consSound) return /^[b-df-hj-np-tv-z]/.test(lw); return false; }, repl: function (mm) { var lw = mm[2].toLowerCase(); var vs = /^(?:[aeiou]|hour|honest|honor|honour|heir)/.test(lw) && !/^(?:uni(?!nt)|use|usu|uti|ubiq|eu|one|once|ewe|euro)/.test(lw); return (mm[1] === mm[1].toUpperCase() ? (vs ? 'AN' : 'A') : (mm[1][0] === 'A' ? (vs ? 'An' : 'A') : (vs ? 'an' : 'a'))) + ' ' + mm[2]; }, msg: function (mm) { return '“' + mm[1] + ' ' + mm[2] + '”: the article does not match the sound of the next word.'; } },
      { id: 'G10', cls: 'grammar', name: 'lose / loose', rx: /\b(will|to|don't|can't|might|gonna|not|never|about to|going to) loose\b/gi, repl: function (mm) { return mm[1] + ' lose'; }, msg: function () { return '“loose” here should be “lose”.'; } },
      { id: 'G11', cls: 'grammar', name: 'Subject-verb agreement', rx: /\b(he|she|it) (don't|are|were|have)\b|\b(they|we|you) (is|was|has|does)\b/gi, onlyAction: true, ok: function (mm, t, i) { return !/["“]/.test(t.slice(0, i)) && !/\b(you|they) was\b/i.test(mm[0]) || /\b(he|she|it) (don't|are|were)\b/i.test(mm[0]); }, repl: null, msg: function (mm) { return '“' + mm[0] + '”: check subject-verb agreement.'; } },
      { id: 'G12', cls: 'format', name: 'Space after punctuation', rx: /([a-z]{2,})([,;:])([A-Za-z])/g, ok: function (mm) { return true; }, repl: function (mm) { return mm[1] + mm[2] + ' ' + mm[3]; }, msg: function () { return 'A space is missing after the punctuation mark.'; } },
      { id: 'G13', cls: 'format', name: 'Space after sentence end', rx: /([a-z]{3,})([.!?])([A-Z][a-z]+)/g, ok: function (mm, t, i) { return !/\b(www|http|com|org|net)\b/i.test(t); }, repl: function (mm) { return mm[1] + mm[2] + ' ' + mm[3]; }, msg: function () { return 'A space is missing after the full stop.'; } },
      { id: 'G14', cls: 'format', name: 'Space before punctuation', rx: /(\w) +([,;:!?])(?!\.)/g, ok: function (mm, t, i) { return !/^\s*[-–—]/.test(t) && !/\s[-–—]\s*$/.test(t.slice(0, i + 1)); }, repl: function (mm) { return mm[1] + mm[2]; }, msg: function () { return 'There is a space before the punctuation mark.'; } },
      { id: 'G15', cls: 'grammar', name: 'Lowercase “i”', rx: /(^|[\s(])i(?=[\s,.!?;:'’)]|$)(?!\.)/g, ok: function (mm, t, i) { return !/\b[a-z]\.\s*$/.test(t.slice(0, i)); }, repl: function (mm) { return mm[1] + 'I'; }, msg: function () { return 'The pronoun “I” should be capitalised.'; } },
      { id: 'G16', cls: 'grammar', name: 'Sentence starts lowercase', rx: /([a-z]{2,}[.!?]["')\]]?\s+)([a-z])/g, onlyAction: true, ok: function (mm, t, i) { var before = t.slice(0, i + mm[1].length).trim(); return !ABBR.test(before.replace(/["')\]]+$/, '')) && !/\.\.\.$/.test(before) && !/\b(a|p)\.m\.$/i.test(before); }, repl: function (mm) { return mm[1] + mm[2].toUpperCase(); }, msg: function () { return 'A sentence begins with a lowercase letter.'; } },
      { id: 'G17', cls: 'format', name: 'Double full stop', rx: /([a-z])\.\.(?!\.)/g, repl: function (mm) { return mm[1] + '.'; }, msg: function () { return 'Two full stops in a row; use one, or three for an ellipsis.'; } },
      { id: 'G18', cls: 'grammar', name: 'Missing apostrophe', rx: /\b(dont|cant|wont|isnt|doesnt|didnt|couldnt|wouldnt|shouldnt|wasnt|werent|havent|hasnt|youre|theyre|thats|whats|couldve|wouldve|shouldve|aint)\b/gi, ok: function (mm) { return true; }, repl: function (mm) { var k = mm[1].toLowerCase(), r = L.typos[k]; return mm[1][0] === mm[1][0].toUpperCase() ? r[0].toUpperCase() + r.slice(1) : r; }, msg: function (mm) { return 'Missing apostrophe in “' + mm[1] + '”.'; } },
      { id: 'G19', cls: 'grammar', name: 'Misspelling', rx: new RegExp('\\b(' + Object.keys(L.typos).filter(function (k) { return !L.typoRisky[k] && !/^(dont|cant|wont|isnt|doesnt|didnt|couldnt|wouldnt|shouldnt|wasnt|werent|havent|hasnt|youre|theyre|thats|whats|couldve|wouldve|shouldve|aint)$/.test(k); }).join('|') + ')\\b', 'gi'), repl: function (mm) { var r = L.typos[mm[1].toLowerCase()]; return mm[1][0] === mm[1][0].toUpperCase() ? r[0].toUpperCase() + r.slice(1) : r; }, msg: function (mm) { return '“' + mm[1] + '” is a common misspelling of “' + L.typos[mm[1].toLowerCase()] + '”.'; } },
      { id: 'G20', cls: 'format', name: 'Trailing space or tab', rx: /[ \t]+$/g, repl: function () { return ''; }, msg: function () { return 'Trailing whitespace.'; }, raw: true },
      { id: 'G21', cls: 'format', name: 'Repeated !! or ??', rx: /([!?])\1{2,}/g, repl: function (mm) { return mm[1] + mm[1]; }, msg: function () { return 'Three or more exclamation or question marks in a row.'; } }
    ];
    var byRule = {};
    rowsAD.forEach(function (o) {
      var t = o.l.text, ty = o.l.type;
      rules.forEach(function (r) {
        if (r.onlyAction && ty !== 'action') return;
        r.rx.lastIndex = 0; var mm, guard = 0;
        while ((mm = r.rx.exec(t)) && guard++ < 6) {
          if (mm[0].length === 0) { r.rx.lastIndex++; continue; }
          if (r.ok && !r.ok(mm, t, mm.index)) continue;
          var rep = r.repl ? r.repl(mm) : null;
          if (rep != null && rep === mm[0]) continue;
          var f = { id: r.id, cls: r.cls, name: r.name, li: o.l.i, si: o.s.idx, sc: o.s.num, pg: pgN(pgOfRow(o)), start: mm.index, end: mm.index + mm[0].length, from: mm[0], to: rep, msg: r.msg(mm), q: snip(t, mm.index, mm[0].length) };
          (byRule[r.id] = byRule[r.id] || []).push(f); fix(f);
        }
      });
    });
    X.byRule = byRule;
    /* style consistency fixes (minority style -> majority style) */
    function styleFix(id, name, majName, minList, minRx, majRepl, msg) {
      rowsAD.forEach(function (o) {
        var t = o.l.text, mm; minRx.lastIndex = 0;
        while ((mm = minRx.exec(t))) { var f = { id: id, cls: 'format', name: name, li: o.l.i, si: o.s.idx, sc: o.s.num, pg: pgN(pgOfRow(o)), start: mm.index, end: mm.index + mm[0].length, from: mm[0], to: majRepl(mm), msg: msg, q: snip(t, mm.index, mm[0].length) }; (byRule[id] = byRule[id] || []).push(f); fix(f); if (mm[0].length === 0) minRx.lastIndex++; }
      });
    }
    var st = X.style, totDash = st.dashDouble + st.dashEm;
    if (totDash >= 12 && Math.min(st.dashDouble, st.dashEm) > 0 && Math.min(st.dashDouble, st.dashEm) / totDash <= 0.3) {
      if (st.dashDouble >= st.dashEm) styleFix('F11', 'Dash style', 'double hyphen', 0, /—/g, function () { return '--'; }, 'This script mostly uses “--”; this dash is “—”.');
      else styleFix('F11', 'Dash style', 'em dash', 0, /(\w)--(\w)|\s--\s/g, function (mm) { return mm[1] ? mm[1] + '—' + mm[2] : '—'; }, 'This script mostly uses “—”; this dash is “--”.');
    }
    var totEll = st.ellDots + st.ellChar + st.ellSpaced;
    if (totEll >= 12 && st.ellDots / totEll >= 0.7 && (st.ellChar + st.ellSpaced) > 0) styleFix('F12', 'Ellipsis style', 'three dots', 0, /…|\. \. \./g, function () { return '...'; }, 'This script mostly uses “...”.');
    else if (totEll >= 12 && st.ellChar / totEll >= 0.7 && (st.ellDots + st.ellSpaced) > 0) styleFix('F12', 'Ellipsis style', 'ellipsis character', 0, /\.\.\.|\. \. \./g, function () { return '…'; }, 'This script mostly uses “…”.');
    if (st.dbl > 20 && st.sgl > 0 && st.sgl / (st.dbl + st.sgl) <= 0.25) styleFix('F13', 'Sentence spacing', 'two spaces', 0, /([.!?])\s(?=\S)(?!\s)/g, function (mm) { return mm[1] + '  '; }, 'Most sentences are followed by two spaces; this one has one.');
    else if (st.sgl > 20 && st.dbl > 0 && st.dbl / (st.dbl + st.sgl) <= 0.25) styleFix('F13', 'Sentence spacing', 'one space', 0, /([.!?])\s{2,}(?=\S)/g, function (mm) { return mm[1] + ' '; }, 'Most sentences are followed by one space; this one has two.');

    /* caps convention for character names in action: first mention in CAPS, later mentions in lower case */
    X.capsFindings = [];
    if (X.capsConv) {
      top.forEach(function (c) {
        if (!c.tok || c.tok.length < 3 || !c.intro || X.genericName.test(c.name)) return;
        var rx = new RegExp('\\b' + c.tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
        var seen = 0, later = [];
        m.paras.forEach(function (p) {
          p.rows.forEach(function (row) {
            var t = row.text, mm; rx.lastIndex = 0;
            while ((mm = rx.exec(t))) {
              var isCaps = mm[0] === mm[0].toUpperCase(); seen++;
              if (seen === 1 && !isCaps) { var f1 = { id: 'F20', cls: 'format', name: 'Character introduction', li: row.i, si: p.sc, sc: S[p.sc].num, pg: pgN(p.pg), start: mm.index, end: mm.index + mm[0].length, from: mm[0], to: mm[0].toUpperCase(), msg: 'First appearance of ' + c.name + ' in the action should be in capitals.', q: snip(t, mm.index, mm[0].length) }; (byRule.F20 = byRule.F20 || []).push(f1); fix(f1); }
              else if (seen > 1 && isCaps && p.pg > c.intro.p.pg + 0.5) later.push({ row: row, p: p, mm: mm });
            }
          });
        });
        if (later.length >= 3) {
          later.forEach(function (o) { var tt = o.row.text; var f2 = { id: 'F21', cls: 'format', name: 'Repeated capitals', li: o.row.i, si: o.p.sc, sc: S[o.p.sc].num, pg: pgN(o.p.pg), start: o.mm.index, end: o.mm.index + o.mm[0].length, from: o.mm[0], to: o.mm[0].charAt(0) + o.mm[0].slice(1).toLowerCase(), msg: c.name + ' is in capitals again after the introduction; only the first appearance is capitalised.', q: snip(tt, o.mm.index, o.mm[0].length) }; (byRule.F21 = byRule.F21 || []).push(f2); fix(f2); });
          X.capsFindings.push({ c: c, n: later.length });
        }
      });
    }
    return X;
  };
})();
