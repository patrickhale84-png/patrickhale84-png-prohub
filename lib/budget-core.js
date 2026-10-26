/* Union budget engine: accounts, globals, overtime, fringes with caps, percentage lines, rate links, scenarios. No DOM here. */
(function () {
  if (window.PHBud) return;
  var D = window.PHBudgetData, KEY = 'prohub_budget_v2', VKEY = 'prohub_budget_versions_v1';
  var GROUPS = ['ATL', 'BTL', 'POST', 'OTHER'];
  var UNITS = ['day', 'week', 'hour', 'flat', 'allow', 'pct'];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function num(v) { v = parseFloat(v); return isFinite(v) ? v : 0; }
  function uid() { return 'l' + Math.random().toString(36).slice(2, 9); }
  function round2(x) { return Math.round(x * 100) / 100; }

  function fresh(region) {
    region = region || 'US';
    var S = {
      v: 2, meta: { title: '', region: region, ccy: D.ccy[region] || '$', notes: '' },
      globals: { shootDays: 20, prepWeeks: 6, wrapWeeks: 1, postWeeks: 16, hoursPerDay: 10, daysPerWeek: 5, vars: {} },
      ot: clone(D.ot), accounts: [], fringes: {}, rates: [], pct: {}
    };
    D.accounts.forEach(function (a) { S.accounts.push({ no: a[0], name: a[1], group: a[2], lines: [] }); });
    Object.keys(D.fringes).forEach(function (k) { if (D.fringes[k].region === region) S.fringes[k] = clone(D.fringes[k]); });
    S.rates = D.rates.filter(function (r) { return r.region === region; }).map(clone);
    return S;
  }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && s.v === 2) return s; } catch (e) { } return null; }
  function save(S) { try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) { return false; } }
  function versions() { try { return JSON.parse(localStorage.getItem(VKEY) || '[]') || []; } catch (e) { return []; } }
  function saveVersion(S, name) { var v = versions(); v.unshift({ name: name || 'Version', ts: Date.now(), state: clone(S) }); v = v.slice(0, 12); try { localStorage.setItem(VKEY, JSON.stringify(v)); } catch (e) { v.pop(); try { localStorage.setItem(VKEY, JSON.stringify(v.slice(0, 5))); } catch (x) { } } return v; }

  /* variables: shootDays, prepWeeks, wrapWeeks, postWeeks, shootWeeks, plus your own; expressions may add them: prepWeeks+shootWeeks */
  function varsOf(S) {
    var g = S.globals, o = { shootDays: num(g.shootDays), prepWeeks: num(g.prepWeeks), wrapWeeks: num(g.wrapWeeks), postWeeks: num(g.postWeeks), hoursPerDay: num(g.hoursPerDay), daysPerWeek: num(g.daysPerWeek) || 5 };
    o.shootWeeks = Math.ceil(o.shootDays / o.daysPerWeek * 10) / 10; Object.keys(g.vars || {}).forEach(function (k) { o[k] = num(g.vars[k]); }); return o;
  }
  function evalQty(expr, V) { if (expr == null || expr === '') return null; var t = String(expr).split('+'), sum = 0, ok = true; t.forEach(function (p) { p = p.trim(); if (!p) return; if (V.hasOwnProperty(p)) sum += V[p]; else if (isFinite(parseFloat(p))) sum += parseFloat(p); else ok = false; }); return ok ? sum : null; }

  /* paid hours for a day of h hours at straight 8 */
  function payHours(h, ot) { h = num(h) || ot.straightHours; var s = ot.straightHours; if (h <= s) return s; var a = Math.min(h, ot.ot1Until) - s, b = Math.max(0, h - ot.ot1Until); return s + a * ot.ot1Mult + b * ot.ot2Mult; }

  function fringeFor(S, line, wages, hoursWorked) {
    var g = S.fringes[line.fringe]; if (!g || line.fringeOff) return { total: 0, items: [] };
    var out = [], tot = 0, mult = Math.max(1, num(line.mult) || 1), per = wages / mult;
    g.items.forEach(function (it) {
      var amt = 0;
      if (it.kind === 'pct') { var base = it.cap > 0 ? Math.min(per, it.cap) : per; amt = base * mult * num(it.v) / 100; }
      else if (it.kind === 'hourly') amt = hoursWorked * mult * num(it.v);
      else if (it.kind === 'flat') amt = num(it.v) * mult;
      out.push({ name: it.name, amount: amt, status: it.status }); tot += amt;
    });
    return { total: tot, items: out };
  }

  function calcLine(S, line, V) {
    var ot = S.ot, qty = evalQty(line.qtyVar, V); if (qty == null) qty = num(line.qty);
    var mult = Math.max(0, line.mult === '' || line.mult == null ? 1 : num(line.mult)), rate = num(line.rate), h = num(line.hours) || V.hoursPerDay, res = { qty: qty, wages: 0, base: 0, ot: 0, fringe: 0, total: 0, fr: [], hoursWorked: 0 };
    if (line.unit === 'pct') return res;
    if (line.unit === 'day') {
      var ph = payHours(h, ot), dayPay = line.hourly ? rate * ph : rate * ph / ot.straightHours;
      res.base = qty * mult * (line.hourly ? rate * ot.straightHours : rate); res.ot = qty * mult * dayPay - res.base; res.hoursWorked = qty * Math.max(h, ot.straightHours);
    } else if (line.unit === 'week') {
      res.base = qty * mult * rate; var weekH = h * V.daysPerWeek; res.hoursWorked = qty * Math.max(weekH, ot.weeklyHours);
      if (line.ot && weekH > ot.weeklyHours) res.ot = qty * mult * (weekH - ot.weeklyHours) * (rate / ot.weeklyHours) * ot.weeklyOT;
    } else if (line.unit === 'hour') { res.base = qty * mult * rate; res.hoursWorked = qty; }
    else { res.base = qty * mult * rate; }
    res.wages = res.base + res.ot;
    var f = fringeFor(S, line, res.wages, res.hoursWorked); res.fringe = f.total; res.fr = f.items; res.total = res.wages + res.fringe; return res;
  }

  function calc(S) {
    var V = varsOf(S), out = { accounts: [], groups: { ATL: 0, BTL: 0, POST: 0, OTHER: 0 }, wages: 0, fringes: 0, grand: 0, warnings: [], V: V };
    S.accounts.forEach(function (a) {
      var A = { no: a.no, name: a.name, group: a.group, lines: [], sub: 0, ot: 0, fringe: 0, total: 0 };
      a.lines.forEach(function (l) { var c = calcLine(S, l, V); A.lines.push({ line: l, c: c }); });
      out.accounts.push(A);
    });
    /* percentage lines run after the others, in account order, on the totals so far */
    function groupTot(g) { var t = 0; out.accounts.forEach(function (A) { if (A.group === g) A.lines.forEach(function (x) { if (x.line.unit !== 'pct') t += x.c.total; else t += x.c.total; }); }); return t; }
    out.accounts.forEach(function (A) {
      A.lines.forEach(function (x) {
        if (x.line.unit !== 'pct') return;
        var basis = String(x.line.basis || 'ATL+BTL+POST').split('+'), b = 0; basis.forEach(function (g) { g = g.trim(); if (GROUPS.indexOf(g) >= 0) b += groupTot(g); });
        x.c.base = b; x.c.wages = 0; x.c.total = b * num(x.line.rate) / 100; x.c.fringe = 0;
      });
    });
    out.accounts.forEach(function (A) { A.lines.forEach(function (x) { A.sub += x.c.base; A.ot += x.c.ot; A.fringe += x.c.fringe; A.total += x.c.total; if (x.line.unit !== 'pct') out.wages += x.c.wages; }); out.groups[A.group] += A.total; out.fringes += A.fringe; out.grand += A.total; });
    /* warnings */
    S.accounts.forEach(function (a) { a.lines.forEach(function (l) { if (l.unit !== 'pct' && !num(l.rate) && l.desc) out.warnings.push('No rate on "' + l.desc + '" (' + a.no + ')'); if (l.rateRef) { var r = rateById(S, l.rateRef); if (r && r.status === 'older') out.warnings.push('"' + l.desc + '" uses an older-source rate'); } }); });
    return out;
  }
  function rateById(S, id) { for (var i = 0; i < S.rates.length; i++) if (S.rates[i].id === id) return S.rates[i]; return null; }

  /* apply a rate-card row to a line: sets rate, unit, fringe, and links it so later rate edits flow through */
  function applyRate(S, line, id) {
    var r = rateById(S, id); if (!r) return false;
    line.rateRef = r.id; line.rate = r.rate; line.fringe = r.fringe || line.fringe;
    if (r.unit === 'hour') { line.unit = 'day'; line.hourly = true; line.ot = true; } else if (r.unit === 'day') { line.unit = 'day'; line.hourly = false; line.ot = true; } else if (r.unit === 'week') { line.unit = 'week'; line.hourly = false; line.ot = true; } else { line.unit = 'flat'; line.hourly = false; }
    if (!line.desc) line.desc = r.name; return true;
  }
  function relink(S) { S.accounts.forEach(function (a) { a.lines.forEach(function (l) { if (l.rateRef) { var r = rateById(S, l.rateRef); if (r) l.rate = r.rate; } }); }); }

  function newLine(o) { return Object.assign({ id: uid(), desc: '', qty: 1, qtyVar: '', unit: 'day', mult: 1, rate: 0, rateRef: '', fringe: '', hours: '', hourly: false, ot: false, fringeOff: false, basis: '', note: '' }, o || {}); }
  function acct(S, no) { for (var i = 0; i < S.accounts.length; i++) if (S.accounts[i].no === no) return S.accounts[i]; return null; }

  /* a starting budget for a US union feature. Lines with no published rate are left at zero for you to fill in. */
  function starter(S) {
    function add(no, o) { var a = acct(S, no); if (!a) return; var l = newLine(o); if (o.rateRef) { applyRate(S, l, o.rateRef); l.desc = o.desc || l.desc; if (o.unit) l.unit = o.unit; } a.lines.push(l); }
    add('1100', { desc: 'Screenplay (WGA)', rateRef: 'wga-sp-low', qty: 1 });
    add('1200', { desc: 'Executive Producer', unit: 'flat', rate: 0, fringe: 'US-NONU', note: 'Enter fee' });
    add('1200', { desc: 'Producer', unit: 'flat', rate: 0, fringe: 'US-NONU', note: 'Enter fee' });
    add('1300', { desc: 'Director (DGA)', rateRef: 'dga-dir-low', qtyVar: 'prepWeeks+shootWeeks+wrapWeeks' });
    add('1400', { desc: 'Lead cast (SAG-AFTRA weekly)', rateRef: 'sag-week', qtyVar: 'shootWeeks', mult: 2 });
    add('1400', { desc: 'Supporting cast (SAG-AFTRA daily)', rateRef: 'sag-day', qty: 5, mult: 6, ot: false });
    add('2000', { desc: 'Unit Production Manager (DGA)', rateRef: 'dga-upm', qtyVar: 'prepWeeks+shootWeeks+wrapWeeks' });
    add('2000', { desc: 'First Assistant Director (DGA)', rateRef: 'dga-1ad', qtyVar: 'prepWeeks+shootWeeks' });
    add('2000', { desc: 'Key Second AD (DGA)', rateRef: 'dga-k2ad', qtyVar: 'shootWeeks' });
    add('2000', { desc: 'Second Second AD (DGA)', rateRef: 'dga-22ad', qtyVar: 'shootWeeks' });
    add('2100', { desc: 'Background actors (SAG-AFTRA)', rateRef: 'sag-bg', qty: 3, mult: 20 });
    add('2900', { desc: 'Stunt coordinator (SAG-AFTRA)', rateRef: 'sag-stuntco-day', qty: 3 });
    add('3000', { desc: 'Director of Photography', rateRef: 'i600-dp-wk', qtyVar: 'prepWeeks+shootWeeks' });
    add('3000', { desc: 'Camera Operator', rateRef: 'i600-op-wk', qtyVar: 'shootWeeks' });
    add('3000', { desc: 'First Assistant Camera', rateRef: 'i600-1ac-wk', qtyVar: 'shootWeeks' });
    add('3000', { desc: 'Second Assistant Camera', rateRef: 'i600-2ac-wk', qtyVar: 'shootWeeks' });
    add('3000', { desc: 'Digital Imaging Technician', rateRef: 'i600-dit-wk', qtyVar: 'shootWeeks' });
    add('3000', { desc: 'Still Photographer', rateRef: 'i600-still', qtyVar: 'shootDays' });
    add('3100', { desc: 'Gaffer', unit: 'week', rate: 0, fringe: 'US-IATSE', qtyVar: 'prepWeeks+shootWeeks', note: 'Enter rate from your agreement', ot: true });
    add('3200', { desc: 'Key Grip', unit: 'week', rate: 0, fringe: 'US-IATSE', qtyVar: 'prepWeeks+shootWeeks', note: 'Enter rate from your agreement', ot: true });
    add('3300', { desc: 'Production Sound Mixer', unit: 'week', rate: 0, fringe: 'US-IATSE', qtyVar: 'shootWeeks', note: 'Enter rate from your agreement', ot: true });
    add('3400', { desc: 'Transportation Coordinator', rateRef: 't399-coord', qtyVar: 'prepWeeks+shootWeeks+wrapWeeks' });
    add('3400', { desc: 'Driver Captain', rateRef: 't399-captain', qtyVar: 'shootDays', hours: 12 });
    add('3400', { desc: 'Drivers', rateRef: 't399-driver', qtyVar: 'shootDays', mult: 4, hours: 12 });
    add('3500', { desc: 'Location fees', unit: 'flat', rate: 0, qty: 1, fringe: 'US-NONE', note: 'Enter fees' });
    add('3700', { desc: 'Stage rental', unit: 'week', rate: 0, qtyVar: 'prepWeeks+shootWeeks+wrapWeeks', fringe: 'US-NONE', note: 'Enter rate' });
    add('4000', { desc: 'Editor', unit: 'week', rate: 0, qtyVar: 'postWeeks', fringe: 'US-NONU', note: 'Enter rate' });
    add('4100', { desc: 'Music', unit: 'allow', rate: 0, qty: 1, fringe: 'US-NONE', note: 'Enter allowance' });
    add('4300', { desc: 'Visual effects', unit: 'allow', rate: 0, qty: 1, fringe: 'US-NONE', note: 'Enter allowance' });
    add('5200', { desc: 'Production insurance', unit: 'pct', rate: 2, basis: 'ATL+BTL+POST', fringe: 'US-NONE', note: 'Assumed 2%: replace with your broker quote' });
    add('5400', { desc: 'Completion bond', unit: 'pct', rate: 3, basis: 'ATL+BTL+POST', fringe: 'US-NONE', note: 'Assumed 3%: replace with your bond company quote' });
    add('5400', { desc: 'Contingency', unit: 'pct', rate: 10, basis: 'ATL+BTL+POST', fringe: 'US-NONE', note: 'Usual practice is 10%' });
    return S;
  }

  /* what the script and schedule say, for filling the variables */
  function fromProject() {
    var out = { shootDays: 0, cast: 0, locations: 0, scenes: 0 };
    try {
      var sch = JSON.parse(localStorage.getItem('prohub_schedule_v1') || 'null'); if (sch && sch.items) out.shootDays = sch.items.filter(function (i) { return i.t === 'day'; }).length;
      var call = JSON.parse(localStorage.getItem('prohub_callsheet_v1') || 'null'); if (!out.shootDays && call && call.days) out.shootDays = call.days.length;
      var m = JSON.parse(localStorage.getItem('prehub_master_v1') || 'null');
      if (m && m.lines && m.lines.length && window.PHScript) { var sc = PHScript.derive(m.lines.map(function (l) { return { type: l.type, text: l.text, sn: l.sn, om: l.om, rv: l.rv }; })), cast = {}, loc = {}; sc.forEach(function (s) { if (s.omit) return; out.scenes++; (s.cast || []).forEach(function (c) { cast[c] = 1; }); loc[s.loc] = 1; }); out.cast = Object.keys(cast).length; out.locations = Object.keys(loc).length; out.title = m.projectName || ''; }
    } catch (e) { }
    return out;
  }

  function compare(A, B) {
    var a = calc(A), b = calc(B), rows = [], map = {};
    a.accounts.forEach(function (x) { map[x.no] = { no: x.no, name: x.name, a: x.total, b: 0 }; });
    b.accounts.forEach(function (x) { (map[x.no] = map[x.no] || { no: x.no, name: x.name, a: 0, b: 0 }).b = x.total; });
    Object.keys(map).sort().forEach(function (k) { var r = map[k]; r.d = r.b - r.a; if (Math.abs(r.d) > 0.005) rows.push(r); });
    return { rows: rows, a: a.grand, b: b.grand, d: b.grand - a.grand };
  }

  function toCSV(S) {
    var C = calc(S), rows = [['Acct', 'Description', 'Qty', 'Unit', 'X', 'Rate', 'Wages', 'Overtime', 'Fringes', 'Total', 'Fringe group', 'Rate source', 'Note']];
    C.accounts.forEach(function (A) {
      if (!A.lines.length) return;
      A.lines.forEach(function (x) { var l = x.line, r = l.rateRef ? rateById(S, l.rateRef) : null; rows.push([A.no, l.desc, x.c.qty, l.unit + (l.hourly ? ' (hourly rate)' : ''), l.mult, l.rate, round2(x.c.base), round2(x.c.ot), round2(x.c.fringe), round2(x.c.total), l.fringe ? (S.fringes[l.fringe] || {}).name || l.fringe : '', r ? r.agreement + ' / ' + r.source + ' (' + r.status + ')' : '', l.note]); });
      rows.push([A.no, 'Total ' + A.name, '', '', '', '', '', '', '', round2(A.total), '', '', '']);
    });
    rows.push(['', 'GRAND TOTAL', '', '', '', '', '', '', '', round2(C.grand), '', '', '']);
    return rows;
  }

  window.PHBud = { KEY: KEY, GROUPS: GROUPS, UNITS: UNITS, fresh: fresh, load: load, save: save, versions: versions, saveVersion: saveVersion, calc: calc, calcLine: calcLine, varsOf: varsOf, payHours: payHours, evalQty: evalQty, rateById: rateById, applyRate: applyRate, relink: relink, newLine: newLine, acct: acct, starter: starter, fromProject: fromProject, compare: compare, toCSV: toCSV, clone: clone, uid: uid };
})();
