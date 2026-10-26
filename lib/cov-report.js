/* proHUB Script Coverage: analysis runner, 1-10 scoring, strengths and weaknesses, written summary,
   logline suggester, click-through suggestions and script rewriting helpers. */
(function () {
  'use strict';
  var C = window.PHCov, U = C.util, L = C.LEX, wc = U.wc, mean = U.mean, clamp = U.clamp;
  function r1(x) { return Math.round(x * 10) / 10; }
  function pc(x) { return Math.round(x * 100) + '%'; }
  function nm(c) { return U.title(c.name); }

  /* the reference profile used for "closest comparable" */
  C.profile = function (m, X, G) {
    var gs = {}; G.forEach(function (o) { gs[o.g] = o.share; });
    var keys = Object.keys(L.genres).sort();
    var v = keys.map(function (k) { return gs[k] || 0; });
    v.push(m.wordsD / Math.max(1, m.words), clamp(m.pages / 200, 0, 1), X.night / Math.max(1, m.live.length), X.int / Math.max(1, m.live.length), clamp(m.live.length / m.pages / 4, 0, 1));
    return v;
  };

  var SCORE_BANDS = [[9, 'Outstanding'], [8, 'Excellent'], [7, 'Good'], [6, 'Competent'], [4, 'Developing'], [0, 'Not ready']];
  C.bandName = function (s) { for (var i = 0; i < SCORE_BANDS.length; i++) if (s >= SCORE_BANDS[i][0]) return SCORE_BANDS[i][1]; return 'Not ready'; };
  /* calibration: map raw 1-10 onto the reported scale */
  function cal(x) { return clamp(x, 1, 10); }

  var BL = {
    Premise: ['P41', 'P42', 'P44', 'P47', 'P51', 'P78', 'P79', 'P20', 'P46'],
    Plot: null, Character: null, Dialogue: null,
    Setting: ['P43', 'P45', 'P52', 'P25', 'P77', 'P38', 'P49', 'P90']
  };

  C.analyze = function (raw, opts) {
    opts = opts || {};
    var m = C.model(raw, opts), X = C.measure(m);
    var T = C.tropes(m, X), G = C.genres(m, X), K = C.content(m, X), Q = C.complexity(m, X);
    var ctx = { m: m, X: X, T: T, G: G, K: K, Q: Q, cache: {}, res: {} };
    C.PARAMS.forEach(function (p) {
      var r;
      try { r = p.fn(ctx) || { s: null, ev: '' }; } catch (e) { r = { s: null, ev: 'This parameter could not be measured (' + e.message + ').', err: true }; }
      r.id = p.id; r.axis = p.axis; r.name = p.name; r.weight = p.weight;
      if (r.s != null) r.s = r1(clamp(r.s, 1, 10));
      r.cites = r.cites || []; ctx.res[p.id] = r;
    });
    var R = { m: m, X: X, T: T, G: G, K: K, Q: Q, params: C.PARAMS.map(function (p) { return ctx.res[p.id]; }), nearest: ctx.nearest || null, ctx: ctx };
    /* axes */
    R.axes = {};
    Object.keys(C.AXES).forEach(function (k) {
      var ps = R.params.filter(function (p) { return p.axis === k; }), ok = ps.filter(function (p) { return p.s != null; }), w = ok.reduce(function (a, p) { return a + p.weight; }, 0);
      R.axes[k] = { key: k, label: C.AXES[k].label, color: C.AXES[k].color, score: w ? r1(ok.reduce(function (a, p) { return a + p.s * p.weight; }, 0) / w) : null, n: ok.length, of: ps.length, params: ps };
    });
    function avgOf(ids) { var xs = ids.map(function (i) { return ctx.res[i]; }).filter(function (x) { return x && x.s != null; }); return xs.length ? { score: r1(mean(xs.map(function (x) { return x.s; }))), ids: ids, used: xs.length } : { score: null, ids: ids, used: 0 }; }
    R.cats = {
      Premise: avgOf(BL.Premise), Plot: { score: R.axes.PLOT.score, ids: R.axes.PLOT.params.map(function (p) { return p.id; }), used: R.axes.PLOT.n },
      Character: { score: R.axes.CHAR.score, ids: R.axes.CHAR.params.map(function (p) { return p.id; }), used: R.axes.CHAR.n },
      Dialogue: { score: R.axes.DIAL.score, ids: R.axes.DIAL.params.map(function (p) { return p.id; }), used: R.axes.DIAL.n },
      Setting: avgOf(BL.Setting)
    };
    var wts = { Premise: 0.2, Plot: 0.25, Character: 0.25, Dialogue: 0.2, Setting: 0.1 }, tw = 0, ts = 0;
    Object.keys(wts).forEach(function (k) { if (R.cats[k].score != null) { tw += wts[k]; ts += wts[k] * R.cats[k].score; } });
    var base = tw ? ts / tw : 5, craft = R.axes.CRAFT.score, emot = R.axes.EMOT.score, theme = R.axes.THEME.score;
    var mod = ((craft == null ? 6 : craft) - 6) * 0.12 + ((emot == null ? 6 : emot) - 6) * 0.12 + ((theme == null ? 6 : theme) - 6) * 0.08;
    R.overall = r1(cal(base + clamp(mod, -0.8, 0.8)));
    R.overallParts = { base: r1(base), craft: craft, emot: emot, theme: theme, mod: r1(clamp(mod, -0.8, 0.8)) };
    R.verdict = R.overall >= 8 ? 'Recommend' : R.overall >= 7 ? 'Consider' : 'Pass for now';
    R.band = C.bandName(R.overall);
    /* issues, strengths, weaknesses, logline, summary */
    R.issues = C.issues(R);
    R.logline = C.logline(m, X, G, ctx.cache);
    R.quotes = C.quotable(m, X).slice(0, 10);
    R.sw = C.strengthsWeaknesses(R);
    R.layers = C.layers(R);
    R.summary = C.summary(R);
    R.sceneIndex = C.sceneIndex(R);
    R.stats = C.stats(R);
    return R;
  };

  C.stats = function (R) {
    var m = R.m, X = R.X;
    var dl = m.wordsD / Math.max(1, m.words);
    return {
      pages: r1(m.pages), scenes: m.live.length, words: m.words, speakers: m.order.length, speaking: m.order.filter(function (c) { return c.speeches >= 3; }).length,
      dialogueShare: dl, avgSpeech: r1(X.avgSpeech), scenesPer100: r1(m.live.length / Math.max(1, m.pages) * 100), intShare: X.int / Math.max(1, m.live.length), nightShare: X.night / Math.max(1, m.live.length),
      avgPara: r1(X.paraAvgRL), locations: X.locs.length, runtime: Math.round(m.pages)
    };
  };

  /* ---------- advice text per parameter ---------- */
  var ADV = {
    P01: 'Make sure the lead is on the page by p. 5 and wants something concrete by the end of act one.',
    P02: 'Rewrite scenes where the lead watches or waits so they make a choice that changes what happens next.',
    P03: 'Add small physical reactions in the lead’s key scenes (a swallow, a pause, a look away) rather than stating what they feel.',
    P04: 'Give each major supporting character one scene of their own wants, and a first-appearance description.',
    P05: 'Give the opposing force a point of view the audience half agrees with, and at least one scene in which they are right.',
    P06: 'Rewrite the two closest voices so one speaks in short, blunt lines and the other in long, qualified ones; change their favourite words.',
    P07: 'Replace “when I was a kid…” speeches with an object, a scar or a habit seen in the room.',
    P09: 'Keep each character’s sentence length and contractions steady unless the change is the point of the scene.',
    P10: 'Give each main character a one-line physical hook on first appearance (an age, a gesture, a way of dressing).',
    P12: 'Replace “MAN #2”-style placeholders with a role and a trait (“THE NERVOUS CLERK”).',
    P13: 'Bring the lead back in the last tenth and let them speak differently than in the opening.',
    P15: 'Look at the weak windows: put a reversal near 25%, a shift near 50% and a loss near 75%.',
    P17: 'Choose two objects from the first act and make each one decide something in the last act.',
    P18: 'Compress or cut the flat stretch, or add an obstacle, a reveal or a ticking deadline to its scenes.',
    P19: 'Merge single-purpose scenes with their neighbours so each scene both moves the plot and shows a relationship.',
    P20: 'Move the first real disruption earlier, or state the lead’s goal out loud in the first fifteen pages.',
    P21: 'Add a reversal near the midpoint: new information, a new ally, or a plan that changes.',
    P22: 'Put the lead and the opposing force in the same room in the climax, and let the lead use something planted earlier.',
    P23: 'Allow one to six pages after the climax to show the new normal, and keep the lead on screen.',
    P26: 'Plant one clear promise or warning in the first act that the last act pays.',
    P27: 'Differentiate near-identical scenes: change the stakes, location or who has the upper hand.',
    P28: 'Move explanation out of the first fifteen pages and into conflict: have someone resist being told.',
    P30: 'Replace lines that name a feeling with a line that avoids it; let the subject change mid-scene.',
    P31: 'Cut “as you know” lines and let one character withhold information from another.',
    P33: 'Cut every speech by a third, then restore only what the next speaker needs to answer.',
    P34: 'Lower the volume: cut exclamation marks and let the quiet moment carry the feeling.',
    P35: 'Protect the quotable lines listed below, and look for one place to end a scene on a short, hard line.',
    P36: 'Add a silence or a physical beat before a key reply.',
    P41: 'Test each familiar device in the report against a more specific choice for your characters.',
    P43: 'Choose two or three images or sounds and bring them back with a change each time.',
    P45: 'Replace generic headings (ROOM, HOUSE, STREET) with a named, specific place in the cited scenes.',
    P46: 'Use a structural device only if it adds meaning you cannot get from straight scenes.',
    P51: 'State the cost of failure aloud in act one (“if we don’t… then…”).',
    P52: 'Add a smell, a texture or a sound to the first image of each major location.',
    P53: 'Rework the middle so each sequence is more dangerous than the last.',
    P54: 'Give the lead one early moment of kindness, humor or vulnerability.',
    P57: 'Replace tears and screams in the action lines with what the character does to hide them.',
    P58: 'Add a body detail (jaw, breath, hands) to the lead’s hardest scenes.',
    P60: 'Place one light beat in each tenth of the script, especially after the darkest scenes.',
    P61: 'Choose the theme you mean and echo its key word or image in each act.',
    P62: 'Dramatise the theme in an action rather than discussing it in dialogue.',
    P69: 'Return to the theme’s central image in the final scenes.',
    P71: 'Fix the heading, cue and spacing issues listed in the Format panel.',
    P72: 'Trim or extend toward the target page range for the format.',
    P80: 'End on one concrete image with no dialogue and no explanation.',
    P81: 'Add the missing times of day and unify the near-duplicate location names.',
    P82: 'Break action paragraphs longer than five lines at the next change of focus.',
    P84: 'Delete adverb parentheticals (“angrily”) and let the line or action show it.',
    P85: 'Cut transitions that only say CUT TO:; the next heading already does that job.',
    P86: 'Change passive and “is walking” constructions to simple present tense.',
    P88: 'Shorten the last sentence and end on a noun.',
    P93: 'Cut or merge the repeated scenes, keeping the best version.',
    P94: 'Break up long runs of quick lines with a physical beat or interruption.',
    P95: 'Mix very short action lines with a few long ones for rhythm.',
    P96: 'Replace the most repeated verbs with more specific ones.',
    P97: 'Read the flagged words in context and decide whether each is the character or the writer speaking.'
  };
  var AXADV = { CHAR: 'Strengthen the people first: give each major character a want, a flaw and a distinct way of speaking.', PLOT: 'Check the turning points and cut the flat stretches.', DIAL: 'Cut, compress and give characters different speech habits.', ORIG: 'Choose specific, surprising details over familiar devices.', EMOT: 'Show feeling through behaviour, objects and sensation.', THEME: 'Choose the central idea and let action argue it.', COMM: 'Check length, format and the one-line pitch.', CRAFT: 'Tidy the prose and format; fewer words, more precise verbs.' };
  C.advice = function (p) { return ADV[p.id] || AXADV[p.axis] || ''; };

  /* ---------- strengths and weaknesses ---------- */
  C.strengthsWeaknesses = function (R) {
    var ps = R.params.filter(function (p) { return p.s != null; });
    function mk(p, why) { return { id: p.id, name: p.name, axis: p.axis, s: p.s, ev: p.ev, cites: p.cites.slice(0, 3), advice: C.advice(p), why: why }; }
    var str = ps.filter(function (p) { return p.s >= 7.5; }).sort(function (a, b) { return (b.s - 6) * b.weight - (a.s - 6) * a.weight; }).slice(0, 8).map(function (p) { return mk(p); });
    var weak = ps.filter(function (p) { return p.s <= 5.5; }).sort(function (a, b) { return (a.s - 6) * a.weight - (b.s - 6) * b.weight; }).slice(0, 10).map(function (p) { return mk(p); });
    return { strengths: str, weaknesses: weak };
  };

  /* ---------- layered commentary per category ---------- */
  C.layers = function (R) {
    var m = R.m, X = R.X, out = {};
    function cat(name, ids) {
      var ps = ids.map(function (i) { return R.ctx.res[i]; }).filter(function (p) { return p && p.s != null; }).sort(function (a, b) { return b.s - a.s; });
      var best = ps.slice(0, 2), worst = ps.slice(-2).reverse().filter(function (p) { return p.s < 7; });
      var layer = { name: name, score: R.cats[name] ? R.cats[name].score : null, observe: [], works: [], strains: [], tryThis: [], cites: [] };
      best.forEach(function (p) { if (p.s >= 6.5) { layer.works.push({ id: p.id, name: p.name, s: p.s, text: p.ev, cites: p.cites.slice(0, 2) }); } });
      worst.forEach(function (p) { layer.strains.push({ id: p.id, name: p.name, s: p.s, text: p.ev, cites: p.cites.slice(0, 3) }); var a = C.advice(p); if (a) layer.tryThis.push({ id: p.id, text: a, cites: p.cites.slice(0, 2) }); });
      return layer;
    }
    out.Premise = cat('Premise', BL.Premise); out.Plot = cat('Plot', R.cats.Plot.ids); out.Character = cat('Character', R.cats.Character.ids); out.Dialogue = cat('Dialogue', R.cats.Dialogue.ids); out.Setting = cat('Setting', BL.Setting);
    /* observations that name specific scenes, pages and lines */
    var p = m.protag, a = X.antag, g = R.G[0], g2 = R.G[1];
    out.Premise.observe.push('Genre vocabulary reads ' + L.genreName[g.g] + ' (' + pc(g.share) + ') with ' + L.genreName[g2.g] + ' (' + pc(g2.share) + ') as the second voice.');
    if (R.T.length) { var t0 = R.T.filter(function (t) { return t.kind === 'cliche'; })[0]; if (t0) out.Premise.observe.push('The most familiar device is “' + t0.name + '” (' + t0.n + ' instances), e.g. Sc ' + t0.hits[0].sc + ' (p. ' + t0.hits[0].pg + '): “' + t0.hits[0].q + '”.'); }
    var pl = out.Plot; var peak = m.live.slice().sort(function (x, y) { return y.int - x.int; })[0];
    if (peak) pl.observe.push('Intensity peaks in Sc ' + peak.num + ' (' + peak.heading + ', p. ' + (Math.floor(peak.pg0) + 1) + ', ' + pc(m.scenePos(peak)) + ' through the script).');
    if (X.dead.length) pl.observe.push('The longest flat stretch is Sc ' + X.dead[0].from.num + '-' + X.dead[0].to.num + ' (' + X.dead[0].n + ' scenes, ' + r1(X.dead[0].pages) + ' pages).');
    if (p) out.Character.observe.push(nm(p) + ' speaks ' + p.speeches + ' times across ' + p.nScenes + ' scenes (' + pc(p.share) + ' of dialogue), first on p. ' + (Math.floor(p.first) + 1) + (a ? '; the strongest opposing voice is ' + nm(a) + ' (' + a.nScenes + ' scenes).' : '.'));
    if (X.simNames.length) out.Character.observe.push('Name risk: ' + X.simNames.slice(0, 3).map(function (v) { return nm(v[0]) + ' and ' + nm(v[1]); }).join('; ') + ' look alike on the page.');
    if (X.mono.length) out.Dialogue.observe.push('The longest speech is ' + nm({ name: X.mono.sort(function (a1, b1) { return wc(b1.txt) - wc(a1.txt); })[0].ch }) + ' in Sc ' + m.scenes[X.mono[0].sc].num + ' (' + wc(X.mono[0].txt) + ' words).');
    if (R.quotes.length) out.Dialogue.observe.push('Lines worth protecting: “' + R.quotes[0].txt + '” (' + nm({ name: R.quotes[0].ch }) + ', Sc ' + R.quotes[0].sc + ')' + (R.quotes[1] ? ' and “' + R.quotes[1].txt + '” (Sc ' + R.quotes[1].sc + ')' : '') + '.');
    if (X.locs.length) out.Setting.observe.push('The most used locations are ' + X.locs.slice(0, 3).map(function (l) { return U.title(l) + ' (' + X.locCount[l] + ' scenes)'; }).join(', ') + '; ' + X.locs.length + ' distinct locations in all.');
    out.Setting.observe.push('Production read: ' + R.Q.tier.toLowerCase() + ' (' + R.Q.cast + ' speaking roles, ' + pc(R.Q.night) + ' night, ' + pc(R.Q.ext) + ' exterior).');
    return out;
  };

  /* ---------- the written summary ---------- */
  C.summary = function (R) {
    var m = R.m, X = R.X, p = m.protag, a = X.antag, g = R.G[0], g2 = R.G[1], st = R.stats || C.stats(R), first = m.live[0], last = m.live[m.live.length - 1];
    var title = m.meta.title || 'This script';
    var paras = [];
    paras.push(title + ' is a roughly ' + Math.round(m.pages) + '-page ' + L.genreName[g.g] + ' (with a strong ' + L.genreName[g2.g] + ' streak) in ' + m.live.length + ' scenes and ' + st.speaking + ' speaking roles. It opens in Sc ' + first.num + ' (' + first.heading + ') and closes in Sc ' + last.num + ' (' + last.heading + '). ' + (p ? 'Its centre of gravity is ' + nm(p) + ', who carries ' + pc(p.share) + ' of the dialogue and is present in ' + p.nScenes + ' scenes' + (a ? ', opposed most directly by ' + nm(a) + '.' : '.') : ''));
    paras.push('Overall the rules put it at ' + R.overall.toFixed(1) + ' out of 10 (' + R.band.toLowerCase() + '; ' + R.verdict.toLowerCase() + '). Premise ' + (R.cats.Premise.score || 'n/a') + ', Plot ' + (R.cats.Plot.score || 'n/a') + ', Character ' + (R.cats.Character.score || 'n/a') + ', Dialogue ' + (R.cats.Dialogue.score || 'n/a') + ', Setting ' + (R.cats.Setting.score || 'n/a') + '. Craft ' + (R.axes.CRAFT.score || 'n/a') + ', emotional engagement ' + (R.axes.EMOT.score || 'n/a') + ' and theme ' + (R.axes.THEME.score || 'n/a') + ' adjust the overall by ' + (R.overallParts.mod >= 0 ? '+' : '') + R.overallParts.mod + '.');
    var s = R.sw.strengths.slice(0, 3), w = R.sw.weaknesses.slice(0, 3);
    if (s.length) paras.push('What works: ' + s.map(function (x) { return x.name.toLowerCase() + ' (' + x.s + ') — ' + x.ev; }).join(' ') );
    if (w.length) paras.push('What holds it back: ' + w.map(function (x) { return x.name.toLowerCase() + ' (' + x.s + ') — ' + x.ev; }).join(' '));
    return paras;
  };

  /* ---------- scene-by-scene index ---------- */
  C.sceneIndex = function (R) {
    var m = R.m;
    return m.scenes.map(function (s) {
      var spk = {}; s.speeches.forEach(function (sp) { spk[sp.ch] = (spk[sp.ch] || 0) + 1; });
      var first = s.paras[0] ? U.sentences(s.paras[0].txt)[0] : '';
      return { num: s.num, idx: s.idx, heading: s.heading, pg: Math.floor(s.pg0) + 1, len: r1(s.pages), int: s.ip == null ? null : Math.round(s.ip * 100), cast: Object.keys(spk).map(function (k) { return U.title(k); }), line: C.snip(first || '', 0, 0, 120), omit: !!s.omit };
    });
  };

  /* =============== LOGLINE =============== */
  var AGE = { twenties: 'twenty-something', thirties: 'thirty-something', forties: 'forty-something', fifties: 'fifty-something', sixties: 'sixty-something', seventies: 'septuagenarian' };
  function ageWord(txt) {
    var mm = /\b(?:early|mid|late)[- ]?(twenties|thirties|forties|fifties|sixties|seventies)\b|\b(twenties|thirties|forties|fifties|sixties|seventies)\b/i.exec(txt || ''); if (mm) return AGE[(mm[1] || mm[2]).toLowerCase()];
    mm = /\b([2-7])0s\b/.exec(txt || ''); if (mm) return AGE[['', '', 'twenties', 'thirties', 'forties', 'fifties', 'sixties', 'seventies'][+mm[1]]];
    return '';
  }
  var GOALVERB = /^(find|get|stop|save|catch|kill|reach|escape|rescue|bring|protect|destroy|prove|win|survive|stay|bury|deliver|steal|free|expose|take|make|build|fix|break|solve|understand|convince|return|retrieve|recover|warn|defend|beat|leave|clear)\b/i;
  C.logline = function (m, X, G, cache) {
    cache = cache || {};
    if (cache.logline) return cache.logline;
    var p = m.protag, a = X.antag, tok = p && (X.top.filter(function (c) { return c === p; })[0] || {}).tok;
    var slots = { protag: '', protagName: p ? nm(p) : '', goal: '', stakes: '', setting: '', genre: L.genreName[G[0].g] || 'drama', opposition: '' };
    /* protagonist descriptor */
    if (p) {
      var intro = (X.top.filter(function (c) { return c === p; })[0] || p).introSentence || '';
      var role = p.role || ''; if (!role) { var pre = p.name.split(/\s+/); L.roles.forEach(function (r) { if (!role && new RegExp('^' + r + '$', 'i').test(pre[0])) role = r; }); }
      var age = ageWord(intro), gender = p.gender === 'f' ? 'woman' : p.gender === 'm' ? 'man' : 'person';
      slots.protag = (age ? age + ' ' : '') + (role || gender);
      slots.protag = (/^[aeiou]/i.test(slots.protag) ? 'an ' : 'a ') + slots.protag;
    } else slots.protag = 'a lead character';
    /* goal */
    var goals = {}, cand = [];
    var pool = m.speeches.filter(function (sp) { return m.posOf(sp.pg) < 0.5 && (!p || sp.ch === p.name || m.protag); });
    pool.forEach(function (sp) { var re = new RegExp(L.goalVerbs.source, 'gi'), mm; while ((mm = re.exec(sp.txt))) { var ph = mm[1].replace(/[,.;:!?].*$/, '').replace(/\s+(and|but|or|to|so|if|that|because|when|before)\b.*$/i, '').trim(); ph = ph.split(/\s+/).slice(0, 6).join(' '); if (wc(ph) < 2 || !GOALVERB.test(ph)) continue; var k = ph.toLowerCase(); (goals[k] = goals[k] || { ph: ph, n: 0, hit: X.hitOf(m.scenes[sp.sc], sp.pg, C.snip(sp.txt, mm.index, 0, 100)), who: sp.ch }).n++; } });
    cand = Object.keys(goals).map(function (k) { var o = goals[k]; o.score = o.n + (p && o.who === p.name ? 2 : 0) + (1 - m.posOf(o.hit.pg)) ; return o; }).sort(function (x, y) { return y.score - x.score; });
    slots.goal = cand.length ? cand[0].ph.replace(/\bme\b/g, 'them').replace(/\bmy\b/g, 'their').replace(/\bour\b/g, 'their').replace(/\bus\b/g, 'them').replace(/\bI\b/g, 'they') : '';
    slots.goalCands = cand.slice(0, 4).map(function (o) { return { ph: o.ph, hit: o.hit }; });
    /* stakes */
    var sk = [], sre = /\b(?:before|or else|unless|or (?:they|we|he|she|everyone|i)(?:'ll| will)|otherwise)\s+([^.?!]{6,48})/gi;
    m.speeches.forEach(function (sp) { if (m.posOf(sp.pg) > 0.6) return; var mm; sre.lastIndex = 0; while ((mm = sre.exec(sp.txt))) { var ph = mm[1].replace(/[,;:].*$/, '').trim(); if (U.count(L.stakes, ph) || /\b(die|dead|kill|lose|destroy|end|war|lives|world)\b/i.test(ph)) sk.push({ ph: ph, hit: X.hitOf(m.scenes[sp.sc], sp.pg, C.snip(sp.txt, mm.index, 0, 100)) }); } });
    slots.stakes = sk.length ? sk[0].ph.replace(/\bour\b/g, 'their').replace(/\bwe\b/gi, 'they').replace(/\bus\b/g, 'them').replace(/\bI\b/g, 'they') : '';
    slots.stakesCands = sk.slice(0, 3);
    /* setting and time */
    var yrs = (m.live.slice(0, 25).map(function (s) { return s.heading + ' ' + (s.aT || '').slice(0, 400); }).join(' ').match(/\b(1[5-9]\d\d|20[0-2]\d)\b/g) || []).map(Number).filter(function (y) { return y <= 2026; });
    var yr = yrs.length ? yrs.sort(function (x, y) { return yrs.filter(function (v) { return v === y; }).length - yrs.filter(function (v) { return v === x; }).length; })[0] : 0;
    var spec = X.locs.filter(function (l) { return !L.generic.test(l.replace(/^(THE|A)\s+/, '').replace(/\s*[-,].*$/, '')); })[0] || X.locs[0] || '';
    slots.place = spec ? U.title(spec.replace(/\s*[-,].*$/, '')) : '';
    slots.year = yr ? String(yr) : '';
    slots.setting = yr ? 'In ' + yr : (slots.place ? 'In ' + slots.place : '');
    slots.opposition = a ? 'a relentless ' + (a.role || 'adversary') : (G[0].g === 'war' ? 'a fortified enemy' : G[0].g === 'horror' ? 'a killer' : G[0].g === 'crime' ? 'a killer who is always one step ahead' : 'forces stacked against them');
    slots.antagName = a ? nm(a) : '';
    C.loglineSet(slots, m, X); var res = C.loglineFrom(slots, m, X);
    cache.logline = res; return res;
  };
  function lc1(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }
  function uc1(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  C.loglineSet = function () { };
  C.loglineFrom = function (slots, m, X) {
    var P = slots.protag || 'a lead character', g = slots.goal || 'do what must be done', st = slots.stakes ? ' before ' + slots.stakes : '', set = slots.setting ? slots.setting + ', ' : '', opp = slots.opposition || 'impossible odds', genre = slots.genre;
    var o = [];
    o.push({ label: 'Classic', text: uc1(set ? set + lc1(P) : P) + ' must ' + g + st + '.' });
    o.push({ label: 'Opposition first', text: uc1(P) + ' must ' + g + ' while facing ' + opp + (slots.stakes ? ', or ' + slots.stakes : '') + '.' });
    o.push({ label: 'Situation led', text: (set || 'When the call comes, ') + lc1(P) + ' is forced to ' + g + ', and finds ' + opp + ' standing in the way.' });
    o.push({ label: 'Pitch line', text: uc1(genre) + (slots.setting ? ' ' + lc1(slots.setting) : '') + ': ' + lc1(P) + ' sets out to ' + g + (slots.stakes ? '. If they fail, ' + slots.stakes + '.' : '.') });
    o.push({ label: 'Ironic', text: 'Against every instinct, ' + lc1(P) + ' has to ' + g + (slots.stakes ? ' before ' + slots.stakes : '') + '; the only people who can help are ' + (slots.antagName ? 'the ones closest to ' + slots.antagName : 'those who have the most to lose') + '.' });
    o.forEach(function (x) { x.text = x.text.replace(/\s+/g, ' ').replace(/ ,/g, ','); x.words = wc(x.text); });
    var checks = C.checkLogline(o[0].text, m, X, slots);
    return { slots: slots, options: o, checks: checks };
  };
  C.checkLogline = function (text, m, X, slots) {
    var t = String(text || ''), n = wc(t), names = (X.top || []).slice(0, 12).map(function (c) { return c.tok; }).filter(Boolean);
    var hasName = names.some(function (nme) { return new RegExp('\\b' + nme + '\\b', 'i').test(t) && nme.length > 2; });
    return [
      { id: 'len', label: 'Length 18–40 words', ok: n >= 18 && n <= 40, note: n + ' words' },
      { id: 'one', label: 'One sentence', ok: (t.match(/[.!?]\s+[A-Z]/g) || []).length === 0, note: '' },
      { id: 'name', label: 'Describes the lead instead of naming them', ok: !hasName, note: hasName ? 'Replace the character name with a role or trait' : '' },
      { id: 'goal', label: 'States what the lead must do', ok: /\b(must|has to|needs to|races|sets out|fights|tries|attempts|struggles|vows|plans|hunts|searches|escapes|survives|forced to|determined)\b/i.test(t), note: '' },
      { id: 'stakes', label: 'Gives a cost of failure or a clock', ok: /\b(before|or|unless|until|if|deadline|clock|last chance|only|lives?|dies?|death|destroy\w*)\b/i.test(t), note: '' },
      { id: 'opp', label: 'Names an opposing force', ok: /\b(while|against|hunt\w*|chas\w*|stalk\w*|threat\w*|enemy|killer|rival|villain|corrupt\w*|battle|forces?|army|monster|criminal|gang|conspiracy|adversary|odds)\b/i.test(t), note: '' },
      { id: 'irony', label: 'Has a hook, irony or contrast', ok: /\b(but|yet|only|unlikely|reluctant|ex-\w+|retired|forced|accidentally|secretly|never|despite|although|against every)\b/i.test(t), note: '' }
    ];
  };

  /* =============== ISSUES + CLICK-THROUGH SUGGESTIONS =============== */
  var BASEV = 'walk look turn open close stand sit run go come see take pick grab stare smile nod move pull push reach cross enter step jump fall rise hold throw watch wait say ask reply answer begin start stop light put set leave drive climb shut slam race rush dart stride storm hurry crawl creep fire shoot aim raise lift lower reach scan study examine search check read write type dial call press hit strike kick punch drag carry follow chase rush slip slide crouch kneel lean tilt shake wave point gesture sigh laugh cry shout scream whisper mutter nod frown glare blink flinch gasp breathe swallow tremble shiver work play eat drink pour fill empty lock unlock knock ring buzz hum roar rumble crash burn blow explode land hover circle approach retreat advance freeze spin twist bend break tear cut drop spill splash smash grind rattle shudder stumble trip tumble wander drift float sink swim dive'.split(' ');
  var BASESET = {}; BASEV.forEach(function (v) { BASESET[v] = 1; });
  var IRR = { be: 'is', have: 'has', go: 'goes', do: 'does' };
  function sform(v) { if (IRR[v]) return IRR[v]; if (/(s|x|z|ch|sh)$/.test(v)) return v + 'es'; if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies'; return v + 's'; }
  function baseFromIng(w) {
    w = w.toLowerCase(); var st = w.slice(0, -3), c = [st, st + 'e']; if (/(.)\1$/.test(st)) c.push(st.slice(0, -1)); if (/ying$/.test(w)) c.push(st);
    for (var i = 0; i < c.length; i++) if (BASESET[c[i]]) return c[i]; return '';
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  C.issues = function (R) {
    var m = R.m, X = R.X, out = [], id = 0;
    function add(o) { o.id = 'I' + (++id); o.sev = o.sev || 'warn'; o.sug = o.sug || []; out.push(o); return o; }
    function rowOf(h) { return h.li; }
    /* line-level fixes: certain */
    X.fixes.forEach(function (f) {
      add({ rule: f.id, cat: f.cls === 'format' ? 'Format' : 'Grammar', name: f.name, sc: f.sc, si: f.si, pg: f.pg, li: f.li, q: f.q, msg: f.msg, sev: 'fix', fix: f, sug: [{ label: f.to === '' ? 'Remove' : 'Change to “' + f.to + '”', op: { t: 'rep', li: f.li, start: f.start, end: f.end, to: f.to }, kind: 'fix', preview: f.to }] });
    });
    /* prose: rewrites we can propose with confidence */
    X.hedge.forEach(function (h) {
      var mm = /\b(begins|starts)\s+to\s+(\w+)/i.exec(h.q);
      var sug = [];
      if (mm && BASESET[mm[2].toLowerCase()]) { var row = m.lines[h.li]; var idx = row ? row.text.search(new RegExp('\\b' + mm[1] + '\\s+to\\s+' + mm[2] + '\\b', 'i')) : -1; if (idx >= 0) sug.push({ label: 'Say it directly: “' + sform(mm[2].toLowerCase()) + '”', kind: 'rewrite', op: { t: 'rep', li: h.li, start: idx, end: idx + mm[0].length, to: sform(mm[2].toLowerCase()) } }); }
      sug.push({ label: 'Hedges (begins to, seems to, tries to) weaken the image. Pick the verb that happens.', kind: 'tip' });
      add({ rule: 'A03', cat: 'Prose', name: 'Hedged action', sc: h.sc, si: h.si, pg: h.pg, li: h.li, q: h.q, msg: 'The hedge “' + h.m + '” softens the action.', sug: sug });
    });
    X.progressive.forEach(function (h) {
      var mm = /\b(is|are)\s+(\w+ing)\b/i.exec(h.q), sug = [];
      if (mm) { var b = baseFromIng(mm[2]); var row = m.lines[h.li]; var idx = row ? row.text.search(new RegExp('\\b' + mm[1] + '\\s+' + mm[2] + '\\b', 'i')) : -1; if (b && idx >= 0) sug.push({ label: 'Simple present: “' + (mm[1].toLowerCase() === 'are' ? b : sform(b)) + '”', kind: 'rewrite', op: { t: 'rep', li: h.li, start: idx, end: idx + mm[0].length, to: mm[1].toLowerCase() === 'are' ? b : sform(b) } }); }
      sug.push({ label: 'Screenplay action reads best in the simple present.', kind: 'tip' });
      add({ rule: 'A06', cat: 'Prose', name: 'Progressive tense', sc: h.sc, si: h.si, pg: h.pg, li: h.li, q: h.q, msg: '“' + h.m + '” can be a simple present verb.', sev: 'note', sug: sug });
    });
    X.camera.filter(function (h) { return /^WE (SEE|HEAR)$/i.test(h.m); }).forEach(function (h) {
      var row = m.lines[h.li]; var idx = row ? row.text.search(/\bWE (SEE|HEAR)\b\s*/i) : -1;
      var sug = []; if (idx >= 0) { var mm = /\bWE (SEE|HEAR)\b\s*/i.exec(row.text); sug.push({ label: 'Remove “' + mm[0].trim() + '” and describe it directly', kind: 'rewrite', op: { t: 'rep', li: h.li, start: idx, end: idx + mm[0].length, to: '' , cap: true } }); }
      sug.push({ label: 'Describe what is on screen without naming the camera or the viewer.', kind: 'tip' });
      add({ rule: 'A04', cat: 'Prose', name: 'Camera direction', sc: h.sc, si: h.si, pg: h.pg, li: h.li, q: h.q, msg: '“' + h.m + '” points at the camera instead of the scene.', sev: 'note', sug: sug });
    });
    X.camera.filter(function (h) { return !/^WE (SEE|HEAR)$/i.test(h.m) && !/^(CUT TO|FADE|SMASH CUT|MATCH CUT)$/i.test(h.m); }).slice(0, 80).forEach(function (h) {
      add({ rule: 'A04', cat: 'Prose', name: 'Camera direction', sc: h.sc, si: h.si, pg: h.pg, li: h.li, q: h.q, msg: '“' + h.m + '” directs the camera; spec scripts usually leave that to the director.', sev: 'note', sug: [{ label: 'Say what happens in the shot (who or what we notice) without the technical term.', kind: 'tip' }] });
    });
    X.adverbs.slice(0, 120).forEach(function (h) {
      var row = m.lines[h.li]; var idx = row ? row.text.search(new RegExp('\\s?\\b' + h.m + '\\b')) : -1; var sug = [];
      if (idx >= 0 && /^(suddenly|slowly|quickly|really|very|just|simply|finally|nervously|carefully|quietly|angrily|calmly|desperately|silently|violently)$/i.test(h.m)) sug.push({ label: 'Cut “' + h.m + '”', kind: 'rewrite', op: { t: 'rep', li: h.li, start: idx, end: idx + row.text.slice(idx).match(new RegExp('\\s?\\b' + h.m + '\\b'))[0].length, to: '' } });
      sug.push({ label: 'Replace the adverb with a stronger verb (“walks slowly” → “creeps”).', kind: 'tip' });
      add({ rule: 'A05', cat: 'Prose', name: 'Adverb', sc: h.sc, si: h.si, pg: h.pg, li: h.li, q: h.q, msg: 'The adverb “' + h.m + '” can usually become a better verb.', sev: 'note', sug: sug });
    });
    X.unfilm.slice(0, 150).forEach(function (h) {
      add({ rule: 'A02', cat: 'Prose', name: 'Unfilmable', sc: h.sc, si: h.si, pg: h.pg, li: h.li, q: h.q, msg: '“' + h.m + '” describes something the audience cannot see or hear.', sug: [
        { label: 'Show it: what does the character do, say or avoid doing that proves it?', kind: 'tip' },
        { label: 'Hand it to an object or a reaction (“' + (/think|know|realiz|remember|wonder/i.test(h.m) ? 'She studies the door. Her hand drifts to the lock.' : 'He turns the ring on his finger.') + '”).', kind: 'tip' },
        { label: 'If it is backstory, put a prop or a line of dialogue in the scene to carry it.', kind: 'tip' }] });
    });
    X.paraLong.slice(0, 80).forEach(function (p) {
      var sen = U.sentences(p.txt), sug = [];
      if (sen.length >= 3) { var half = p.txt.length / 2, acc = 0, cut = 0; for (var i = 0; i < sen.length - 1; i++) { acc += sen[i].length + 1; cut = i + 1; if (acc >= half) break; }
        var rows = p.rows, idx = 0, rowCut = null, run = 0; var target = sen.slice(0, cut).join(' ').length;
        for (var r = 0; r < rows.length; r++) { run += rows[r].text.length + 1; if (run >= target - 8) { rowCut = r + 1; break; } }
        if (rowCut && rowCut < rows.length) sug.push({ label: 'Start a new paragraph after “' + C.snip(sen[cut - 1], sen[cut - 1].length, 0, 60) + '”', kind: 'rewrite', op: { t: 'pb', li: rows[rowCut].i } }); }
      sug.push({ label: 'Break at the next change of focus (a new subject, location or beat).', kind: 'tip' });
      add({ rule: 'A01', cat: 'Prose', name: 'Dense action block', sc: m.scenes[p.sc].num, si: p.sc, pg: Math.floor(p.pg) + 1, li: p.li, q: C.snip(p.txt, 0, 0, 100), msg: 'This action paragraph runs about ' + p.rl + ' printed lines.', sug: sug });
    });
    X.longSent.slice(0, 40).forEach(function (h) { add({ rule: 'A08', cat: 'Prose', name: 'Very long sentence', sc: h.sc, si: h.si, pg: h.pg, li: null, q: h.q, msg: 'A sentence of more than 40 words.', sev: 'note', sug: [{ label: 'Split it at the first “and” or “as” into two beats.', kind: 'tip' }] }); });
    X.openers.slice(0, 30).forEach(function (h) { add({ rule: 'A09', cat: 'Prose', name: 'Repeated sentence openers', sc: h.sc, si: h.si, pg: h.pg, li: h.li, q: h.q, msg: h.n + ' sentences in a row start with “' + h.w + '”.', sev: 'note', sug: [{ label: 'Vary the first word of two of them, or merge the actions into one sentence.', kind: 'tip' }] }); });
    X.passive.slice(0, 80).forEach(function (h) { add({ rule: 'A06', cat: 'Prose', name: 'Passive voice', sc: h.sc, si: h.si, pg: h.pg, li: h.li, q: h.q, msg: 'Passive construction: “' + h.m + '”.', sev: 'note', sug: [{ label: 'Name who acts: “The bullet was fired by Ray” → “Ray fires”.', kind: 'tip' }] }); });
    /* dialogue */
    X.mono.forEach(function (sp) {
      var rows = sp.rows, total = wc(sp.txt), acc = 0, cutRow = -1;
      for (var r = 0; r < rows.length - 1; r++) { acc += wc(rows[r].text); if (acc >= total * 0.45) { cutRow = r + 1; break; } }
      var sug = []; if (cutRow > 0 && rows[cutRow]) sug.push({ label: 'Interrupt the speech with a beat (edit the text below), then resume as “' + sp.ch + ' (CONT’D)”', kind: 'rewrite', op: { t: 'split', li: rows[cutRow].i, name: sp.ch, beat: 'A beat.' }, editable: 'beat' });
      sug.push({ label: 'Cut the speech by a third; trim the explanation and keep the one image or demand.', kind: 'tip' });
      sug.push({ label: 'Let another character react or interrupt halfway so the scene stays a conversation.', kind: 'tip' });
      add({ rule: 'D03', cat: 'Dialogue', name: 'Monologue', sc: m.scenes[sp.sc].num, si: sp.sc, pg: Math.floor(sp.pg) + 1, li: sp.li, q: C.snip(sp.txt, 0, 0, 100), msg: nm({ name: sp.ch }) + ' speaks for ' + total + ' words without a break.', sug: sug });
    });
    X.pingpong.forEach(function (r) { add({ rule: 'D04', cat: 'Dialogue', name: 'Rapid exchange', sc: r.s.num, si: r.s.idx, pg: Math.floor(r.s.pg0) + 1, li: null, q: C.snip(r.q, 0, 0, 80), msg: r.n + ' short lines trade back and forth with no action beat.', sev: 'note', sug: [{ label: 'Insert one physical beat or an interruption between exchanges.', kind: 'tip' }, { label: 'Merge two of the shortest lines and let one speaker be wrong.', kind: 'tip' }] }); });
    X.nose.forEach(function (h) { add({ rule: 'D06', cat: 'Dialogue', name: 'On-the-nose line', sc: h.sc, si: h.si, pg: h.pg, li: h.li, q: h.q, msg: 'The character states a feeling outright (“' + h.m + '”).', sug: [
      { label: 'Say the opposite, or change the subject, and let the feeling leak through.', kind: 'tip' }, { label: 'Replace the line with an action that shows it (“She straightens the same picture twice.”).', kind: 'tip' }, { label: 'Keep the feeling and cut the explanation: end on the first clause.', kind: 'tip' }] }); });
    X.expo.forEach(function (h) { add({ rule: 'D07', cat: 'Dialogue', name: 'Exposition tell', sc: h.sc, si: h.si, pg: h.pg, li: h.li, q: h.q, msg: '“' + h.m + '” tells the audience what the listener already knows.', sug: [{ label: 'Make the listener resist or correct the information.', kind: 'tip' }, { label: 'Show it as a prop, a photo or a visible habit instead.', kind: 'tip' }] }); });
    X.greets.slice(0, 60).forEach(function (sp) { var ws = wc(sp.txt); var sugs = []; if (ws <= 3 && sp.rows.length === 1) sugs.push({ label: 'Cut this greeting or farewell', kind: 'rewrite', op: { t: 'delspeech', li: sp.li, n: 1 + sp.par.length + sp.rows.length } }); sugs.push({ label: 'Start the scene later and leave the scene earlier; greetings add length, not drama.', kind: 'tip' }); add({ rule: 'D08', cat: 'Dialogue', name: 'Greeting or farewell', sc: m.scenes[sp.sc].num, si: sp.sc, pg: Math.floor(sp.pg) + 1, li: sp.li, q: C.snip(sp.txt, 0, 0, 80), msg: 'Small talk at the start or end of a scene.', sev: 'note', sug: sugs }); });
    X.parenAdv.forEach(function (h) { add({ rule: 'D12', cat: 'Dialogue', name: 'Adverb parenthetical', sc: h.sc, si: h.si, pg: h.pg, li: null, q: h.q, msg: 'A parenthetical that tells the actor how to feel.', sug: [{ label: 'Delete it and let the line carry the tone.', kind: 'tip' }, { label: 'Replace it with a small action line before the speech.', kind: 'tip' }] }); });
    X.repeats.forEach(function (g) { add({ rule: 'D13', cat: 'Dialogue', name: 'Repeated line', sc: m.scenes[g[0].sc].num, si: g[0].sc, pg: Math.floor(g[0].pg) + 1, li: g[0].li, q: C.snip(g[0].txt, 0, 0, 80), msg: 'This line is spoken ' + g.length + ' times (' + g.map(function (x) { return 'Sc ' + m.scenes[x.sc].num; }).join(', ') + ').', sev: 'note', sug: [{ label: 'If it is a motif, make each repetition mean something new. If not, vary the wording.', kind: 'tip' }] }); });
    X.lastDlgNoPunct.slice(0, 40).forEach(function (sp) { add({ rule: 'F22', cat: 'Format', name: 'Speech without end punctuation', sc: m.scenes[sp.sc].num, si: sp.sc, pg: Math.floor(sp.pg) + 1, li: sp.rows[sp.rows.length - 1].i, q: C.snip(sp.txt, sp.txt.length, 0, 80), msg: 'The speech ends without a full stop, question mark or dash.', sev: 'note', sug: [{ label: 'Add a full stop', kind: 'fix', op: { t: 'rep', li: sp.rows[sp.rows.length - 1].i, start: sp.rows[sp.rows.length - 1].text.length, end: sp.rows[sp.rows.length - 1].text.length, to: '.' } }, { label: 'End with “--” if the line is interrupted', kind: 'fix', op: { t: 'rep', li: sp.rows[sp.rows.length - 1].i, start: sp.rows[sp.rows.length - 1].text.length, end: sp.rows[sp.rows.length - 1].text.length, to: '--' } }] }); });
    /* characters */
    X.simNames.forEach(function (v) { add({ rule: 'C06', cat: 'Character', name: 'Similar names', sc: '', si: null, pg: Math.floor(v[0].first) + 1, li: v[0].intro ? v[0].intro.p.li : null, q: nm(v[0]) + ' and ' + nm(v[1]), msg: 'These names look alike on the page and can be confused when reading.', sug: [{ label: 'Rename one so the first letter or shape is different.', kind: 'tip' }] }); });
    X.variants.forEach(function (g) {
      var canon = g.slice().sort(function (a, b) { return b.speeches - a.speeches; })[0], ops = [];
      m.lines.forEach(function (l) { if (l.type === 'character') { var nmv = (window.SNCue ? SNCue.name(l.text) : l.text); g.forEach(function (c) { if (c !== canon && nmv === c.name) ops.push({ t: 'rep', li: l.i, start: 0, end: l.text.replace(/\s*\(.*\)\s*$/, '').length, to: canon.name }); }); } });
      add({ rule: 'C07', cat: 'Character', name: 'Cue variants', sc: '', si: null, pg: 0, li: null, q: g.map(function (c) { return c.name + ' (' + c.speeches + ')'; }).join(' / '), msg: 'The same person may be cued under different names.', sug: [{ label: 'Use “' + canon.name + '” for all of them', kind: 'fix', op: { t: 'multi', ops: ops } }] });
    });
    X.minor.filter(function (c) { return X.genericName.test(c.name); }).slice(0, 20).forEach(function (c) { add({ rule: 'C05', cat: 'Character', name: 'Placeholder speaker', sc: m.scenes[Object.keys(c.scenes)[0]].num, si: +Object.keys(c.scenes)[0], pg: Math.floor(c.first) + 1, li: null, q: c.name, msg: 'A one-line speaker with a placeholder name.', sev: 'note', sug: [{ label: 'Give the speaker a role and a trait (“THE NERVOUS CLERK”).', kind: 'tip' }] }); });
    X.lateChars.forEach(function (c) { add({ rule: 'C09', cat: 'Character', name: 'Late introduction', sc: m.scenes[Object.keys(c.scenes)[0]].num, si: +Object.keys(c.scenes)[0], pg: Math.floor(c.first) + 1, li: null, q: nm(c) + ' first speaks on p. ' + (Math.floor(c.first) + 1), msg: nm(c) + ' (' + c.speeches + ' speeches) appears after the 55% mark.', sev: 'note', sug: [{ label: 'Plant a mention, a photo or a cameo in act one.', kind: 'tip' }] }); });
    R.X.top.forEach(function (c) { if (c.intro && !c.phys && c.speeches >= 20) add({ rule: 'C10', cat: 'Character', name: 'Introduction without description', sc: m.scenes[c.intro.p.sc].num, si: c.intro.p.sc, pg: Math.floor(c.intro.p.pg) + 1, li: c.intro.p.li, q: C.snip(c.introSentence || '', 0, 0, 100), msg: nm(c) + ' has ' + c.speeches + ' speeches but no physical or age cue when first introduced.', sev: 'note', sug: [{ label: 'Add an age and one visible trait: “' + c.name + ', 40s, ____.”', kind: 'tip' }] }); });
    /* structure */
    X.dead.forEach(function (z) { add({ rule: 'S12', cat: 'Structure', name: 'Flat stretch', sc: z.from.num, si: z.from.idx, pg: Math.floor(z.from.pg0) + 1, li: z.from.hli != null ? z.from.hli : null, q: 'Sc ' + z.from.num + ' to Sc ' + z.to.num + ' (' + z.n + ' scenes, ' + r1(z.pages) + ' pages)', msg: 'A run of low-intensity scenes.', sug: [{ label: 'Add an obstacle, a reveal or a deadline to the first two scenes in the run.', kind: 'tip' }, { label: 'Merge the scenes that only transport characters between locations.', kind: 'tip' }, { label: 'Cut the scene in the run with the fewest speakers.', kind: 'tip' }] }); });
    X.noTod.slice(0, 60).forEach(function (o) {
      var hl = o.s.hli, row = hl != null ? m.lines[hl] : null, sug = [];
      if (row) ['DAY', 'NIGHT', 'CONTINUOUS', 'LATER'].forEach(function (t) { sug.push({ label: 'Add “- ' + t + '”', kind: 'fix', op: { t: 'rep', li: hl, start: row.text.length, end: row.text.length, to: ' - ' + t } }); });
      add({ rule: 'F01', cat: 'Format', name: 'Heading without time of day', sc: o.s.num, si: o.s.idx, pg: Math.floor(o.s.pg0) + 1, li: hl, q: o.h, msg: 'The scene heading has no time of day.', sug: sug });
    });
    X.locVariants.slice(0, 40).forEach(function (v) {
      var canon = X.locCount[v[0]] >= X.locCount[v[1]] ? v[0] : v[1], other = canon === v[0] ? v[1] : v[0], ops = [];
      m.live.forEach(function (s) { if ((s.loc || '').replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim() === other && s.hli != null) { var row = m.lines[s.hli], at = row.text.toUpperCase().indexOf(String(s.loc).split(' - ')[0].toUpperCase().slice(0, 12)); if (at >= 0) { var seg = row.text.slice(at); var rawLoc = String(s.loc); var idx2 = row.text.toUpperCase().indexOf(rawLoc.toUpperCase()); if (idx2 >= 0) ops.push({ t: 'rep', li: s.hli, start: idx2, end: idx2 + rawLoc.length, to: canon }); } } });
      var first = m.live.filter(function (s) { return (s.loc || '').replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim() === other; })[0];
      add({ rule: 'F02', cat: 'Format', name: 'Location name variants', sc: first ? first.num : '', si: first ? first.idx : null, pg: first ? Math.floor(first.pg0) + 1 : 0, li: first ? first.hli : null, q: v[0] + ' / ' + v[1], msg: 'Two spellings of what may be one location (' + X.locCount[v[0]] + ' and ' + X.locCount[v[1]] + ' scenes).', sev: 'note', sug: ops.length ? [{ label: 'Use “' + canon + '” everywhere', kind: 'fix', op: { t: 'multi', ops: ops } }] : [{ label: 'Pick one spelling and use it for every heading.', kind: 'tip' }] });
    });
    X.cutTo.length > 0 && X.per10(X.cutTo.length) > 3 && X.cutTo.slice(0, 60).forEach(function (h) { add({ rule: 'F07', cat: 'Format', name: 'CUT TO transition', sc: h.sc, si: h.si, pg: h.pg, li: h.li, q: h.q, msg: 'Frequent CUT TO: transitions add length without meaning.', sev: 'note', sug: [{ label: 'Delete this transition', kind: 'fix', op: { t: 'del', li: h.li } }] }); });
    m.orphans.forEach(function (i) { var l = m.lines[i]; var sc = null; m.scenes.forEach(function (s) { if (s.lines.indexOf(l) >= 0) sc = s; }); add({ rule: 'F05', cat: 'Format', name: 'Speaker without dialogue', sc: sc ? sc.num : '', si: sc ? sc.idx : null, pg: sc ? Math.floor(sc.pg0) + 1 : 0, li: i, q: l.text, msg: 'A character name with no dialogue underneath it.', sug: [{ label: 'Delete the name line', kind: 'fix', op: { t: 'del', li: i } }, { label: 'Add the missing line of dialogue.', kind: 'tip' }] }); });
    /* tropes become issues too (informational) */
    R.T.filter(function (t) { return t.kind === 'cliche'; }).forEach(function (t) {
      t.hits.slice(0, 6).forEach(function (h) { add({ rule: 'T:' + t.id, cat: 'Tropes', name: t.name, sc: h.sc, si: h.si, pg: h.pg, li: h.li != null ? h.li : null, q: h.q, msg: 'Familiar device: ' + t.name + '.', sev: 'trope', sug: [{ label: t.tip, kind: 'tip' }] }); });
    });
    out.forEach(function (o) { if (o.li == null && o.si != null && m.scenes[o.si] && m.scenes[o.si].hli != null) o.li = m.scenes[o.si].hli; });
    return out;
  };

  /* =============== APPLYING EDITS AND SERIALISING =============== */
  C.applyOps = function (lines, ops) {
    var L0 = lines.map(function (l) { return { type: l.type, text: l.text, pb: l.pb, i: l.i }; });
    var byLi = {}, flat = [];
    (function walk(a) { a.forEach(function (o) { if (o.t === 'multi') walk(o.ops); else flat.push(o); }); })(ops);
    flat.filter(function (o) { return o.t === 'rep'; }).sort(function (a, b) { return a.li === b.li ? b.start - a.start : a.li - b.li; }).forEach(function (o) {
      var l = L0[o.li]; if (!l) return; var t = l.text, to = o.to;
      l.text = t.slice(0, o.start) + to + t.slice(o.end);
      if (o.cap) { var j = o.start; l.text = l.text.slice(0, j) + l.text.slice(j).replace(/^(\W*)([a-z])/, function (m1, a, b) { return a + b.toUpperCase(); }); }
      l.text = l.text.replace(/\s{2,}(?=\S)/g, function (s2) { return s2.length > 2 ? ' ' : s2; });
    });
    flat.filter(function (o) { return o.t === 'pb'; }).forEach(function (o) { if (L0[o.li]) L0[o.li].pb = 1; });
    var del = {}; flat.filter(function (o) { return o.t === 'del'; }).forEach(function (o) { del[o.li] = 1; });
    flat.filter(function (o) { return o.t === 'delspeech'; }).forEach(function (o) { for (var k = 0; k < o.n; k++) del[o.li + k] = 1; });
    var splits = {}; flat.filter(function (o) { return o.t === 'split'; }).forEach(function (o) { splits[o.li] = o; });
    var out = [];
    L0.forEach(function (l, i) {
      if (splits[i]) { out.push({ type: 'action', text: splits[i].beat || 'A beat.', pb: 1, i: -1 }); out.push({ type: 'character', text: splits[i].name + " (CONT'D)", i: -1 }); }
      if (!del[i]) out.push(l);
    });
    return out;
  };
  C.serialize = function (lines, meta, opts) {
    opts = opts || {}; var out = [], prev = null, first = true;
    if (meta && (meta.title || meta.author) && opts.header !== false) { if (meta.title) out.push('Title: ' + meta.title); if (meta.author) out.push('Author: ' + meta.author); out.push(''); }
    lines.forEach(function (l) {
      var t = String(l.text || '').trim(); if (!t) return;
      var ty = l.type;
      if (ty === 'scene-heading') { out.push(''); out.push(opts.fountain && !/^(INT|EXT|EST|I\/E|INT\.?\/EXT)/i.test(t) ? '.' + t : t); out.push(''); }
      else if (ty === 'character') { if (out.length && out[out.length - 1] !== '') out.push(''); out.push(t.toUpperCase()); }
      else if (ty === 'parenthetical') out.push(/^\(.*\)$/.test(t) ? t : '(' + t.replace(/^\(|\)$/g, '') + ')');
      else if (ty === 'dialogue') out.push(t);
      else if (ty === 'transition') { out.push(''); out.push(opts.fountain && !/TO:$/.test(t) ? '> ' + t : t); out.push(''); }
      else { if ((l.pb || (prev && prev.type !== 'action')) && out.length && out[out.length - 1] !== '') out.push(''); out.push(t); }
      prev = l; first = false;
    });
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  };
})();
