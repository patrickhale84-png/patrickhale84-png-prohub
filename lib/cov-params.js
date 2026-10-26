/* proHUB Script Coverage: the 100-parameter matrix (P01-P100, eight axes).
   Each parameter is measured from the script and returns a 1-10 score, the evidence, and cited instances.
   Parameters that rules cannot judge return no score and say why; they are left out of every average. */
(function () {
  'use strict';
  var C = window.PHCov, U = C.util, L = C.LEX, W = U.W, wc = U.wc, mean = U.mean, clamp = U.clamp, band = U.band, lin = U.lin;
  var P = C.PARAMS = [];
  function def(id, axis, name, w, fn) { P.push({ id: id, axis: axis, name: name, weight: w, fn: fn }); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function pc(x) { return Math.round(x * 100) + '%'; }
  function sc(h) { return 'Sc ' + h.sc + ' (p. ' + h.pg + ')'; }
  function first(a, n) { return (a || []).slice(0, n || 4); }
  function cname(c) { return U.title(c.name); }

  C.AXES = {
    CHAR: { label: 'Character', color: '#3ABFBF' }, PLOT: { label: 'Plot', color: '#7C5CBF' }, DIAL: { label: 'Dialogue', color: '#E07B39' }, ORIG: { label: 'Originality', color: '#D4A034' },
    EMOT: { label: 'Emotional engagement', color: '#E84393' }, THEME: { label: 'Theme', color: '#2E86AB' }, COMM: { label: 'Commercial', color: '#9AA5B1' }, CRAFT: { label: 'Craft', color: '#7FB069' }
  };

  /* ---------- lexicons used only here ---------- */
  var REG = {
    anger: rx('angry anger furious rage hate hated damn bastard idiot shut_up bullshit enough how_dare fuck screw'),
    fear: rx('afraid scared terrified fear frightened panic trembling nervous worried run hide danger help'),
    joy: rx('laughs laughing smile smiles grin grins happy glad wonderful great love beautiful thank thanks funny'),
    sorrow: rx('sorry sad cry cries crying tears miss lost gone grief mourn alone lonely regret'),
    tender: rx('love dear darling please gently softly hold hug embrace kind care promise forgive'),
    tension: rx('listen careful quiet wait watch behind steady slowly whisper now move')
  };
  function rx(s) { return U.rxList(s); }
  var EMP = U.rxList('helps saves protects comforts kneels hugs laughs jokes smiles alone lonely afraid hurt sorry thank thanks please gentle gently kind pets feeds carries');
  var STOP = {}; 'the and that this with have from they will would there their what about which when your were been into than them then some could other just like over also back only know want going think very much more most make made even down well here take come good right look said says didn dont cant its youre thats theres hes shes you him her his she for are was but not can all out one now get got how who why did has had off our too say see yes yeah okay'.split(/\s+/).forEach(function (w) { STOP[w] = 1; });
  function content(txt) { var o = {}; W(String(txt).toLowerCase()).forEach(function (w) { if (w.length > 3 && !STOP[w]) o[w] = (o[w] || 0) + 1; }); return o; }
  function cosDist(a, b) { var dot = 0, na = 0, nb = 0, k; for (k in a) { na += a[k] * a[k]; if (b[k]) dot += a[k] * b[k]; } for (k in b) nb += b[k] * b[k]; return na && nb ? 1 - dot / Math.sqrt(na * nb) : 1; }
  function jac(a, b) { var i = 0, u = 0, k; for (k in a) { u++; if (b[k]) i++; } for (k in b) if (!a[k]) u++; return u ? i / u : 0; }

  /* ---------- shared, lazily computed pieces ---------- */
  function memo(ctx, key, fn) { return ctx.cache[key] || (ctx.cache[key] = fn()); }
  function protSent(ctx) {
    return memo(ctx, 'protSent', function () {
      var m = ctx.m, p = m.protag, out = []; if (!p) return out;
      var tok = (ctx.X.top.filter(function (c) { return c === p; })[0] || {}).tok || p.name.split(/\s+/)[0];
      var rg = new RegExp('^\\W*(?:' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b\\s+([A-Za-z\'’-]+)', 'i');
      m.paras.forEach(function (para) { U.sentences(para.txt).forEach(function (s) { var mm = rg.exec(s); if (mm) out.push({ txt: s, verb: mm[1].toLowerCase(), pg: para.pg, si: para.sc }); }); });
      return out;
    });
  }
  function themeStats(ctx) {
    return memo(ctx, 'theme', function () {
      var m = ctx.m, X = ctx.X, fam = {}, tot = 0;
      Object.keys(L.themes).forEach(function (k) {
        var rgx = L.themes[k], f = { name: k, dial: 0, act: 0, dec: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], chars: {}, last: 0, hits: [], words: {} };
        m.speeches.forEach(function (sp) { var mm = sp.txt.match(rgx); if (mm) { f.dial += mm.length; f.dec[clamp(Math.floor(m.posOf(sp.pg) * 10), 0, 9)] += mm.length; f.chars[sp.ch] = (f.chars[sp.ch] || 0) + mm.length; if (m.posOf(sp.pg) > 0.9) f.last += mm.length; mm.forEach(function (w) { w = w.toLowerCase(); f.words[w] = (f.words[w] || 0) + 1; }); if (f.hits.length < 40) f.hits.push(X.hitOf(m.scenes[sp.sc], sp.pg, C.snip(sp.txt, sp.txt.search(rgx), 5), { ch: sp.ch })); } });
        m.paras.forEach(function (p) { var mm = p.txt.match(rgx); if (mm) { f.act += mm.length; f.dec[clamp(Math.floor(m.posOf(p.pg) * 10), 0, 9)] += mm.length; if (m.posOf(p.pg) > 0.9) f.last += mm.length; mm.forEach(function (w) { w = w.toLowerCase(); f.words[w] = (f.words[w] || 0) + 1; }); } });
        f.total = f.dial + f.act; tot += f.total; fam[k] = f;
      });
      var arr = Object.keys(fam).map(function (k) { fam[k].share = tot ? fam[k].total / tot : 0; return fam[k]; }).sort(function (a, b) { return b.total - a.total; });
      return { arr: arr, tot: tot };
    });
  }
  function registers(txt) { var o = {}; Object.keys(REG).forEach(function (k) { o[k] = U.count(REG[k], txt); }); return o; }
  function actSlices(m) { return [m.live.filter(function (s) { return m.scenePos(s) < 1 / 3; }), m.live.filter(function (s) { var p = m.scenePos(s); return p >= 1 / 3 && p < 2 / 3; }), m.live.filter(function (s) { return m.scenePos(s) >= 2 / 3; })]; }
  function meanIP(a) { return a.length ? mean(a.map(function (s) { return s.ip; })) : 0; }
  function gname(x) { return x ? U.title(x.name || x) : 'the protagonist'; }
  function fmtRange(fmt) { return { FEATURE: [88, 122], TV60: [42, 62], TV30: [20, 36], SHORT: [2, 20], PILOT: [45, 68] }[fmt] || [88, 122]; }

  /* ================= CHARACTER ================= */
  def('P01', 'CHAR', 'Protagonist Arc Clarity', 1.4, function (c) {
    var m = c.m, p = m.protag; if (!p) return { s: 1, ev: 'No speaking character could be identified, so no protagonist can be measured.' };
    var share = p.share, pres = p.nScenes / Math.max(1, m.live.length), pgFirst = Math.floor(p.first) + 1;
    var s = 0.4 * band(share * 100, [18, 50], [9, 68]) + 0.3 * lin(pres, 0.22, 0.65) + 0.3 * band(pgFirst, [1, 6], [1, 16]);
    var fs = m.speeches.filter(function (x) { return x.ch === p.name; })[0];
    return { s: s, ev: cname(p) + ' carries ' + pc(share) + ' of the dialogue, appears in ' + p.nScenes + ' of ' + m.live.length + ' scenes (' + pc(pres) + ') and first speaks on p. ' + pgFirst + '.', cites: fs ? [c.X.hitOf(m.scenes[fs.sc], fs.pg, C.snip(fs.txt, 0, 0, 100), { ch: fs.ch })] : [] };
  });
  def('P02', 'CHAR', 'Protagonist Agency', 1.3, function (c) {
    var m = c.m, X = c.X, p = m.protag; if (!p) return { s: null, ev: 'No protagonist found.' };
    var ps = protSent(c), act = ps.filter(function (x) { return !L.observe.test(x.verb); }), ratio = ps.length ? act.length / ps.length : 0;
    var goals = m.speeches.filter(function (sp) { return sp.ch === p.name && (sp.txt.match(L.selfGoal) || []).length; }), goalRate = goals.length / Math.max(1, p.speeches) * 100;
    var s = ps.length >= 10 ? 0.6 * lin(ratio, 0.5, 0.9) + 0.4 * lin(goalRate, 3, 16) : lin(goalRate, 3, 16);
    return { s: s, ev: ps.length >= 10 ? pc(ratio) + ' of ' + ps.length + ' action sentences about ' + cname(p) + ' use an active verb rather than looking, watching or waiting; ' + goals.length + ' of ' + p.speeches + ' speeches state a decision or goal (“I’ll…”, “we have to…”).' : goals.length + ' of ' + p.speeches + ' speeches state a decision or goal.', cites: first(goals.map(function (sp) { return X.hitOf(m.scenes[sp.sc], sp.pg, C.snip(sp.txt, 0, 0, 100)); }), 3) };
  });
  def('P03', 'CHAR', 'Protagonist Interiority', 1.2, function (c) {
    var m = c.m, X = c.X, p = m.protag; if (!p) return { s: null, ev: 'No protagonist found.' };
    var ps = protSent(c), re = ps.filter(function (x) { return L.reaction.test(x.txt) || L.body.test(x.txt); }); L.reaction.lastIndex = 0; L.body.lastIndex = 0;
    var rate = ps.length ? re.length / ps.length * 100 : 0, par = p.par / Math.max(1, p.speeches) * 100;
    var s = 0.7 * band(rate, [9, 40], [2, 65]) + 0.3 * band(par, [3, 25], [0, 45]);
    return { s: s, ev: re.length + ' of ' + ps.length + ' action sentences show ' + cname(p) + ' reacting physically (smiles, hesitates, flinches, swallows); parentheticals on ' + Math.round(par) + '% of speeches.', cites: first(re.map(function (x) { return X.hitOf(m.scenes[x.si], x.pg, C.snip(x.txt, 0, 0, 100)); }), 3) };
  });
  def('P04', 'CHAR', 'Supporting Character Depth', 1.1, function (c) {
    var m = c.m, sup = m.order.slice(1, 6); if (sup.length < 2) return { s: 3, ev: 'Fewer than three speaking characters were found, so the supporting cast is thin.' };
    var ok = sup.filter(function (x) { return x.nScenes >= 4 && x.speeches >= 15 && x.intro; });
    var s = lin(ok.length / sup.length, 0.2, 1);
    return { s: s, ev: ok.length + ' of the next ' + sup.length + ' characters (' + sup.map(cname).join(', ') + ') have enough scenes, speeches and an introduction to read as full people.', cites: sup.filter(function (x) { return ok.indexOf(x) < 0; }).map(function (x) { return { sc: '', pg: Math.floor(x.first) + 1, q: cname(x) + ': ' + x.nScenes + ' scenes, ' + x.speeches + ' speeches' + (x.intro ? '' : ', never introduced in the action') }; }).slice(0, 3) };
  });
  def('P05', 'CHAR', 'Antagonist Complexity', 1.2, function (c) {
    var a = c.X.antag, m = c.m, X = c.X; if (!a) return { s: null, ev: 'No single antagonist is identifiable from dialogue. The opposing force may be circumstantial, institutional or off-screen, which rules cannot judge.' };
    var sp = m.speeches.filter(function (x) { return x.ch === a.name; }), lens = sp.map(function (x) { return wc(x.txt); }), cv = U.stdev(lens) / (mean(lens) || 1), q = sp.filter(function (x) { return /\?/.test(x.txt); }).length / sp.length;
    var s = 0.35 * lin(a.nScenes, 2, 14) + 0.25 * band(a.threat, [0.8, 3.5], [0.2, 7]) + 0.2 * lin(cv, 0.4, 1.1) + 0.2 * band(q * 100, [8, 35], [0, 60]);
    return { s: s, ev: 'The strongest opposing voice is ' + cname(a) + ' (' + a.nScenes + ' scenes, ' + a.speeches + ' speeches, menace words at ' + a.threat.toFixed(1) + ' per 100 words, ' + pc(q) + ' of speeches are questions).', cites: first(sp.filter(function (x) { return wc(x.txt) >= 25; }).map(function (x) { return X.hitOf(m.scenes[x.sc], x.pg, C.snip(x.txt, 0, 0, 100)); }), 2) };
  });
  def('P06', 'CHAR', 'Character Voice Differentiation', 1.3, function (c) {
    var X = c.X; if (X.voiceMin == null) return { s: null, ev: 'Too few characters with 15 or more speeches to compare voices.' };
    var s = 0.6 * lin(X.voiceMin, 0.35, 1.05) + 0.4 * lin(X.voiceMean, 0.9, 1.5), p = X.voicePairs[0];
    return { s: s, ev: 'Speech style (speech length, sentence length, contractions, questions, profanity, pronouns) separates the voices by an average of ' + X.voiceMean.toFixed(2) + '; the closest pair is ' + cname(p.a) + ' and ' + cname(p.b) + ' (' + p.d.toFixed(2) + ').', cites: [{ sc: '', pg: 0, q: cname(p.a) + ' and ' + cname(p.b) + ' sound most alike. Compare ' + cname(p.a) + '’s speech averaging ' + r1(mean(p.a.text.map(wc))) + ' words with ' + cname(p.b) + '’s ' + r1(mean(p.b.text.map(wc))) + '.' }] };
  });
  def('P07', 'CHAR', 'Backstory Through Action', 1.1, function (c) {
    var X = c.X, tell = X.scanD(L.backstoryTell), show = X.scanA(L.backstoryShow), r = show.length / (show.length + tell.length + 1);
    return { s: lin(r, 0.15, 0.75), ev: 'Backstory is told in dialogue ' + tell.length + ' times (“when I was…”, “years ago…”) and shown through objects and marks ' + show.length + ' times (a scar, a faded photo, a medal).', cites: first(tell, 2).concat(first(show, 2)), why: 'Told backstory: ' + first(tell, 2).map(sc).join(', ') + '. Shown: ' + first(show, 2).map(sc).join(', ') + '.' };
  });
  def('P08', 'CHAR', 'Relationship Dynamics', 1.0, function (c) {
    var m = c.m, pairs = {};
    m.live.forEach(function (s) { for (var i = 1; i < s.speeches.length; i++) { var a = s.speeches[i - 1].ch, b = s.speeches[i].ch; if (a === b) continue; var k = [a, b].sort().join(' / '); pairs[k] = (pairs[k] || 0) + 1; } });
    var arr = Object.keys(pairs).map(function (k) { return [k, pairs[k]]; }).sort(function (a, b) { return b[1] - a[1]; }), strong = arr.filter(function (x) { return x[1] >= 12; });
    return { s: band(strong.length, [3, 10], [1, 20]), ev: strong.length + ' pairs trade at least a dozen exchanges; the busiest are ' + arr.slice(0, 3).map(function (x) { return U.title(x[0]) + ' (' + x[1] + ')'; }).join(', ') + '.' };
  });
  def('P09', 'CHAR', 'Character Speech Consistency', 1.0, function (c) {
    var d = c.X.drift; if (!d.length) return { s: null, ev: 'No character has 30 or more speeches, so consistency across the script cannot be measured.' };
    var avg = mean(d.map(function (x) { return x.d; })), worst = d.slice().sort(function (a, b) { return b.d - a.d; })[0];
    return { s: band(avg * 100, [0, 14], [0, 36]), ev: 'Across the first, middle and last thirds, speech style drifts by ' + Math.round(avg * 100) + '% on average; most inconsistent: ' + cname(worst.c) + ' (' + Math.round(worst.d * 100) + '%).' };
  });
  def('P10', 'CHAR', 'Physical Characterization', 0.9, function (c) {
    var X = c.X, set = X.top.slice(0, 12).filter(function (x) { return x.intro; }); if (set.length < 3) return { s: 3, ev: 'Few of the main speakers are introduced in the action.' };
    var ok = set.filter(function (x) { return x.phys; }), missing = set.filter(function (x) { return !x.phys; });
    return { s: lin(ok.length / set.length, 0.2, 0.85), ev: ok.length + ' of ' + set.length + ' main characters get a physical or age cue on first appearance.', cites: first(missing.map(function (x) { return X.hitOf(c.m.scenes[x.intro.p.sc], x.intro.p.pg, cname(x) + ': “' + C.snip(x.introSentence || '', 0, 0, 80) + '”'); }), 3) };
  });
  def('P11', 'CHAR', 'Character Contradiction / Complexity', 1.1, function (c) {
    var p = c.m.protag; if (!p) return { s: null, ev: 'No protagonist found.' };
    var r = registers(p.text.join(' ') + ' ' + protSent(c).map(function (x) { return x.txt; }).join(' ')), n = Object.keys(r).filter(function (k) { return r[k] >= 3; });
    return { s: lin(n.length, 2, 5.5), ev: cname(p) + ' shows ' + n.length + ' of 6 emotional registers (' + n.join(', ') + ') with at least three markers each.' };
  });
  def('P12', 'CHAR', 'Minor Character Completeness', 0.8, function (c) {
    var m = c.m, X = c.X, minor = m.order.filter(function (x) { return x.speeches <= 3; }); if (minor.length < 4) return { s: null, ev: 'Too few minor speakers to measure.' };
    var gen = minor.filter(function (x) { return X.genericName.test(x.name); });
    return { s: lin(1 - gen.length / minor.length, 0.45, 0.95), ev: gen.length + ' of ' + minor.length + ' minor speakers carry placeholder names (' + gen.slice(0, 5).map(function (x) { return x.name; }).join(', ') + (gen.length > 5 ? '…' : '') + ').' };
  });
  def('P13', 'CHAR', 'Protagonist Arc Completion', 1.4, function (c) {
    var m = c.m, p = m.protag; if (!p) return { s: null, ev: 'No protagonist found.' };
    var late = m.speeches.filter(function (sp) { return sp.ch === p.name && m.posOf(sp.pg) >= 0.88; }), q1 = [], q4 = [];
    m.speeches.forEach(function (sp) { if (sp.ch !== p.name) return; var f = m.posOf(sp.pg); if (f < 0.25) q1.push(sp.txt); else if (f >= 0.75) q4.push(sp.txt); });
    var dist = cosDist(content(q1.join(' ')), content(q4.join(' ')));
    var s = 0.5 * (late.length >= 3 ? 10 : late.length ? 6 : 2) + 0.5 * lin(dist, 0.3, 0.7);
    return { s: s, ev: cname(p) + ' speaks ' + late.length + ' times in the final 12% of the script, and the vocabulary of the last quarter differs from the first by ' + pc(dist) + '.' };
  });
  def('P14', 'CHAR', 'Ensemble Screen-time Balance', 0.8, function (c) {
    var t = c.m.order.slice(0, 6), tot = U.sum(t.map(function (x) { return x.words; })) || 1, H = 0; t.forEach(function (x) { var p = x.words / tot; if (p > 0) H -= p * Math.log(p); });
    var Hn = t.length > 1 ? H / Math.log(t.length) : 0;
    return { s: band(Hn, [0.6, 0.95], [0.35, 1.01]), ev: 'Dialogue is spread across the top six speakers at a balance of ' + Hn.toFixed(2) + ' (1.0 is perfectly even): ' + t.map(function (x) { return cname(x) + ' ' + pc(x.words / tot); }).join(', ') + '.' };
  });

  /* ================= PLOT ================= */
  def('P15', 'PLOT', 'Three-Act Structure', 1.3, function (c) {
    var m = c.m, X = c.X, peaks = m.live.filter(function (s) { return s.ip >= 0.7; }), got = [], miss = [];
    [[0.25, 'end of act one'], [0.5, 'midpoint'], [0.75, 'end of act two']].forEach(function (w) {
      var near = peaks.filter(function (s) { return Math.abs(m.scenePos(s) - w[0]) <= 0.07; }).sort(function (a, b) { return b.ip - a.ip; })[0];
      if (near) got.push(X.hitOf(near, near.pg0, 'The ' + w[1] + ' window: ' + near.heading, {})); else miss.push(w[1] + ' (near p. ' + Math.round(w[0] * m.pages) + ')');
    });
    var clim = m.live.filter(function (s) { var f = m.scenePos(s); return f >= 0.82 && f <= 0.97; }).sort(function (a, b) { return b.ip - a.ip; })[0];
    var n = got.length + (clim && clim.ip >= 0.75 ? 1 : 0);
    return { s: 2 + 2 * n, ev: n + ' of 4 expected turning zones (about 25%, 50%, 75% and the climax at 82-97%) contain a high-intensity scene.' + (miss.length ? ' No clear peak at: ' + miss.join('; ') + '.' : ''), cites: got };
  });
  def('P16', 'PLOT', 'Non-linear Coherence', 1.0, function (c) {
    var m = c.m, X = c.X, fl = X.scanA(/\b(flashback|years (earlier|later|ago)|back to (the )?present|memory|one (year|week|month) (earlier|later))\b/i, 40).concat(m.live.filter(function (s) { return /FLASHBACK|YEARS (EARLIER|LATER)|MEMORY|LATER THAT|BACK TO PRESENT/.test(s.heading); }).map(function (s) { return X.hitOf(s, s.pg0, s.heading); }));
    if (!fl.length) return { s: null, ev: 'The script reads as linear (no flashback or time-jump markers), so non-linear coherence does not apply.' };
    var heads = m.live.filter(function (s) { return /FLASHBACK|YEARS (EARLIER|LATER)|MEMORY|PRESENT|LATER|EARLIER/.test(s.heading); }).length;
    return { s: lin(heads / Math.max(1, fl.length), 0.1, 0.9), ev: fl.length + ' time-shift cues found and ' + heads + ' scene headings label the shift.', cites: first(fl, 3) };
  });
  def('P17', 'PLOT', 'Setup and Payoff', 1.4, function (c) {
    var pp = C.plantPay(c.m, c.X); if (pp.total < 4) return { s: null, ev: 'Too few repeated objects to measure setup and payoff.' };
    var r = pp.pairs.length / pp.total;
    return { s: lin(r, 0.1, 0.5), ev: pp.pairs.length + ' of ' + pp.total + ' recurring objects are planted in the first third and used again in the last third: ' + first(pp.pairs, 4).map(function (x) { return x.word + ' (Sc ' + x.first.num + ' to Sc ' + x.last.num + ')'; }).join(', ') + '.', cites: first(pp.pairs, 4).map(function (x) { return c.X.hitOf(x.first, x.first.pg0, 'The ' + x.word + ' is set up here and returns in Sc ' + x.last.num + '.'); }) };
  });
  def('P18', 'PLOT', 'Pacing: No Dead Zones', 1.3, function (c) {
    var X = c.X, d = X.dead;
    return { s: clamp(10 - 2.5 * d.length - (d.length ? Math.max(0, d.reduce(function (a, z) { return a + z.pages; }, 0) - 14) * 0.15 : 0), 1, 10), ev: d.length ? d.length + ' stretch(es) of low-intensity scenes: ' + d.slice(0, 4).map(function (z) { return 'Sc ' + z.from.num + '-' + z.to.num + ' (pp. ' + (Math.floor(z.from.pg0) + 1) + '-' + Math.ceil(z.to.pg0 + z.to.pages) + ', ' + z.n + ' scenes)'; }).join('; ') + '.' : 'No run of six or more low-intensity scenes, and no flat stretch of nine pages or more.', cites: d.slice(0, 3).map(function (z) { return X.hitOf(z.from, z.from.pg0, 'The stretch begins here: ' + z.from.heading); }) };
  });
  def('P19', 'PLOT', 'Scene Economy', 1.2, function (c) {
    var m = c.m, seen = {}, stat = [];
    m.live.forEach(function (s) { var neu = s.speeches.some(function (sp) { if (seen[sp.ch]) return false; return true; }); s.speeches.forEach(function (sp) { seen[sp.ch] = 1; }); var spk = {}; s.speeches.forEach(function (sp) { spk[sp.ch] = 1; }); if (s.ip < 0.28 && Object.keys(spk).length <= 1 && s.pages < 1.1 && !neu) stat.push(s); });
    var r = stat.length / Math.max(1, m.live.length);
    return { s: lin(1 - r, 0.72, 0.97), ev: stat.length + ' of ' + m.live.length + ' scenes do only one job (one speaker or none, low intensity, no new character).', cites: first(stat.map(function (s) { return c.X.hitOf(s, s.pg0, s.heading); }), 4) };
  });
  def('P20', 'PLOT', 'Inciting Incident Placement', 1.2, function (c) {
    var m = c.m, X = c.X, p = m.protag, hi = m.live.filter(function (s) { return s.pg0 >= 3 && s.ip >= 0.75; })[0], goal = null;
    if (p) { for (var i = 0; i < m.speeches.length; i++) { var sp = m.speeches[i]; if (sp.ch === p.name && sp.pg > 2 && (sp.txt.match(L.selfGoal) || []).length && wc(sp.txt) >= 6) { goal = sp; break; } } }
    var pgA = hi ? hi.pg0 + 1 : 999, pgB = goal ? goal.pg + 1 : 999, pg = Math.min(pgA, pgB);
    if (pg === 999) return { s: 2, ev: 'No clear disruption or stated goal could be found in the script.' };
    var used = pgA <= pgB ? X.hitOf(hi, hi.pg0, hi.heading) : X.hitOf(m.scenes[goal.sc], goal.pg, C.snip(goal.txt, 0, 0, 100));
    return { s: band(pg, [6, 17], [3, 30]), ev: 'The first high-intensity scene or stated goal arrives on p. ' + Math.round(pg) + ' (' + pc(pg / m.pages) + ' of the way in).', cites: [used] };
  });
  def('P21', 'PLOT', 'Midpoint Shift', 1.0, function (c) {
    var m = c.m, X = c.X, A = m.live.filter(function (s) { var f = m.scenePos(s); return f >= 0.36 && f < 0.47; }), B = m.live.filter(function (s) { var f = m.scenePos(s); return f >= 0.5 && f < 0.62; });
    if (A.length < 2 || B.length < 2) return { s: null, ev: 'Too few scenes around the midpoint to compare.' };
    var shift = Math.abs(meanIP(B) - meanIP(A)), seen = {}; m.live.forEach(function (s) { if (m.scenePos(s) < 0.47) s.speeches.forEach(function (sp) { seen[sp.ch] = 1; }); });
    var newc = {}; B.forEach(function (s) { s.speeches.forEach(function (sp) { if (!seen[sp.ch]) newc[sp.ch] = 1; }); });
    var mid = m.live.filter(function (s) { var f = m.scenePos(s); return f >= 0.44 && f <= 0.58; }).sort(function (a, b) { return b.ip - a.ip; })[0];
    return { s: 0.55 * lin(shift, 0.04, 0.3) + 0.45 * lin(Object.keys(newc).length, 0, 3), ev: 'Intensity changes by ' + shift.toFixed(2) + ' between the scenes before and after the midpoint, and ' + Object.keys(newc).length + ' character(s) speak for the first time just after it.', cites: mid ? [X.hitOf(mid, mid.pg0, 'Strongest scene near the midpoint: ' + mid.heading)] : [] };
  });
  def('P22', 'PLOT', 'Climax Logic', 1.4, function (c) {
    var m = c.m, X = c.X, cl = m.live.filter(function (s) { var f = m.scenePos(s); return f >= 0.8 && f <= 0.97; }).sort(function (a, b) { return b.int - a.int; })[0]; if (!cl) return { s: null, ev: 'No scenes in the final act to evaluate.' };
    var who = {}; cl.speeches.forEach(function (sp) { who[sp.ch] = 1; }); var pOk = m.protag && (who[m.protag.name] || new RegExp('\\b' + (X.top[0] && X.top[0].tok || 'zzzz') + '\\b', 'i').test(cl.aT || '')), aOk = X.antag ? (who[X.antag.name] || new RegExp('\\b' + (X.antag.tok || 'zzzz') + '\\b', 'i').test(cl.aT || '')) : null;
    var s = 3.5 * (pOk ? 1 : 0) + 3 * (aOk == null ? 0.7 : aOk ? 1 : 0.2) + 3.5 * Math.min(1, cl.ip / 0.85);
    return { s: s, ev: 'The strongest late scene is Sc ' + cl.num + ' (' + cl.heading + ', p. ' + (Math.floor(cl.pg0) + 1) + '). ' + (pOk ? 'The protagonist is in it' : 'The protagonist is absent') + (aOk == null ? '.' : aOk ? ' and so is the antagonist.' : ' and the antagonist is not.') + ' It sits at intensity percentile ' + Math.round(cl.ip * 100) + '.', cites: [X.hitOf(cl, cl.pg0, cl.heading)] };
  });
  def('P23', 'PLOT', 'Resolution Clarity', 1.2, function (c) {
    var m = c.m, X = c.X, cl = m.live.filter(function (s) { var f = m.scenePos(s); return f >= 0.8; }).sort(function (a, b) { return b.int - a.int; })[0]; if (!cl) return { s: null, ev: 'No final-act scenes.' };
    var after = Math.max(0, m.pages - (cl.pg0 + cl.pages)), last = m.live[m.live.length - 1], p = m.protag;
    var inLast = p && (last.speeches.some(function (sp) { return sp.ch === p.name; }) || new RegExp('\\b' + ((X.top[0] && X.top[0].tok) || 'zzzz') + '\\b', 'i').test(last.aT || ''));
    return { s: 0.7 * band(after, [1.5, 8], [0.2, 15]) + 0.3 * (inLast ? 10 : 4), ev: 'About ' + r1(after) + ' pages follow the climactic scene (Sc ' + cl.num + '), ending in Sc ' + last.num + ' (' + last.heading + ')' + (inLast ? ' with the protagonist present.' : ' without the protagonist.'), cites: [X.hitOf(last, last.pg0, last.heading)] };
  });
  def('P24', 'PLOT', 'Subplot Integration', 1.0, function (c) {
    var m = c.m, p = m.protag; if (!p) return { s: null, ev: 'No protagonist found.' };
    var off = m.live.filter(function (s) { return !s.speeches.some(function (sp) { return sp.ch === p.name; }) && !new RegExp('\\b' + ((c.X.top[0] && c.X.top[0].tok) || 'zzzz') + '\\b', 'i').test(s.aT || ''); });
    var r = off.length / Math.max(1, m.live.length);
    return { s: band(r * 100, [14, 46], [3, 72]), ev: pc(r) + ' of scenes (' + off.length + ' of ' + m.live.length + ') do not involve ' + cname(p) + '.', cites: first(off.filter(function (s) { return s.pages > 1; }).map(function (s) { return c.X.hitOf(s, s.pg0, s.heading); }), 3) };
  });
  def('P25', 'PLOT', 'World-rule Consistency', 1.1, function (c) {
    var X = c.X, m = c.m, caps = {}, mm, rgx = /(?:^|[.!?]\s+|,\s+)(?:[A-Za-z]+\s+)*?([A-Z][a-z]{3,}(?:\s[A-Z][a-z]{3,})?)/g;
    var cnt = {}; m.paras.forEach(function (p) { var t = p.txt; var re = /(?<![.!?]\s)(?<!^)\b([A-Z][a-z]{4,})\b/g; while ((mm = re.exec(t))) cnt[mm[1]] = (cnt[mm[1]] || 0) + 1; });
    var ws = Object.keys(cnt).filter(function (w) { return cnt[w] >= 2; }), pairs = [];
    for (var i = 0; i < ws.length; i++) for (var j = i + 1; j < ws.length; j++) { if (ws[i][0] === ws[j][0] && U.lev(ws[i].toLowerCase(), ws[j].toLowerCase()) === 1 && Math.abs(ws[i].length - ws[j].length) <= 1 && !/s$/.test(ws[i] + ws[j])) pairs.push([ws[i], ws[j]]); }
    return { s: clamp(10 - 1.3 * pairs.length, 1, 10), ev: pairs.length ? pairs.length + ' pair(s) of proper names are spelled two ways: ' + pairs.slice(0, 5).map(function (p) { return p[0] + ' / ' + p[1]; }).join(', ') + '.' : 'No proper name is spelled two ways in the action.' };
  });
  def('P26', 'PLOT', 'Foreshadowing Density', 1.1, function (c) {
    var X = c.X, h = X.scanD(L.setup).concat(X.scanA(L.setup)), per = X.per10(h.length), pp = C.plantPay(c.m, X), r = pp.total ? pp.pairs.length / pp.total : 0;
    return { s: 0.5 * band(per, [0.6, 3.5], [0.1, 9]) + 0.5 * lin(r, 0.1, 0.5), ev: h.length + ' explicit foreshadowing lines (“promise me”, “something’s wrong”, “one day”) and ' + pp.pairs.length + ' objects that return later.', cites: first(h, 3) };
  });
  def('P27', 'PLOT', 'Plot Repetition Avoidance', 1.2, function (c) {
    var pr = pairsSim(c); return { s: clamp(10 - 1.6 * pr.length, 1, 10), ev: pr.length ? pr.length + ' scene pair(s) repeat much of the same wording: ' + pr.slice(0, 3).map(function (x) { return 'Sc ' + x.a.num + ' and Sc ' + x.b.num + ' (' + pc(x.j) + ' shared)'; }).join('; ') + '.' : 'No pair of scenes repeats large stretches of the same wording.', cites: pr.slice(0, 3).map(function (x) { return c.X.hitOf(x.b, x.b.pg0, 'Echoes Sc ' + x.a.num + ': ' + x.b.heading); }) };
  });
  function pairsSim(c) {
    return memo(c, 'pairsSim', function () {
      var live = c.m.live.filter(function (s) { return s.words >= 45; }), sets = live.map(function (s) { return content((s.aT || '') + ' ' + (s.dT || '')); }), out = [];
      for (var i = 0; i < live.length; i++) for (var j = i + 2; j < live.length; j++) { var jj = jac(sets[i], sets[j]); if (jj >= 0.5) out.push({ a: live[i], b: live[j], j: jj }); }
      return out.sort(function (a, b) { return b.j - a.j; });
    });
  }
  def('P28', 'PLOT', 'Exposition Distribution', 1.3, function (c) {
    var m = c.m, X = c.X, early = X.expo.filter(function (h) { return (h.pg - 1) / m.pages < 0.15; }), dumps = m.speeches.filter(function (sp) { return wc(sp.txt) >= 80 && m.posOf(sp.pg) < 0.15; });
    var shareE = X.expo.length ? early.length / X.expo.length : 0;
    return { s: clamp(10 - 2.2 * dumps.length - 5 * Math.max(0, shareE - 0.45) - 0.4 * Math.max(0, X.per10(X.expo.length) - 1.5), 1, 10), ev: X.expo.length + ' exposition tells (“as you know”, “remember when”); ' + early.length + ' fall in the first 15% and ' + dumps.length + ' speech(es) of 80+ words sit there too.', cites: first(early, 2).concat(first(dumps.map(function (sp) { return X.hitOf(m.scenes[sp.sc], sp.pg, C.snip(sp.txt, 0, 0, 100)); }), 2)) };
  });

  /* ================= DIALOGUE ================= */
  def('P29', 'DIAL', 'Voice Differentiation (vocabulary)', 1.4, function (c) {
    var t = c.X.top.slice(0, 8).filter(function (x) { return x.sig; }); if (t.length < 2) return { s: null, ev: 'Too few characters with 15 or more speeches.' };
    var avg = mean(t.map(function (x) { return x.sigN; }));
    return { s: lin(avg, 1, 6), ev: 'Each leading character has ' + r1(avg) + ' words they use far more than anyone else; e.g. ' + t.slice(0, 4).map(function (x) { return cname(x) + ': ' + x.sig.slice(0, 3).join(', '); }).join('; ') + '.' };
  });
  def('P30', 'DIAL', 'Subtext Density', 1.3, function (c) {
    var X = c.X, nr = X.per10(X.nose.length), dr = X.per10(X.deflect.length);
    return { s: 0.6 * band(nr, [0, 0.6], [0, 3.5]) + 0.4 * lin(dr, 0.2, 2.8), ev: X.nose.length + ' lines state a feeling outright (“I feel so alone”, “the thing is…”) and ' + X.deflect.length + ' lines deflect (“never mind”, “I’m fine”), which is how subtext usually reads.', cites: first(X.nose, 3), why: 'On-the-nose: ' + first(X.nose, 3).map(sc).join(', ') };
  });
  def('P31', 'DIAL', 'Exposition Ratio', 1.2, function (c) {
    var X = c.X, r = X.expo.length / Math.max(1, c.m.speeches.length) * 100;
    return { s: band(r, [0, 0.9], [0, 3.2]), ev: 'Exposition tells appear in ' + r.toFixed(1) + ' of every 100 speeches (' + X.expo.length + ' in total).', cites: first(X.expo, 3) };
  });
  def('P32', 'DIAL', 'Thematic Dialogue', 1.2, function (c) {
    var th = themeStats(c); if (th.tot < 20) return { s: null, ev: 'Too little thematic vocabulary to measure.' };
    var f = th.arr[0], cov = f.dec.filter(function (x) { return x > 0; }).length;
    return { s: 0.5 * lin(cov, 4, 10) + 0.5 * lin(f.dial / Math.max(1, f.total), 0.25, 0.7), ev: 'The strongest thematic thread, “' + f.name + '”, shows up in ' + cov + ' of 10 tenths of the script and ' + pc(f.dial / Math.max(1, f.total)) + ' of its mentions are spoken.', cites: first(f.hits, 2) };
  });
  def('P33', 'DIAL', 'Dialogue Compression', 1.1, function (c) {
    var m = c.m, X = c.X, long = X.speechLens.filter(function (n) { return n > 40; }).length / Math.max(1, X.speechLens.length), fill = X.countD(L.filler) / Math.max(1, m.speeches.length) * 100;
    return { s: 0.5 * band(X.avgSpeech, [5, 17], [3, 30]) + 0.25 * band(long * 100, [0, 8], [0, 25]) + 0.25 * band(fill, [0, 5], [0, 18]), ev: 'Speeches average ' + r1(X.avgSpeech) + ' words; ' + pc(long) + ' run past 40 words; filler (“you know”, “I mean”, “well,”) appears in ' + fill.toFixed(1) + ' of every 100 speeches.', cites: first(X.mono.map(function (sp) { return X.hitOf(m.scenes[sp.sc], sp.pg, C.snip(sp.txt, 0, 0, 100), { ch: sp.ch }); }), 3) };
  });
  def('P34', 'DIAL', 'Emotional Authenticity', 1.3, function (c) {
    var X = c.X, ex = X.excl / Math.max(1, c.m.speeches.length) * 100;
    return { s: 0.4 * band(ex, [0, 20], [0, 42]) + 0.3 * band(X.per10(X.melo.length), [0, 0.5], [0, 3.5]) + 0.3 * band(X.per10(X.nose.length), [0, 0.6], [0, 3.5]), ev: pc(ex / 100) + ' of speeches end on an exclamation mark; ' + X.melo.length + ' melodrama markers in the action (sobbing, a single tear, anguish).', cites: first(X.melo, 3) };
  });
  def('P35', 'DIAL', 'Memorable Lines', 1.4, function (c) {
    var q = quotable(c), per = c.X.per10(q.good.length);
    return { s: Math.max(3, lin(per, 0, 2.5)), ev: q.good.length + ' lines read as quotable (short, with a contrast, a triple, a repeated word or a scene-ending kick); strongest: ' + q.good.slice(0, 2).map(function (x) { return '“' + x.txt + '” (' + U.title(x.ch) + ', Sc ' + x.sc + ')'; }).join('; ') + '.', cites: first(q.good.map(function (x) { return { si: x.si, sc: x.sc, pg: x.pg, q: x.txt, ch: x.ch }; }), 4), keep: q.good.slice(0, 10) };
  });
  function quotable(c) {
    return memo(c, 'quotable', function () {
      var m = c.m, good = [];
      m.live.forEach(function (s) {
        s.speeches.forEach(function (sp, k) {
          var n = wc(sp.txt); if (n < 4 || n > 18) return;
          var sc = 0, t = sp.txt;
          if (/\b(not|isn'?t|never|no)\b[^.?!]{2,40}\b(but|just|only|it'?s)\b/i.test(t)) sc++;
          if (/\b[\w']+,\s+[\w' ]+,\s+(and|or)\s+[\w']+/i.test(t)) sc++;
          var ws = W(t.toLowerCase()).filter(function (w) { return w.length > 3 && !STOP[w]; }), seen = {}, rep = false; ws.forEach(function (w) { if (seen[w]) rep = true; seen[w] = 1; }); if (rep) sc++;
          if (n <= 9) sc++;
          if (k === s.speeches.length - 1) sc++;
          if (/\b(every|always|nothing|nobody|everyone|only|never)\b/i.test(t)) sc += 0.5;
          if (/[?]$/.test(t) && n <= 7) sc -= 0.5;
          if (L.greet.test(t) || /^(yes|no|okay|yeah|sure|right|what|why|how|who)\b/i.test(t) && n < 6) sc -= 1;
          if (sc >= 3) good.push({ txt: t, ch: sp.ch, sc: s.num, si: s.idx, pg: Math.floor(sp.pg) + 1, score: sc });
        });
      });
      good.sort(function (a, b) { return b.score - a.score; });
      return { good: good };
    });
  }
  C.quotable = function (m, X) { return quotable({ m: m, X: X, cache: {} }).good; };
  def('P36', 'DIAL', 'Non-verbal Communication', 0.9, function (c) {
    var X = c.X, per = X.per10(X.silence.length + X.parens);
    return { s: band(per, [2, 12], [0.4, 28]), ev: X.silence.length + ' silent beats or non-answers (“beat”, “says nothing”, “holds the look”) and ' + X.parens + ' parentheticals, ' + r1(per) + ' per ten pages.', cites: first(X.silence, 3) };
  });
  def('P37', 'DIAL', 'Non-human Voice Authenticity', 0.8, function (c) {
    var m = c.m, nh = m.order.filter(function (x) { return /\b(COMPUTER|ROBOT|AI|ANDROID|SHIP|MACHINE|SYSTEM|ALIEN|DOG|CREATURE|MONSTER|NARRATOR|PA|INTERCOM|SPEAKER|RADIO)\b/.test(x.name) && x.speeches >= 4; }); if (!nh.length) return { s: null, ev: 'No non-human speakers with four or more speeches.' };
    var ref = c.X.voice; var vv = nh.map(function (x) { var tx = x.text.join(' '); return mean(x.text.map(wc)); });
    var human = mean(m.order.filter(function (x) { return nh.indexOf(x) < 0 && x.speeches >= 10; }).map(function (x) { return mean(x.text.map(wc)); })) || 10;
    var diff = Math.abs(mean(vv) - human) / human;
    return { s: lin(diff, 0.05, 0.5), ev: nh.map(cname).join(', ') + ' speak in sentences averaging ' + r1(mean(vv)) + ' words against ' + r1(human) + ' for the human speakers, a difference of ' + pc(diff) + '.' };
  });
  def('P38', 'DIAL', 'Period / Cultural Accuracy', 0.8, function (c) {
    var m = c.m, X = c.X, yrs = (m.live.slice(0, 20).map(function (s) { return s.heading + ' ' + (s.aT || '').slice(0, 300); }).join(' ').match(/\b(1[5-9]\d\d|20[0-2]\d)\b/g) || []).map(Number);
    var y = yrs.length ? Math.min.apply(null, yrs.filter(function (v) { return v <= 2026; })) : 0;
    if (!y || y >= 1990) return { s: null, ev: 'The script reads as contemporary, so period accuracy does not apply.' };
    var hits = []; L.period.forEach(function (p) { if (y < p.y[1]) hits = hits.concat(X.scanD(p.bad, 20)).concat(X.scanA(p.bad, 20)); });
    return { s: clamp(10 - 1.8 * hits.length, 1, 10), ev: 'The script is set around ' + y + '. ' + hits.length + ' anachronistic word(s) found' + (hits.length ? ': ' + first(hits, 4).map(function (h) { return '“' + h.m + '” ' + sc(h); }).join(', ') : '') + '.', cites: first(hits, 4) };
  });
  def('P39', 'DIAL', 'Dialogue Reveals Character', 1.3, function (c) {
    var m = c.m, t = c.X.top.slice(0, 6).filter(function (x) { return x.speeches >= 15; }); if (t.length < 2) return { s: null, ev: 'Too few characters.' };
    var goalRates = t.map(function (x) { return x.text.filter(function (tx) { return L.selfGoal.test(tx) ? (L.selfGoal.lastIndex = 0, true) : false; }).length / x.speeches * 100; });
    var sig = mean(t.map(function (x) { return x.sigN || 0; }));
    return { s: 0.5 * lin(mean(goalRates), 3, 14) + 0.5 * lin(sig, 1, 6), ev: 'Leading characters state wants or decisions in ' + r1(mean(goalRates)) + '% of their speeches and each owns about ' + r1(sig) + ' signature words.' };
  });
  def('P40', 'DIAL', 'Climactic Dialogue Power', 1.4, function (c) {
    var m = c.m, X = c.X, late = m.speeches.filter(function (sp) { return m.posOf(sp.pg) >= 0.85; }); if (late.length < 8) return { s: null, ev: 'Fewer than eight speeches in the last 15%.' };
    var avgL = mean(late.map(function (sp) { return wc(sp.txt); })), ratio = avgL / (X.avgSpeech || 1);
    var early = {}; m.speeches.filter(function (sp) { return m.posOf(sp.pg) < 0.6; }).forEach(function (sp) { var w = W(sp.txt.toLowerCase()); for (var i = 0; i + 2 < w.length; i++) { var g = w.slice(i, i + 3).join(' '); if (!/^(i|you|it|the|to|a)\b/.test(g) && g.length > 12) early[g] = (early[g] || 0) + 1; } });
    var calls = []; late.forEach(function (sp) { var w = W(sp.txt.toLowerCase()); for (var i = 0; i + 2 < w.length; i++) { var g = w.slice(i, i + 3).join(' '); if (early[g]) { calls.push(X.hitOf(m.scenes[sp.sc], sp.pg, '“' + g + '” echoes earlier dialogue: ' + C.snip(sp.txt, sp.txt.toLowerCase().indexOf(g), g.length, 90), {})); break; } } });
    return { s: 0.4 * band(ratio, [0.45, 0.95], [0.2, 1.8]) + 0.6 * lin(calls.length, 0, 6), ev: 'The last 15% averages ' + r1(avgL) + ' words per speech (' + pc(ratio) + ' of the script’s average) and contains ' + calls.length + ' callback(s) to earlier phrasing.', cites: first(calls, 3) };
  });

  /* ================= ORIGINALITY ================= */
  def('P41', 'ORIG', 'Premise Freshness', 1.4, function (c) {
    var ids = { chosen: 1, fridge: 1, lastjob: 1, revenge: 1, heist: 1, allhead: 1, amnesia: 1, twin: 1, nuclear: 1, wake: 1, mirror: 1, dream: 1, tooold: 1, turnbadge: 1, villainlair: 1 }, hit = c.T.filter(function (t) { return ids[t.id]; });
    var wgt = hit.reduce(function (a, t) { return a + (t.kind === 'cliche' ? 1.6 : 0.8); }, 0);
    return { s: clamp(10 - 1.1 * wgt, 1, 10), ev: hit.length ? hit.length + ' familiar premise or opening devices: ' + hit.slice(0, 5).map(function (t) { return t.name + ' (' + t.n + ')'; }).join(', ') + '.' : 'None of the 15 most familiar premise devices is detected.', cites: first(hit.map(function (t) { return t.hits[0]; }), 4) };
  });
  def('P42', 'ORIG', 'Genre Blend / Subversion', 1.3, function (c) {
    var g = c.G, a = g[0], b = g[1], ratio = b.share / (a.share || 1);
    return { s: 4 + 6 * Math.min(1, ratio * 1.1), ev: 'Genre vocabulary: ' + g.slice(0, 3).map(function (x) { return L.genreName[x.g] + ' ' + pc(x.share); }).join(', ') + '. A secondary genre at ' + pc(ratio) + ' of the lead reads as a blend.' };
  });
  def('P43', 'ORIG', 'Visual / Sonic Signature', 1.3, function (c) {
    var mo = motifs(c); return { s: band(mo.length, [3, 9], [0, 16]), ev: mo.length + ' recurring images or sounds run through at least five tenths of the script: ' + mo.slice(0, 7).map(function (x) { return x.w + ' (×' + x.n + ')'; }).join(', ') + '.' };
  });
  function motifs(c) {
    return memo(c, 'motifs', function () {
      var m = c.m, cnt = {}, dec = {}, rgxs = []; ['prop', 'vehicle', 'animal', 'sfx', 'vfx', 'sound', 'wardrobe'].forEach(function (k) { rgxs.push(new RegExp(window.PH_AUTO[k].source, 'gi')); }); rgxs.push(new RegExp(L.imageWords.source, 'gi'));
      m.paras.forEach(function (p) { var d = clamp(Math.floor(m.posOf(p.pg) * 10), 0, 9); rgxs.forEach(function (r) { r.lastIndex = 0; var mm; while ((mm = r.exec(p.txt))) { var w = window.PH_NORM ? PH_NORM(mm[0]) : mm[0].toLowerCase(); cnt[w] = (cnt[w] || 0) + 1; (dec[w] = dec[w] || {})[d] = 1; } }); });
      return Object.keys(cnt).filter(function (w) { return cnt[w] >= 8 && Object.keys(dec[w]).length >= 5; }).map(function (w) { return { w: w, n: cnt[w] }; }).sort(function (a, b) { return b.n - a.n; });
    });
  }
  def('P44', 'ORIG', 'Thematic Reframing of Genre', 1.4, function (c) {
    var th = themeStats(c), interior = { 'faith and doubt': 1, 'identity and self': 1, 'guilt and redemption': 1, 'isolation and connection': 1, 'memory and time': 1, 'mortality and loss': 1, 'class and money': 1, 'truth and deception': 1 }, ex = 0, tot = th.tot || 1;
    th.arr.forEach(function (f) { if (interior[f.name]) ex += f.total; });
    var sh = ex / tot; return { s: lin(sh, 0.2, 0.6), ev: pc(sh) + ' of thematic vocabulary belongs to interior themes (identity, guilt, loss, isolation) that sit under the surface of ' + L.genreName[c.G[0].g] + ' conventions. Indicative only.' };
  });
  def('P45', 'ORIG', 'Setting Specificity', 1.1, function (c) {
    var m = c.m, X = c.X, spec = m.live.filter(function (s) { var l = (s.loc || '').replace(/^(THE|A|AN)\s+/, '').replace(/\s*[-,].*$/, '').trim(); return l && !L.generic.test(l) && l.split(/\s+/).length >= 2; }), gen = m.live.filter(function (s) { return spec.indexOf(s) < 0; });
    var r = spec.length / Math.max(1, m.live.length), cnt = {}; gen.forEach(function (s) { cnt[s.loc] = (cnt[s.loc] || 0) + 1; });
    var worst = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 3);
    return { s: lin(r, 0.15, 0.65), ev: pc(r) + ' of scene headings name a specific place (not just ROOM or STREET). Most repeated generic locations: ' + worst.map(function (w) { return w + ' (×' + cnt[w] + ')'; }).join(', ') + '.', cites: worst.map(function (w) { var s = gen.filter(function (x) { return x.loc === w; })[0]; return X.hitOf(s, s.pg0, s.heading); }) };
  });
  def('P46', 'ORIG', 'Narrative Device Originality', 1.1, function (c) {
    var dev = c.T.filter(function (t) { return t.kind === 'device'; });
    return { s: band(dev.length, [1, 3], [0, 6]), ev: dev.length ? dev.length + ' structural device(s): ' + dev.map(function (t) { return t.name + ' (' + t.n + ')'; }).join(', ') + '.' : 'No structural device (voice-over, flashback, montage, intercut) was found; the story is told in plain linear scenes.', cites: first(dev.map(function (t) { return t.hits[0]; }), 3) };
  });
  def('P47', 'ORIG', 'Concept-Execution Alignment', 1.3, function (c) {
    var g = c.G[0]; return { s: lin(g.share, 0.15, 0.4), ev: 'The script’s vocabulary commits to ' + L.genreName[g.g] + ' (' + pc(g.share) + ' of genre words), so the concept and its execution point the same way. Indicative only.' };
  });
  def('P48', 'ORIG', 'Cultural Currency', 1.0, function () { return { s: null, ev: 'Cultural currency depends on the market this year; rules cannot judge it, so it is left out of the scores.' }; });
  def('P49', 'ORIG', 'Aesthetic Identity Consistency', 1.0, function (c) {
    var m = c.m, th = actSlices(m), vals = th.map(function (a) { var tx = a.map(function (s) { return s.aT + ' ' + s.dT; }).join(' '), n = Math.max(1, wc(tx)); return [mean(U.sentences(tx).map(wc)), U.count(L.profane.f, tx) / n * 1000, U.count(L.humor, tx) / n * 1000]; });
    var dr = 0; for (var f = 0; f < 3; f++) { var col = vals.map(function (v) { return v[f]; }), mx = Math.max.apply(null, col), mn = Math.min.apply(null, col); dr += (mx - mn) / (mx + mn + 1e-6); } dr /= 3;
    return { s: band(dr, [0, 0.28], [0, 0.8]), ev: 'Sentence length, strong language and humor vary by ' + pc(dr) + ' across the three acts.' };
  });
  def('P50', 'ORIG', 'Comparable Differentiation', 1.2, function (c) {
    if (!C.REF || !C.REF.length) return { s: null, ev: 'No reference set loaded.' };
    var v = C.profile(c.m, c.X, c.G), best = null;
    C.REF.forEach(function (r) { var d = 0; for (var i = 0; i < v.length; i++) d += Math.pow(v[i] - r.v[i], 2); d = Math.sqrt(d / v.length); if (!best || d < best.d) best = { d: d, t: r.t }; });
    c.nearest = best;
    return { s: lin(best.d, 0.04, 0.22), ev: 'Closest profile in the 15-script reference set: ' + best.t + ' (distance ' + best.d.toFixed(2) + '). A small distance means the script is built like that film (genre mix, pace, dialogue share).' };
  });

  /* ================= EMOTIONAL ENGAGEMENT ================= */
  def('P51', 'EMOT', 'Stakes Clarity', 1.4, function (c) {
    var m = c.m, X = c.X, early = m.live.filter(function (s) { return m.scenePos(s) < 0.3; }), tx = early.map(function (s) { return s.aT + ' ' + s.dT; }).join(' '), den = U.count(L.stakes, tx) / Math.max(1, wc(tx)) * 1000, ifs = X.scanD(L.stakesIf).concat(X.scanA(L.stakesIf));
    return { s: 0.5 * lin(den, 0.7, 4.5) + 0.5 * lin(X.per10(ifs.length), 0.2, 2.2), ev: 'Stakes words run at ' + r1(den) + ' per 1,000 words in the first act and ' + ifs.length + ' lines state a consequence (“if we don’t…”, “or else…”).', cites: first(ifs, 3) };
  });
  def('P52', 'EMOT', 'Sensory Specificity', 1.4, function (c) {
    var X = c.X, non = ['sound', 'touch', 'smell', 'taste'], tot = 0, kinds = 0; non.forEach(function (k) { tot += X.sensory[k].length; if (X.sensory[k].length >= 3) kinds++; });
    return { s: 0.55 * lin(X.per10(tot), 1, 11) + 0.45 * lin(kinds, 1, 4), ev: tot + ' non-visual sensory details (sound ' + X.sensory.sound.length + ', touch ' + X.sensory.touch.length + ', smell ' + X.sensory.smell.length + ', taste ' + X.sensory.taste.length + '), covering ' + kinds + ' of 4 senses.', cites: first(X.sensory.smell.concat(X.sensory.touch, X.sensory.sound), 3) };
  });
  def('P53', 'EMOT', 'Tension Accumulation', 1.3, function (c) {
    var m = c.m, xs = m.live.map(function (s) { return m.scenePos(s); }), ys = m.live.map(function (s) { return s.ip; }), mx = mean(xs), my = mean(ys), num = 0, den = 0;
    for (var i = 0; i < xs.length; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) * (xs[i] - mx); }
    var slope = den ? num / den : 0, a = actSlices(m), r = meanIP(a[2]) - meanIP(a[0]);
    return { s: 0.5 * lin(slope, -0.15, 0.55) + 0.5 * lin(r, -0.1, 0.35), ev: 'Scene intensity rises across the script at a slope of ' + slope.toFixed(2) + ' (positive is rising); the last third averages ' + (r >= 0 ? '+' : '') + r.toFixed(2) + ' against the first.' };
  });
  def('P54', 'EMOT', 'Empathy Anchor (early)', 1.3, function (c) {
    var m = c.m, X = c.X, p = m.protag; if (!p) return { s: null, ev: 'No protagonist found.' };
    var hit = []; m.speeches.forEach(function (sp) { if (sp.ch === p.name && m.posOf(sp.pg) < 0.12 && U.count(EMP, sp.txt)) hit.push(X.hitOf(m.scenes[sp.sc], sp.pg, C.snip(sp.txt, 0, 0, 100))); });
    protSent(c).forEach(function (x) { if (m.posOf(x.pg) < 0.12 && U.count(EMP, x.txt)) hit.push(X.hitOf(m.scenes[x.si], x.pg, C.snip(x.txt, 0, 0, 100))); });
    return { s: lin(hit.length, 0, 5), ev: hit.length + ' early moments (first 12%) show ' + cname(p) + ' being kind, funny, vulnerable or protective.', cites: first(hit, 3) };
  });
  def('P55', 'EMOT', 'Emotional Register Range', 1.2, function (c) {
    var r = registers(c.X.allA + ' ' + c.X.allD), n = Object.keys(r).filter(function (k) { return r[k] >= 12; });
    return { s: lin(n.length, 2.5, 6), ev: n.length + ' of 6 registers carry real weight: ' + Object.keys(r).map(function (k) { return k + ' ' + r[k]; }).join(', ') + '.' };
  });
  def('P56', 'EMOT', 'Catharsis Delivery', 1.3, function (c) {
    var m = c.m, h = c.X.release.filter(function (x) { return (x.pg - 1) / m.pages >= 0.9; });
    return { s: lin(h.length, 0, 6), ev: h.length + ' release beats (tears, a hug, laughter, silence, a breath out) fall in the last 10%.', cites: first(h, 3) };
  });
  def('P57', 'EMOT', 'Emotional Restraint', 1.1, function (c) {
    var X = c.X, ex = X.countA(/!/g);
    return { s: 0.6 * band(X.per10(X.melo.length), [0, 0.4], [0, 3]) + 0.4 * band(X.per10(ex), [0, 8], [0, 40]), ev: X.melo.length + ' melodrama markers and ' + ex + ' exclamation marks in the action lines.', cites: first(X.melo, 3) };
  });
  def('P58', 'EMOT', 'Physical Embodiment of Emotion', 1.2, function (c) {
    var X = c.X, per = X.per10(X.body.length);
    return { s: band(per, [5, 32], [1, 80]), ev: X.body.length + ' physical emotion cues (swallows, trembles, clenches, breath), ' + r1(per) + ' per ten pages.', cites: first(X.body, 3) };
  });
  def('P59', 'EMOT', 'Trauma / Grief Authenticity', 1.2, function (c) {
    var X = c.X, m = c.m, g = X.scanA(L.grief).concat(X.scanD(L.grief)); if (g.length < 4) return { s: null, ev: 'Grief and bereavement are not a significant element, so this does not apply.' };
    var sc = {}; g.forEach(function (h) { sc[h.si] = 1; }); var ss = Object.keys(sc).map(function (k) { return m.scenes[k]; });
    var loud = ss.reduce(function (a, s) { return a + U.count(/!/g, s.dT || '') + U.count(L.melo, s.aT || ''); }, 0), quiet = ss.reduce(function (a, s) { return a + U.count(L.silence, s.aT || ''); }, 0);
    return { s: clamp(5 + 0.8 * quiet - 0.6 * loud, 1, 10), ev: g.length + ' grief references across ' + ss.length + ' scenes; those scenes hold ' + quiet + ' silences or non-answers against ' + loud + ' exclamations or melodrama markers.', cites: first(g, 3) };
  });
  def('P60', 'EMOT', 'Tonal Relief', 1.0, function (c) {
    var h = c.X.humor, d = c.X.perDecile(h), n = d.filter(function (x) { return x > 0; }).length;
    return { s: lin(n, 3, 8.5), ev: 'Light moments (laughs, jokes, grins) appear in ' + n + ' of 10 tenths of the script (' + h.length + ' in total).', cites: first(h, 3) };
  });

  /* ================= THEME ================= */
  def('P61', 'THEME', 'Central Theme Clarity', 1.4, function (c) {
    var th = themeStats(c); if (th.tot < 25) return { s: null, ev: 'Too little thematic vocabulary to measure.' };
    var f = th.arr[0], g = th.arr[1];
    return { s: lin(f.share, 0.12, 0.3), ev: 'The strongest theme is “' + f.name + '” (' + pc(f.share) + ' of thematic vocabulary; words: ' + Object.keys(f.words).sort(function (a, b) { return f.words[b] - f.words[a]; }).slice(0, 4).join(', ') + '), ahead of “' + g.name + '” (' + pc(g.share) + ').', cites: first(f.hits, 2) };
  });
  def('P62', 'THEME', 'Theme Through Action', 1.4, function (c) {
    var th = themeStats(c); if (th.tot < 25) return { s: null, ev: 'Too little thematic vocabulary.' };
    var f = th.arr[0], da = f.act / c.X.wA * 1000, dd = f.dial / c.X.wD * 1000, ratio = da / (dd || 0.01);
    return { s: lin(ratio, 0.35, 1.3), ev: '“' + f.name + '” appears ' + r1(da) + ' times per 1,000 words of action and ' + r1(dd) + ' per 1,000 words of dialogue (ratio ' + ratio.toFixed(2) + '); a higher ratio means the theme is dramatised, not discussed.' };
  });
  def('P63', 'THEME', 'Thematic Consistency', 1.2, function (c) {
    var th = themeStats(c); if (th.tot < 25) return { s: null, ev: 'Too little thematic vocabulary.' };
    var f = th.arr[0], n = f.dec.filter(function (x) { return x > 0; }).length;
    return { s: lin(n, 5, 10), ev: '“' + f.name + '” is present in ' + n + ' of 10 tenths of the script.' };
  });
  def('P64', 'THEME', 'Thematic Complexity', 1.2, function (c) {
    var th = themeStats(c); if (th.tot < 25) return { s: null, ev: 'Too little thematic vocabulary.' };
    var a = th.arr[0], b = th.arr[1], ca = Object.keys(a.chars).filter(function (k) { return a.chars[k] >= 3; }).length, cb = Object.keys(b.chars).filter(function (k) { return b.chars[k] >= 3; }).length;
    return { s: lin(Math.min(ca, cb), 1, 5), ev: 'Two themes, “' + a.name + '” (' + ca + ' speakers) and “' + b.name + '” (' + cb + ' speakers), are each voiced by more than one character, which allows opposing positions.' };
  });
  def('P65', 'THEME', 'Subtheme Layering', 1.0, function (c) {
    var th = themeStats(c); if (th.tot < 25) return { s: null, ev: 'Too little thematic vocabulary.' };
    var n = th.arr.filter(function (f) { return f.share >= 0.09; }).length;
    return { s: band(n, [2, 4], [1, 7]), ev: n + ' themes each hold at least 9% of thematic vocabulary: ' + th.arr.filter(function (f) { return f.share >= 0.09; }).map(function (f) { return f.name; }).join('; ') + '.' };
  });
  def('P66', 'THEME', 'Metaphor Integration', 1.1, function (c) {
    var X = c.X, per = X.per10(X.simile.length);
    return { s: band(per, [1.2, 9], [0.1, 28]), ev: X.simile.length + ' similes or “as if” comparisons in the action, ' + r1(per) + ' per ten pages.', cites: first(X.simile, 3) };
  });
  def('P67', 'THEME', 'Social / Cultural Resonance', 1.1, function (c) {
    var X = c.X, n = X.countA(L.social) + X.countD(L.social), den = n / ((X.wA + X.wD) / 1000);
    return { s: lin(den, 0.8, 7), ev: 'Institutions and social forces (government, class, law, money, media) come up ' + r1(den) + ' times per 1,000 words. Indicative only.' };
  });
  def('P68', 'THEME', 'Moral Ambiguity', 1.2, function (c) {
    var X = c.X, h = X.scanD(L.moral).concat(X.scanA(L.moral));
    return { s: lin(X.per10(h.length), 0.6, 7), ev: h.length + ' lines weigh right and wrong (“had to”, “no choice”, “deserve”, “forgive”).', cites: first(h, 3) };
  });
  def('P69', 'THEME', 'Thematic Payoff at Ending', 1.4, function (c) {
    var th = themeStats(c); if (th.tot < 25) return { s: null, ev: 'Too little thematic vocabulary.' };
    var f = th.arr[0], lastRate = f.last / (c.m.wordsA + c.m.wordsD) * 10 * 1000, allRate = f.total / (c.m.wordsA + c.m.wordsD) * 1000, ratio = lastRate / (allRate || 1);
    return { s: lin(ratio, 0.6, 1.8), ev: '“' + f.name + '” runs at ' + ratio.toFixed(2) + '× its overall rate in the last tenth of the script.' };
  });
  def('P70', 'THEME', 'Universality', 1.1, function (c) {
    var X = c.X, n = X.countA(L.universal) + X.countD(L.universal), den = n / ((X.wA + X.wD) / 1000);
    return { s: lin(den, 6, 26), ev: 'Universal human vocabulary (family, love, home, fear, death, money) runs at ' + r1(den) + ' per 1,000 words. Indicative only.' };
  });

  /* ================= COMMERCIAL ================= */
  def('P71', 'COMM', 'Format Adherence', 1.0, function (c) {
    var X = c.X, m = c.m, fmt = X.fixes.filter(function (f) { return f.cls === 'format'; }).length, noTod = X.noTod.length / Math.max(1, m.live.length);
    return { s: clamp(10 - 14 * noTod - 4 * (m.orphans.length / Math.max(1, m.speeches.length)) * 10 - X.per10(fmt) * 0.15, 1, 10), ev: pc(noTod) + ' of scene headings have no time of day, ' + m.orphans.length + ' speaker name(s) have no dialogue under them, and ' + fmt + ' formatting slips were found.' };
  });
  def('P72', 'COMM', 'Page Count Appropriateness', 1.0, function (c) {
    var r = fmtRange(c.m.fmt), pg = c.m.pages;
    return { s: band(pg, r, [r[0] * 0.7, r[1] * 1.4]), ev: 'About ' + Math.round(pg) + ' pages against a target of ' + r[0] + '-' + r[1] + ' for a ' + c.m.fmt.toLowerCase() + '.' };
  });
  def('P73', 'COMM', 'Genre Market Viability', 1.0, function () { return { s: null, ev: 'Market viability depends on buyers and timing; rules cannot judge it. The genre fingerprint and production tier are shown instead.' }; });
  def('P74', 'COMM', 'Comparable Title Proximity', 0.8, function (c) { return { s: null, ev: 'Comparable titles are a market judgment. The closest profile in the reference set is listed under Comparable Differentiation.' }; });
  def('P75', 'COMM', 'Series / Pilot Hook', 1.3, function (c) {
    if (!/TV|PILOT/.test(c.m.fmt)) return { s: null, ev: 'Applies to pilots and series only.' };
    var m = c.m, X = c.X, tail = m.speeches.filter(function (sp) { return m.posOf(sp.pg) > 0.95; }), q = tail.filter(function (sp) { return /\?/.test(sp.txt); }).length, newc = X.lateChars.length;
    return { s: lin(q + newc, 0, 4), ev: q + ' open question(s) in the last 5% and ' + newc + ' character(s) arriving late.' };
  });
  def('P76', 'COMM', 'Franchise / Universe Scalability', 1.0, function () { return { s: null, ev: 'Franchise scale is a market and rights judgment; rules cannot measure it.' }; });
  def('P77', 'COMM', 'Budget Tier Legibility', 0.8, function (c) {
    var q = c.Q; return { s: band(q.cv, [0, 0.95], [0, 1.7]), ev: 'Reads as ' + q.tier.toLowerCase() + ' (complexity ' + Math.round(q.score) + '/100: ' + q.cast + ' speaking roles, ' + q.locs + ' locations, ' + pc(q.night) + ' night, ' + pc(q.ext) + ' exterior). Scene-to-scene complexity varies by ' + q.cv.toFixed(2) + '.' };
  });
  def('P78', 'COMM', 'Logline Marketability', 1.2, function (c) {
    var ll = C.logline ? C.logline(c.m, c.X, c.G, c.cache) : null; if (!ll) return { s: null, ev: 'Logline engine not loaded.' };
    var pass = ll.checks.filter(function (k) { return k.ok; }).length;
    return { s: 1 + 9 * pass / ll.checks.length, ev: 'The best generated logline passes ' + pass + ' of ' + ll.checks.length + ' checks (protagonist, goal, stakes, opposition, irony, length): ' + ll.options[0].text };
  });
  def('P79', 'COMM', 'Cold Open Effectiveness', 1.1, function (c) {
    var m = c.m, X = c.X, f = m.live[0]; if (!f) return { s: null, ev: 'No scenes.' };
    var win = m.speeches.filter(function (sp) { return sp.pg < 3; }), q = win.filter(function (sp) { return /\?/.test(sp.txt); }).length, mark = U.count(/\b(suddenly|body|dead|blood|strange|scream|gun|run|fire|explosion|mysterious|secret|who|why)\b/gi, m.live.slice(0, 2).map(function (s) { return s.aT + ' ' + s.dT; }).join(' '));
    return { s: 0.5 * lin(f.ip, 0.2, 0.85) + 0.5 * lin(q + mark, 0, 6), ev: 'The opening scene (Sc ' + f.num + ') sits at intensity percentile ' + Math.round(f.ip * 100) + ' and the first pages carry ' + (q + mark) + ' hook markers (questions, danger, mystery words).', cites: [X.hitOf(f, f.pg0, f.heading + ': “' + C.snip(f.aT || '', 0, 0, 90) + '”')] };
  });
  def('P80', 'COMM', 'Final Image Power', 1.3, function (c) {
    var m = c.m, X = c.X, last = m.live[m.live.length - 1]; if (!last) return { s: null, ev: 'No scenes.' };
    var tail = last.paras.slice(-2).map(function (p) { return p.txt; }).join(' '), n = wc(tail), img = U.count(L.imageWords, tail), lastEl = last.lines[last.lines.length - 1];
    var s = 0.4 * lin(img, 0, 3) + 0.35 * band(n, [8, 40], [2, 90]) + 0.25 * (lastEl && lastEl.type === 'action' ? 10 : 5);
    return { s: s, ev: 'The last image (Sc ' + last.num + ') runs ' + n + ' words with ' + img + ' image words: “' + C.snip(tail, tail.length, 0, 110) + '”', cites: [X.hitOf(last, last.pg0 + last.pages, C.snip(tail, tail.length, 0, 110))] };
  });

  /* ================= CRAFT ================= */
  def('P81', 'CRAFT', 'Scene Heading Consistency', 0.8, function (c) {
    var X = c.X, m = c.m, noTod = X.noTod.length / Math.max(1, m.live.length);
    return { s: clamp(10 - 14 * noTod - 0.5 * X.locVariants.length, 1, 10), ev: X.noTod.length + ' heading(s) lack a time of day and ' + X.locVariants.length + ' location name(s) have near-duplicate spellings' + (X.locVariants.length ? ' (e.g. ' + X.locVariants.slice(0, 2).map(function (v) { return v[0] + ' / ' + v[1]; }).join('; ') + ')' : '') + '.', cites: first(X.noTod.map(function (o) { return X.hitOf(o.s, o.s.pg0, o.h); }), 3) };
  });
  def('P82', 'CRAFT', 'Action Line Economy', 1.0, function (c) {
    var X = c.X, m = c.m, share = X.paraLong.length / Math.max(1, m.paras.length);
    return { s: 0.5 * band(X.paraAvgRL, [1.4, 3.8], [1, 6]) + 0.5 * band(share * 100, [0, 9], [0, 30]), ev: 'Action paragraphs average ' + X.paraAvgRL.toFixed(1) + ' printed lines and ' + pc(share) + ' run past five.', cites: first(X.paraLong.sort(function (a, b) { return b.rl - a.rl; }).map(function (p) { return X.hitOf(m.scenes[p.sc], p.pg, C.snip(p.txt, 0, 0, 100), { rl: p.rl }); }), 3) };
  });
  def('P83', 'CRAFT', 'White Space', 0.9, function (c) {
    var m = c.m, pages = Math.ceil(m.pages), act = new Array(pages + 1).fill(0), dl = new Array(pages + 1).fill(0);
    m.paras.forEach(function (p) { act[Math.min(pages, Math.floor(p.pg))] += p.rl; }); m.speeches.forEach(function (sp) { dl[Math.min(pages, Math.floor(sp.pg))] += sp.rows.length; });
    var heavy = 0, n = 0, pgs = []; for (var i = 0; i < pages; i++) { var t = act[i] + dl[i]; if (t < 10) continue; n++; if (act[i] / t > 0.8 && act[i] > 38) { heavy++; pgs.push(i + 1); } }
    return { s: band(heavy / Math.max(1, n) * 100, [0, 10], [0, 40]), ev: heavy + ' of ' + n + ' pages are more than 80% action text (dense, little white space)' + (pgs.length ? ': p. ' + pgs.slice(0, 6).join(', ') : '') + '.' };
  });
  def('P84', 'CRAFT', 'Parenthetical Restraint', 0.8, function (c) {
    var X = c.X, m = c.m, r = X.parens / Math.max(1, m.speeches.length) * 100;
    return { s: 0.7 * band(r, [0, 9], [0, 26]) + 0.3 * band(X.parenAdv.length / Math.max(1, X.parens) * 100, [0, 15], [0, 50]), ev: X.parens + ' parentheticals across ' + m.speeches.length + ' speeches (' + r.toFixed(0) + ' per 100); ' + X.parenAdv.length + ' are adverbs (“angrily”) and ' + X.parenLong.length + ' run longer than four words.', cites: first(X.parenAdv.concat(X.parenLong), 3) };
  });
  def('P85', 'CRAFT', 'Transition Economy', 0.7, function (c) {
    var X = c.X, per = X.per10(X.trans.length);
    return { s: band(per, [0, 3.5], [0, 12]), ev: X.trans.length + ' transitions (' + X.cutTo.length + ' CUT TO), ' + r1(per) + ' per ten pages.', cites: first(X.trans, 3) };
  });
  def('P86', 'CRAFT', 'Active Voice in Action', 0.9, function (c) {
    var X = c.X, den = (X.passive.length + X.progressive.length) / (X.wA / 1000);
    return { s: 0.6 * band(den, [0, 7], [0, 28]) + 0.4 * band(X.pastShare * 100, [0, 12], [0, 55]), ev: X.passive.length + ' passive and ' + X.progressive.length + ' “is walking”-style constructions (' + r1(den) + ' per 1,000 words); ' + pc(X.pastShare) + ' of tense markers are past tense.', cites: first(X.passive.concat(X.progressive), 3) };
  });
  def('P87', 'CRAFT', 'Opening Pages Engagement', 1.1, function (c) {
    var m = c.m, ss = m.live.filter(function (s) { return s.pg0 < 10; }), spk = {}; ss.forEach(function (s) { s.speeches.forEach(function (sp) { spk[sp.ch] = 1; }); });
    var avgRL = mean(m.paras.filter(function (p) { return p.pg < 10; }).map(function (p) { return p.rl; }));
    return { s: 0.35 * lin(ss.length, 2, 7) + 0.3 * lin(Object.keys(spk).length, 1, 5) + 0.35 * band(avgRL, [1.2, 3.6], [1, 6]), ev: 'The first ten pages hold ' + ss.length + ' scenes and ' + Object.keys(spk).length + ' speaking characters, with action paragraphs averaging ' + (avgRL || 0).toFixed(1) + ' printed lines.' };
  });
  def('P88', 'CRAFT', 'Final Line Crystallization', 1.2, function (c) {
    var m = c.m, last = m.live[m.live.length - 1]; if (!last) return { s: null, ev: 'No scenes.' };
    var el = last.lines.filter(function (l) { return l.type === 'action' || l.type === 'dialogue'; }).slice(-3).map(function (l) { return l.text; }).join(' '), sen = U.sentences(el), lastS = sen[sen.length - 1] || '', n = wc(lastS);
    return { s: 0.5 * band(n, [3, 22], [1, 50]) + 0.3 * (/[.!?…"]$/.test(lastS.trim()) ? 10 : 4) + 0.2 * (U.count(L.imageWords, lastS) ? 10 : 4), ev: 'The last sentence runs ' + n + ' words: “' + C.snip(lastS, lastS.length, 0, 120) + '”', cites: [c.X.hitOf(last, last.pg0 + last.pages, C.snip(lastS, lastS.length, 0, 120))] };
  });
  def('P89', 'CRAFT', 'Scene Count Appropriateness', 0.8, function (c) {
    var m = c.m, per = m.live.length / Math.max(1, m.pages) * 100, r = C.BENCH && C.BENCH.scenesPer100 ? C.BENCH.scenesPer100 : { p10: 40, p25: 60, p75: 200, p90: 280 };
    return { s: band(per, [r.p25, r.p75], [r.p10 * 0.8, r.p90 * 1.15]), ev: m.live.length + ' scenes in about ' + Math.round(m.pages) + ' pages (' + Math.round(per) + ' per 100 pages); the reference set runs ' + Math.round(r.p25) + '-' + Math.round(r.p75) + ' for the middle half.' };
  });
  def('P90', 'CRAFT', 'INT / EXT Ratio', 0.7, function (c) {
    var X = c.X, tot = Math.max(1, X.int + X.ext), r = X.int / tot;
    return { s: band(r, [0.4, 0.8], [0.15, 0.95]), ev: pc(r) + ' of scenes are interior (' + X.int + ' INT, ' + X.ext + ' EXT).' };
  });
  def('P91', 'CRAFT', 'Protagonist Change Measurability', 1.2, function (c) {
    var m = c.m, p = m.protag; if (!p) return { s: null, ev: 'No protagonist found.' };
    var a = [], b = []; m.speeches.forEach(function (sp) { if (sp.ch !== p.name) return; var f = m.posOf(sp.pg); if (f < 0.25) a.push(sp.txt); else if (f > 0.75) b.push(sp.txt); });
    var ra = registers(a.join(' ')), rb = registers(b.join(' ')), sh = 0, ks = Object.keys(ra); ks.forEach(function (k) { sh += Math.abs((ra[k] / Math.max(1, wc(a.join(' ')))) - (rb[k] / Math.max(1, wc(b.join(' '))))); });
    var d = cosDist(content(a.join(' ')), content(b.join(' ')));
    return { s: 0.5 * lin(d, 0.35, 0.75) + 0.5 * lin(sh * 100, 0.5, 6), ev: cname(p) + '’s vocabulary and emotional register differ between the first and last quarter by ' + pc(d) + ' and ' + (sh * 100).toFixed(1) + ' register points.' };
  });
  def('P92', 'CRAFT', 'Antagonist as Mirror', 1.0, function (c) {
    var a = c.X.antag, p = c.m.protag; if (!a || !p) return { s: null, ev: 'No single antagonist identified.' };
    var j = jac(content(p.text.join(' ')), content(a.text.join(' ')));
    return { s: lin(j, 0.08, 0.3), ev: cname(p) + ' and ' + cname(a) + ' share ' + pc(j) + ' of their distinctive vocabulary; a higher overlap suggests the two are built as reflections of each other. Indicative only.' };
  });
  def('P93', 'CRAFT', 'No Redundant Scenes', 1.0, function (c) {
    var m = c.m, pr = pairsSim(c), empty = m.live.filter(function (s) { return s.words < 20 && !s.tg && s.speeches.length === 0; });
    return { s: clamp(10 - 1.3 * pr.length - 0.6 * empty.length, 1, 10), ev: pr.length + ' near-duplicate scene pair(s) and ' + empty.length + ' near-empty scene(s).', cites: first(empty.map(function (s) { return c.X.hitOf(s, s.pg0, s.heading); }), 3).concat(pr.slice(0, 2).map(function (x) { return c.X.hitOf(x.b, x.b.pg0, 'Close to Sc ' + x.a.num + ': ' + x.b.heading); })) };
  });
  def('P94', 'CRAFT', 'Dialogue-Action Flow', 1.0, function (c) {
    var X = c.X, big = X.paraLong.filter(function (p) { return p.rl >= 8; }).length;
    return { s: clamp(10 - 2.2 * X.pingpong.length - 0.9 * big, 1, 10), ev: X.pingpong.length + ' run(s) of twelve or more short back-and-forth lines with no action between, and ' + big + ' action block(s) of eight or more printed lines.', cites: first(X.pingpong.map(function (r) { return X.hitOf(r.s, r.s.pg0, r.n + ' rapid exchanges, starting “' + C.snip(r.q, 0, 0, 40) + '”'); }), 3) };
  });
  def('P95', 'CRAFT', 'Cadence Variation', 0.9, function (c) {
    var X = c.X, sd = U.stdev(X.sentLens), sl = U.stdev(X.speechLens) / (X.avgSpeech || 1);
    return { s: 0.5 * band(sd, [4.5, 10], [2.5, 15]) + 0.5 * band(sl, [0.8, 1.6], [0.4, 2.4]), ev: 'Action sentence length varies with a spread of ' + sd.toFixed(1) + ' words; speech length varies at ' + sl.toFixed(2) + ' of its mean.' };
  });
  def('P96', 'CRAFT', 'Vocabulary Differentiation', 1.0, function (c) {
    var X = c.X, vt = X.verbTop;
    return { s: 0.5 * lin(X.ttr, 0.3, 0.55) + 0.5 * band(vt.top, [0, 1.3], [0, 3]), ev: 'Variety of words in the action is ' + X.ttr.toFixed(2) + ' (unique over total, first 8,000 words); the most repeated verb is “' + (vt.arr[0] ? vt.arr[0][0] : '') + '” at ' + vt.top.toFixed(1) + '% of action words (' + vt.arr.slice(0, 4).map(function (x) { return x[0] + ' ' + x[1]; }).join(', ') + ').' };
  });
  def('P97', 'CRAFT', 'Cultural Sensitivity', 1.0, function (c) {
    var X = c.X, narr = X.scanA(L.slurHard), dlg = X.scanD(L.slurHard), soft = X.scanA(L.slurs).filter(function (h) { return !L.slurHard.test(h.m); });
    var s = clamp(10 - 3 * narr.length - 0.35 * Math.min(dlg.length, 10) - 0.1 * soft.length, 1, 10);
    return { s: s, ev: narr.length + ' hard term(s) in the narration, ' + dlg.length + ' in dialogue and ' + soft.length + ' dated or loaded words (“crazy”, “primitive”, “exotic”) in the narration. These are flags to read in context, not verdicts.', cites: first(narr.concat(dlg, soft), 4) };
  });
  def('P98', 'CRAFT', 'Stakes Escalation per Act', 1.2, function (c) {
    var m = c.m, a = actSlices(m), ip = a.map(meanIP), st = a.map(function (g) { var tx = g.map(function (s) { return s.aT + ' ' + s.dT; }).join(' '); return U.count(L.stakes, tx) / Math.max(1, wc(tx)) * 1000; });
    var mono = (ip[1] >= ip[0] ? 1 : 0) + (ip[2] >= ip[1] ? 1 : 0) + (st[1] >= st[0] ? 0.5 : 0) + (st[2] >= st[1] ? 0.5 : 0);
    return { s: 2 + 2.67 * mono, ev: 'Intensity by act: ' + ip.map(function (v) { return v.toFixed(2); }).join(' → ') + '; stakes words per 1,000: ' + st.map(function (v) { return v.toFixed(1); }).join(' → ') + '.' };
  });
  def('P99', 'CRAFT', 'Thematic Unity', 1.1, function (c) {
    var a = c.res.P61, b = c.res.P63, d = c.res.P43, xs = [a, b, d].filter(function (x) { return x && x.s != null; });
    if (!xs.length) return { s: null, ev: 'No thematic or motif data.' };
    return { s: mean(xs.map(function (x) { return x.s; })), ev: 'Composite of theme clarity (' + (a && a.s != null ? r1(a.s) : 'n/a') + '), theme consistency (' + (b && b.s != null ? r1(b.s) : 'n/a') + ') and visual or sonic motifs (' + (d && d.s != null ? r1(d.s) : 'n/a') + ').' };
  });
  def('P100', 'CRAFT', 'Composite Originality Index', 1.3, function (c) {
    var ids = ['P41', 'P42', 'P43', 'P45', 'P46', 'P50'], xs = ids.map(function (i) { return c.res[i]; }).filter(function (x) { return x && x.s != null; });
    return { s: mean(xs.map(function (x) { return x.s; })), ev: 'Composite of premise freshness, genre blend, motifs, setting specificity, narrative devices and distance from the reference set (' + xs.length + ' of 6 measurable).' };
  });
})();
