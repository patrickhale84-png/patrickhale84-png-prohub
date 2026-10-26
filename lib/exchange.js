/* proHUB data exchange: CSV and calendar exports, Fountain and FDX export and import
   that keep scene numbers, breakdown tags, notes and omitted scenes. */
(function () {
  if (window.PHX) return;
  var TAGRE = /\[\[\s*proHUB\s*(\{[\s\S]*?\})\s*\]\]/;

  function g(n) { try { return window[n]; } catch (e) { return undefined; } }
  function model() { return g('M'); }
  function cats() { return g('CATS') || {}; }
  function pc() { return g('PC') || { info: {}, crew: [], cast: {}, days: {} }; }
  function toast(m) { try { g('toast')(m); } catch (e) { try { alert(m); } catch (_) {} } }
  function slug(s) { return String(s || 'project').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'project'; }
  function save(name, body, mime) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: mime }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(a.href); }, 800);
  }
  function needM() { var M = model(); if (!M || !M.scenes || !M.scenes.length) { toast('Import a script first. There is nothing to export yet.'); return null; } return M; }

  /* ---------- CSV ---------- */
  function cell(v) {
    var s = v == null ? '' : String(v);
    if (/^[=+@]/.test(s) || /^-[^0-9.\s]/.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function csv(rows) { return '\ufeff' + rows.map(function (r) { return r.map(cell).join(','); }).join('\r\n') + '\r\n'; }
  function pages(e) { e = +e || 0; var w = Math.floor(e / 8), r = e % 8; return (w ? w + ' ' : '') + (r ? r + '/8' : (w ? '' : '0')); }
  function dayOf(M, s) { for (var i = 0; i < M.days.length; i++) if (M.days[i].nums.indexOf(s.num) >= 0) return M.days[i]; return null; }
  function dateOf(n) { try { return g('pcDate')(n) || ''; } catch (e) { return ''; } }
  function join(a) { return (a || []).join('; '); }

  var SETS = {
    scenes: { label: 'Scene breakdown', sub: 'Every scene with cast, pages and tagged items', f: function (M) {
      var C = cats(), ck = Object.keys(C), r = [['Scene', 'INT/EXT', 'Location', 'Time', 'Heading', 'Page', 'Eighths', 'Length', 'Shoot day', 'Date', 'Cast'].concat(ck.map(function (k) { return C[k][0]; }), ['Notes', 'Omitted'])];
      M.scenes.forEach(function (s) { var d = dayOf(M, s); r.push([s.num, s.ie, s.loc, s.tod, s.heading, s.pg, s.eighths, pages(s.eighths), d ? d.n : '', d ? dateOf(d.n) : '', join(s.cast)].concat(ck.map(function (k) { return join(s.tags[k]); }), [s.notes || '', s.omit ? 'Yes' : ''])); });
      return r; } },
    schedule: { label: 'Shooting schedule (stripboard)', sub: 'One row per scene, in shoot-day order', f: function (M) {
      var r = [['Day', 'Date', 'Day location', 'Scene', 'INT/EXT', 'Location', 'Time', 'Cast', 'Eighths', 'Length']];
      M.days.forEach(function (d) { d.nums.forEach(function (n) { var s = M.scenes.filter(function (x) { return x.num === n; })[0]; if (s) r.push([d.n, dateOf(d.n), d.loc, s.num, s.ie, s.loc, s.tod, join(s.cast), s.eighths, pages(s.eighths)]); }); });
      return r; } },
    days: { label: 'Shoot days summary', sub: 'Date, location, scenes, cast and needs per day', f: function (M) {
      var C = cats(), ck = Object.keys(C), P = pc(), r = [['Day', 'Date', 'Location', 'Address', 'Scenes', 'Eighths', 'Length', 'Cast'].concat(ck.map(function (k) { return C[k][0]; }))];
      M.days.forEach(function (d) { var dd = (P.days && P.days[d.n]) || {}; r.push([d.n, dateOf(d.n), d.loc, dd.address || '', d.nums.join(', '), d.eighths, pages(d.eighths), join(d.cast)].concat(ck.map(function (k) { return join((d.needs || {})[k]); }))); });
      return r; } },
    cast: { label: 'Cast list', sub: 'Roles, actors, contact and the days each works', f: function (M) {
      var P = pc(), r = [['Role', 'Actor', 'Phone', 'Email', 'Status', 'Scenes', 'Scene count', 'Shoot days']];
      M.cast.forEach(function (c) { var k = (P.cast && P.cast[c]) || {}, sc = M.scenes.filter(function (s) { return s.cast.indexOf(c) >= 0; }), dy = M.days.filter(function (d) { return d.cast.indexOf(c) >= 0; }).map(function (d) { return d.n; });
        r.push([c, k.actor || '', k.phone || '', k.email || '', k.status || '', sc.map(function (s) { return s.num; }).join(', '), sc.length, dy.join(', ')]); });
      return r; } },
    crew: { label: 'Crew list', sub: 'Department, role, name, phone, email, call', f: function () {
      var r = [['Department', 'Role', 'Name', 'Phone', 'Email', 'Call', 'Head of department']];
      (pc().crew || []).forEach(function (c) { r.push([c.dept, c.role, c.name, c.phone, c.email, c.call, c.head ? 'Yes' : '']); });
      return r; } },
    shots: { label: 'Shot list', sub: 'Scene, shot, type, move, lens, description', f: function (M) {
      var r = [['Scene', 'Shot', 'Type', 'Move', 'Lens', 'Description', 'Status']];
      (M.shots || []).forEach(function (s) { r.push([s.scene, s.shotnum || s.num || '', s.type, s.move, s.lens, s.desc || s.description || '', s.status]); });
      return r; } },
    needs: { label: 'Tagged items (props, wardrobe, vehicles...)', sub: 'Each item with the scenes and days that need it', f: function (M) {
      var C = cats(), r = [['Category', 'Item', 'Scenes', 'Shoot days', 'First date']];
      Object.keys(C).forEach(function (k) { var by = {}; M.scenes.forEach(function (s) { if (s.omit) return; (s.tags[k] || []).forEach(function (w) { (by[w] = by[w] || []).push(s); }); });
        Object.keys(by).sort().forEach(function (w) { var ds = []; by[w].forEach(function (s) { var d = dayOf(M, s); if (d && ds.indexOf(d.n) < 0) ds.push(d.n); }); ds.sort(function (a, b) { return a - b; });
          r.push([C[k][0], w, by[w].map(function (s) { return s.num; }).join(', '), ds.join(', '), ds.length ? dateOf(ds[0]) : '']); }); });
      return r; } },
    budget: { label: 'Budget', sub: 'Category and amount, with a total', f: function (M) {
      var b = (M.pre && M.pre.budget) || [], t = 0, r = [['Category', 'Amount']];
      b.forEach(function (x) { r.push([x.cat, +x.amt || 0]); t += +x.amt || 0; }); r.push(['Total', t]); return r; } }
  };
  function exportCSV(key) { var M = needM(); if (!M) return; var rows = SETS[key].f(M); save(slug(M.title) + '_' + key + '.csv', csv(rows), 'text/csv;charset=utf-8'); toast('Saved ' + SETS[key].label + ' (' + (rows.length - 1) + ' rows).'); }

  /* ---------- iCalendar ---------- */
  function icsEsc(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(line) { var out = [], b = line; while (b.length > 73) { out.push(b.slice(0, 73)); b = ' ' + b.slice(73); } out.push(b); return out.join('\r\n'); }
  function ymd(iso) { return iso.replace(/-/g, ''); }
  function addDay(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function hm(t) { var m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? { h: +m[1], m: +m[2] } : null; }
  function exportICS() {
    var M = needM(); if (!M) return; var P = pc(), now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''), ev = [], skipped = 0;
    M.days.forEach(function (d) {
      var iso = dateOf(d.n); if (!iso) { skipped++; return; }
      var dd = (P.days && P.days[d.n]) || {}, call = hm(dd.crewCall || dd.general || (P.info && P.info.generalCall)), wrap = hm(dd.wrap);
      var desc = ['Scenes: ' + d.nums.join(', '), 'Cast: ' + join(d.cast)];
      var C = cats(); Object.keys(C).forEach(function (k) { if (d.needs && d.needs[k] && d.needs[k].length) desc.push(C[k][0] + ': ' + d.needs[k].join(', ')); });
      var L = ['BEGIN:VEVENT', 'UID:prohub-' + slug(M.title) + '-day' + d.n + '@prohub', 'DTSTAMP:' + now, 'SUMMARY:' + icsEsc('Shoot day ' + d.n + ' - ' + (d.loc || M.title))];
      if (call) {
        var st = ymd(iso) + 'T' + String(call.h).padStart(2, '0') + String(call.m).padStart(2, '0') + '00', eh = wrap ? wrap : { h: (call.h + 10) % 24, m: call.m }, endIso = (wrap && (wrap.h < call.h)) ? addDay(iso, 1) : iso;
        L.push('DTSTART:' + st, 'DTEND:' + ymd(endIso) + 'T' + String(eh.h).padStart(2, '0') + String(eh.m).padStart(2, '0') + '00');
      } else L.push('DTSTART;VALUE=DATE:' + ymd(iso), 'DTEND;VALUE=DATE:' + ymd(addDay(iso, 1)));
      if (dd.address) L.push('LOCATION:' + icsEsc(dd.address));
      L.push('DESCRIPTION:' + icsEsc(desc.join('\n')), 'END:VEVENT'); ev.push(L.map(fold).join('\r\n'));
    });
    if (!ev.length) { toast('No shoot dates yet. Set a start date in the call sheet, then export again.'); return; }
    var body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//proHUB//Shooting schedule//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + icsEsc(M.title + ' shooting schedule')].concat(ev, ['END:VCALENDAR']).join('\r\n') + '\r\n';
    save(slug(M.title) + '_schedule.ics', body, 'text/calendar;charset=utf-8');
    toast('Saved ' + ev.length + ' shoot days to a calendar file' + (skipped ? ' (' + skipped + ' days without a date were skipped).' : '.'));
  }

  /* ---------- breakdown per scene (shared by Fountain and FDX) ---------- */
  function crumb(s) {
    var o = {}, C = cats(), any = false;
    Object.keys(C).forEach(function (k) { if (s.tags && s.tags[k] && s.tags[k].length) { o[k] = s.tags[k].slice(); any = true; } });
    if (s.notes) { o.note = String(s.notes); any = true; }
    if (s.omit) { o.omit = 1; any = true; }
    return any ? o : null;
  }
  function sceneList(M) { return M.lines.filter(function (l) { return l.type === 'scene-heading'; }); }

  /* ---------- Fountain export ---------- */
  function fountain(M) {
    var o = ['Title: ' + M.title, 'Credit: Written by', 'Source: proHUB', ''], si = -1, prev = null;
    M.lines.forEach(function (l) {
      var t = String(l.text || '').trim(); if (!t) return;
      var tight = (l.type === 'parenthetical' || l.type === 'dialogue') && prev && /^(character|parenthetical|dialogue)$/.test(prev);
      if (l.type === 'scene-heading') {
        si++; var s = M.scenes[si], h = (s && s.heading) || t.toUpperCase();
        o.push(''); o.push(/^(INT|EXT|EST|INT\.?\/EXT|I\/E)[. ]/.test(h) ? h + (s ? ' #' + s.num + '#' : '') : '.' + h + (s ? ' #' + s.num + '#' : ''));
        var c = s && crumb(s); if (c) o.push('[[proHUB ' + JSON.stringify(c).replace(/\]\]/g, '] ]') + ']]');
      } else {
        if (!tight) o.push('');
        if (l.type === 'character') o.push(t.toUpperCase() === t ? t : '@' + t);
        else if (l.type === 'transition') o.push(/TO:$/i.test(t) ? t.toUpperCase() : '> ' + t.toUpperCase());
        else if (l.type === 'parenthetical') o.push(/^\(.*\)$/.test(t) ? t : '(' + t.replace(/^\(|\)$/g, '') + ')');
        else o.push(/^[@!.~=#>(]/.test(t) ? '!' + t : t);
      }
      prev = l.type;
    });
    return o.join('\n') + '\n';
  }
  function exportFountain() { var M = needM(); if (!M) return; save(slug(M.title) + '.fountain', fountain(M), 'text/plain;charset=utf-8'); toast('Saved Fountain with scene numbers and breakdown tags.'); }

  /* ---------- FDX export ---------- */
  function x(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fdx(M) {
    var names = { 'scene-heading': 'Scene Heading', action: 'Action', character: 'Character', parenthetical: 'Parenthetical', dialogue: 'Dialogue', transition: 'Transition' };
    var o = ['<?xml version="1.0" encoding="UTF-8" standalone="no" ?>', '<FinalDraft DocumentType="Script" Template="No" Version="5">', '  <Content>'], si = -1;
    M.lines.forEach(function (l) {
      var t = String(l.text || '').trim(); if (!t) return; var ty = names[l.type] || 'Action', at = ' Type="' + ty + '"';
      if (l.type === 'scene-heading') { si++; var s = M.scenes[si]; at += ' Number="' + x(s ? s.num : si + 1) + '"'; t = ((s && s.heading) || t).toUpperCase(); }
      else if (l.type === 'character' || l.type === 'transition') t = t.toUpperCase();
      o.push('    <Paragraph' + at + '>');
      if (l.type === 'scene-heading') o.push('      <SceneProperties Length="" Page="" Title="" />');
      o.push('      <Text>' + x(t) + '</Text>', '    </Paragraph>');
    });
    o.push('  </Content>', '  <ProHubBreakdown Version="1">');
    M.scenes.forEach(function (s) {
      var c = crumb(s); if (!c) return;
      o.push('    <Scene Number="' + x(s.num) + '"' + (s.omit ? ' Omitted="Yes"' : '') + '>');
      Object.keys(cats()).forEach(function (k) { (s.tags[k] || []).forEach(function (w) { o.push('      <Tag Category="' + k + '">' + x(w) + '</Tag>'); }); });
      if (s.notes) o.push('      <Note>' + x(s.notes) + '</Note>');
      o.push('    </Scene>');
    });
    o.push('  </ProHubBreakdown>', '  <TitlePage>', '    <Content>');
    [['', ''], ['', ''], ['', ''], [M.title.toUpperCase(), 'Center'], ['', ''], ['Written by', 'Center']].forEach(function (p) { o.push('      <Paragraph' + (p[1] ? ' Alignment="' + p[1] + '"' : '') + '><Text>' + x(p[0]) + '</Text></Paragraph>'); });
    o.push('    </Content>', '  </TitlePage>', '</FinalDraft>');
    return o.join('\n') + '\n';
  }
  function exportFDX() { var M = needM(); if (!M) return; save(slug(M.title) + '.fdx', fdx(M), 'application/xml'); toast('Saved FDX file with scene numbers and breakdown tags.'); }

  /* ---------- import: FDX -> text with markers ---------- */
  function readFDX(file) {
    return file.text().then(function (t) {
      var doc = new DOMParser().parseFromString(t, 'text/xml'), bd = {}, out = [];
      Array.prototype.forEach.call(doc.getElementsByTagName('Scene'), function (sc) {
        var n = sc.getAttribute('Number'); if (n == null) return; var o = {};
        Array.prototype.forEach.call(sc.getElementsByTagName('Tag'), function (tg) { var k = tg.getAttribute('Category'); (o[k] = o[k] || []).push(tg.textContent); });
        var nt = sc.getElementsByTagName('Note')[0]; if (nt) o.note = nt.textContent;
        if (/^y/i.test(sc.getAttribute('Omitted') || '')) o.omit = 1; bd[n] = o;
      });
      var content = doc.getElementsByTagName('Content')[0], paras = content ? content.getElementsByTagName('Paragraph') : doc.getElementsByTagName('Paragraph');
      Array.prototype.forEach.call(paras, function (p) {
        if (content && p.parentNode !== content) return;
        var ty = (p.getAttribute('Type') || '').toLowerCase(), s = Array.prototype.map.call(p.getElementsByTagName('Text'), function (n) { return n.textContent; }).join('').trim(); if (!s) return;
        if (ty.indexOf('scene') >= 0) {
          var num = (p.getAttribute('Number') || '').trim();
          out.push('', s.toUpperCase() + (num ? ' #' + num + '#' : ''));
          if (num && bd[num]) out.push('[[proHUB ' + JSON.stringify(bd[num]).replace(/\]\]/g, '] ]') + ']]');
          out.push('');
        } else if (ty.indexOf('character') >= 0) out.push(s.toUpperCase());
        else if (ty.indexOf('parenthetical') >= 0) out.push('(' + s.replace(/^\(|\)$/g, '') + ')');
        else { out.push(s); if (/dialogue|action|transition/.test(ty)) out.push(''); }
      });
      return out.join('\n');
    });
  }

  /* ---------- import: Fountain / marked text -> clean text + pending breakdown ---------- */
  var pending = null;
  function prepare(raw) {
    var lines = String(raw).replace(/\r/g, '').split('\n'), out = [], scenes = [], cur = null, any = false;
    function head(l) { return /^\.?(\d+[A-Z]?\s+)?(INT\.|EXT\.|EST\.|INT\/EXT\.|I\/E\.)/i.test(l.trim()); }
    lines.forEach(function (l) {
      var m = TAGRE.exec(l);
      if (m) { var o = null; try { o = JSON.parse(m[1]); } catch (e) {} if (o && cur) { cur.data = o; any = true; } l = l.replace(TAGRE, '').replace(/\s+$/, ''); if (!l.trim()) return; }
      if (head(l)) {
        var t = l.trim().replace(/^\.(?=[A-Za-z0-9])/, ''), n = /\s#([\w.\-]+)#\s*$/.exec(t);
        if (n) { t = t.slice(0, n.index).trim(); any = true; }
        cur = { num: n ? n[1] : null, data: null, notes: [] }; scenes.push(cur); out.push(t); return;
      }
      var gn = l.replace(/\[\[([\s\S]*?)\]\]/g, function (_, x) { if (cur && x.trim()) { cur.notes.push(x.trim()); any = true; } return ''; });
      gn = gn.replace(/^\s*(=|#{1,6}\s)[^\n]*$/, '').replace(/^~/, '').replace(/^@(\S.*)$/, function (_, n) { return n.toUpperCase(); }).replace(/^!(?=\S)/, '').replace(/^>\s*(.*?)\s*<\s*$/, '$1').replace(/^>\s*/, '');
      if (gn === '' && l.trim() !== '') return;
      out.push(gn);
    });
    pending = any ? scenes : null;
    return out.join('\n');
  }
  function applyPending() {
    var sc = pending; pending = null; if (!sc) return;
    try {
      var master = JSON.parse(localStorage.getItem('prehub_master_v1') || 'null'); if (!master || !master.lines) return;
      var used = {}, i = -1;
      sc.forEach(function (s, k) { if (s.num && !used[s.num]) used[s.num] = 1; else s.num = null; });
      var st = { ann: [], notes: {}, omit: {}, hl: [], auto: true };
      master.lines.forEach(function (l) {
        if (l.type !== 'scene-heading' && l.type !== 'scene_heading') return; i++; var s = sc[i]; if (!s) return;
        if (s.num) l.sn = s.num; var num = s.num || String(i + 1), d = s.data || {};
        Object.keys(d).forEach(function (k) { if (k === 'note' || k === 'omit') return; (d[k] || []).forEach(function (w) { st.ann.push({ scene: num, cat: k, text: String(w).slice(0, 60) }); }); });
        var nt = [d.note].concat(s.notes).filter(Boolean).join(' | '); if (nt) st.notes[num] = nt; if (d.omit) st.omit[num] = true;
      });
      localStorage.setItem('prehub_master_v1', JSON.stringify(master));
      localStorage.setItem('prohub_scriptation_v1', JSON.stringify(st));
      localStorage.removeItem('prohub_meta_v1');
    } catch (e) {}
  }
  function wrapRun() {
    var orig = g('fhRun'); if (!orig || orig.__phx) return;
    var w = function (raw, name) {
      var clean = prepare(raw), ok = orig.call(this, clean, name);
      if (ok && pending) { applyPending(); try { g('reload')(); g('renderHub')(); } catch (e) {} } else pending = null;
      return ok;
    };
    w.__phx = 1; window.fhRun = w;
  }


  /* ---------- EDL (CMX3600) ---------- */
  function tcOf(fr, fps) { var tb = Math.round(fps), h = Math.floor(fr / (tb * 3600)), m = Math.floor(fr / (tb * 60)) % 60, s2 = Math.floor(fr / tb) % 60, f = fr % tb; return [h, m, s2, f].map(function (x) { return String(x).padStart(2, '0'); }).join(':'); }
  function shotSecs(s) { var d = +(s.dur || s.duration || s.secs || s.seconds); if (d > 0) return d; var t = String(s.type || '').toUpperCase(); if (/^(ECU|XCU|CU|MCU|INS|INSERT)/.test(t)) return 4; if (/^(WS|EWS|EST|LS|OTS)/.test(t)) return 7; return 5; }
  function exportEDL() {
    var M = needM(); if (!M) return; var fps = +(pc().info && pc().info.fps) || 24, tb = Math.round(fps), ev = [], t = 3600 * tb, n = 0, order = {};
    M.scenes.forEach(function (sc, i) { order[sc.num] = i; });
    var shots = (M.shots || []).filter(function (x) { return x && x.scene != null && order[x.scene] != null; }).sort(function (a, b) { return order[a.scene] - order[b.scene] || String(a.shotnum || a.num || '').localeCompare(String(b.shotnum || b.num || '')); });
    var items = shots.length ? shots.map(function (x) { return { name: (x.scene + '_' + (x.shotnum || x.num || '')).replace(/[^\w\-]+/g, '_'), scene: x.scene, secs: shotSecs(x), note: [x.type, x.move, x.lens, x.desc || x.description].filter(Boolean).join(' | ') }; })
      : M.scenes.filter(function (x) { return !x.omit; }).map(function (x) { return { name: 'SC_' + String(x.num).replace(/[^\w\-]+/g, '_'), scene: x.num, secs: Math.max(5, Math.round((x.eighths || 1) / 8 * 60)), note: x.heading }; });
    var out = ['TITLE: ' + String(M.title || 'PROJECT').toUpperCase(), 'FCM: NON-DROP FRAME', ''], seen = {};
    items.forEach(function (it) {
      n++; var len = Math.max(1, Math.round(it.secs * fps)), a = tcOf(t, fps), b = tcOf(t + len, fps);
      out.push(String(n).padStart(3, '0') + '  BL       V     C        ' + tcOf(0, fps) + ' ' + tcOf(len, fps) + ' ' + a + ' ' + b);
      out.push('* FROM CLIP NAME: ' + it.name);
      if (it.note) out.push('* COMMENT: ' + it.note.replace(/[\r\n]+/g, ' ').slice(0, 200));
      if (!seen[it.scene]) { seen[it.scene] = 1; var sc = M.scenes[order[it.scene]]; out.push('* LOC: ' + a + ' ' + 'GREEN' + ' SCENE ' + it.scene + ' ' + String((sc && sc.heading) || '').slice(0, 60)); }
      out.push(''); t += len;
    });
    save(slug(M.title) + '_script_order.edl', out.join('\r\n'), 'text/plain');
    toast('Saved an EDL with ' + n + ' placeholder clips at ' + fps + ' fps, starting at 01:00:00:00. Cut by scene and shot name in Premiere, Resolve or Avid.');
  }

  /* ---------- Movie Magic CSV import ---------- */
  function parseCSV(txt) {
    txt = String(txt).replace(/^﻿/, ''); var rows = [], row = [], f = '', q = false, i, c;
    var delim = (txt.split('\n')[0].match(/\t/g) || []).length > (txt.split('\n')[0].match(/,/g) || []).length ? '\t' : ',';
    for (i = 0; i < txt.length; i++) {
      c = txt[i];
      if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === delim) { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim(); }); });
  }
  function eighthsOf(v) {
    v = String(v || '').trim(); if (!v) return 0; var m;
    if ((m = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(v))) return +m[1] * 8 + Math.round(8 * (+m[2]) / (+m[3]));
    if ((m = /^(\d+)\s*\/\s*(\d+)$/.exec(v))) return Math.round(8 * (+m[1]) / (+m[2]));
    if ((m = /^(\d+)\s*-\s*(\d+)\s*\/\s*8$/.exec(v))) return +m[1] * 8 + +m[2];
    if (/^\d+(\.\d+)?$/.test(v)) return Math.round(parseFloat(v) * 8);
    return 0;
  }
  var HEAD = [['scene', /^(scene|sc|scn|scene\s*(no|num|number|#)|sc\.?\s*#|strip)\b/i], ['ie', /^(int\s*\/?\s*ext|i\/e|ie|int)/i], ['set', /^(set|set name|location|loc)\b/i], ['dn', /^(d\/n|day\/night|time of day|tod|d\s*\/\s*n)/i], ['desc', /(synopsis|description|desc|summary|action)/i], ['pages', /^(pages?|pg|page count|length|pgs)\b/i], ['cast', /(cast|characters|cast members|cast ids)/i], ['day', /^(shoot(ing)?\s*day|sch(edule)?\s*day|day\s*#?|day no)/i], ['notes', /^(notes?|comments?)/i]];
  function importMM(file) {
    var M = needM(); if (!M) return;
    var rd = new FileReader(); rd.onerror = function () { toast('Could not read that file.'); };
    rd.onload = function () {
      try {
        var rows = parseCSV(rd.result); if (rows.length < 2) { toast('That file has no rows.'); return; }
        var hi = 0; for (var r = 0; r < Math.min(rows.length, 12); r++) { if (rows[r].some(function (c) { return /^(scene|sc\b|scn|strip)/i.test(String(c).trim()); })) { hi = r; break; } }
        var head = rows[hi].map(function (h) { return String(h).trim(); }), col = {}, cat = {}, C = cats();
        head.forEach(function (h, i) {
          if (!h) return; for (var k = 0; k < HEAD.length; k++) if (col[HEAD[k][0]] == null && HEAD[k][1].test(h)) { col[HEAD[k][0]] = i; return; }
          Object.keys(C).forEach(function (ck) { if (cat[ck] == null && (h.toLowerCase() === String(C[ck][0]).toLowerCase() || h.toLowerCase() === ck || (ck === 'mu' && /make-?up|hair/i.test(h)) || (ck === 'prop' && /^props?\b/i.test(h)))) cat[ck] = i; });
        });
        if (col.scene == null) { toast('Could not find a Scene column in the first rows of that file.'); return; }
        var byNum = {}; M.scenes.forEach(function (s) { byNum[String(s.num).toLowerCase().replace(/^0+(?=\d)/, '')] = s; });
        var st = JSON.parse(localStorage.getItem('prohub_scriptation_v1') || 'null') || { ann: [], notes: {}, omit: {}, hl: [] };
        st.ann = st.ann || []; st.notes = st.notes || {};
        var matched = 0, miss = [], order = [], days = {}, castDiff = {}, tagN = 0, noteN = 0;
        rows.slice(hi + 1).forEach(function (row) {
          var raw = String(row[col.scene] || '').trim(); if (!raw) return; var key = raw.toLowerCase().replace(/^0+(?=\d)/, '').replace(/^sc(ene)?\.?\s*/, '');
          var sc = byNum[key]; if (!sc) { miss.push(raw); return; } matched++; order.push(sc.num);
          var nt = [col.desc != null ? row[col.desc] : '', col.notes != null ? row[col.notes] : ''].map(function (x) { return String(x || '').trim(); }).filter(Boolean).join(' | ');
          if (nt) { var cur = st.notes[sc.num] || ''; if (cur.indexOf(nt) < 0) { st.notes[sc.num] = (cur ? cur + ' | ' : '') + nt; noteN++; } }
          Object.keys(cat).forEach(function (ck) { String(row[cat[ck]] || '').split(/[;,\n]/).forEach(function (w) { w = w.trim().toLowerCase(); if (!w) return; if (!st.ann.some(function (a) { return String(a.scene) === String(sc.num) && a.cat === ck && a.text === w; })) { st.ann.push({ scene: sc.num, cat: ck, text: w.slice(0, 60) }); tagN++; } }); });
          if (col.cast != null) { var names = String(row[col.cast] || '').split(/[;,\/]/).map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean), have = (sc.cast || []).map(function (x) { return String(x).toLowerCase(); }); names.forEach(function (nm) { if (have.indexOf(nm) < 0 && !have.some(function (h) { return h.indexOf(nm) >= 0 || nm.indexOf(h) >= 0; })) castDiff[nm] = 1; }); }
          if (col.day != null) { var dn = parseInt(String(row[col.day] || '').replace(/\D+/g, ''), 10); if (dn > 0) { (days[dn] = days[dn] || []).push(sc.num); } }
        });
        localStorage.setItem('prohub_scriptation_v1', JSON.stringify(st));
        var dayKeys = Object.keys(days).map(Number).sort(function (a, b) { return a - b; }), sched = '';
        if (dayKeys.length && dayKeys.reduce(function (a, k) { return a + days[k].length; }, 0) >= matched * 0.5) {
          var SC = JSON.parse(localStorage.getItem('prohub_schedule_v1') || 'null') || {}, items = [], placed = {};
          dayKeys.forEach(function (k) { items.push({ t: 'day' }); days[k].forEach(function (n) { if (!placed[n]) { placed[n] = 1; items.push({ t: 'sc', n: n }); } }); });
          SC.items = items; SC.start = SC.start || iso0(); SC.call = SC.call || '07:00'; SC.lunch = SC.lunch || 30; SC.per8 = SC.per8 || 15; SC.move = SC.move == null ? 20 : SC.move;
          localStorage.setItem('prohub_schedule_v1', JSON.stringify(SC)); localStorage.removeItem('prohub_meta_v1'); sched = ' Built a ' + dayKeys.length + '-day stripboard from the Shoot Day column.';
        }
        try { g('reload')(); g('renderHub')(); } catch (e) { }
        var cd = Object.keys(castDiff);
        toast('Movie Magic CSV: matched ' + matched + ' of ' + M.scenes.length + ' scenes, ' + noteN + ' notes and ' + tagN + ' breakdown tags added.' + sched + (miss.length ? ' Not found in the script: ' + miss.slice(0, 8).join(', ') + (miss.length > 8 ? '...' : '') + '.' : '') + (cd.length ? ' Cast in the CSV but not in those scenes: ' + cd.slice(0, 6).join(', ') + (cd.length > 6 ? '...' : '') + '.' : ''));
      } catch (e) { toast('Could not read that Movie Magic file: ' + e.message); }
    };
    rd.readAsText(file);
  }
  function iso0() { var d = new Date(); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function pickMM() { var i = document.createElement('input'); i.type = 'file'; i.accept = '.csv,.txt,.tsv,text/csv'; i.onchange = function () { if (i.files[0]) importMM(i.files[0]); }; i.click(); }

  /* ---------- revisions + locked pages ---------- */
  function revHtml() {
    var R = window.PHRev; if (!R) return '';
    var s = R.status(), line = s.current ? 'Current: <b>' + s.current + '</b> revision, ' + s.date + '.' : 'No revision issued yet. The first issue becomes the WHITE baseline.';
    line += ' Next: <b>' + s.next + '</b>. ' + (s.lock ? 'Pages are <b>locked</b> (' + s.lockPages + ' pages): new pages become 12A, 12B.' : s.lockPages ? 'Page lock is off.' : 'Pages are not locked.');
    var hist = s.revs.slice().reverse().slice(0, 6).map(function (r) { return r.color + ' ' + r.date + (r.n ? ' (' + r.changed + ' lines)' : ''); }).join(' · ');
    return '<div id="phxRev" style="grid-column:1/-1;font-size:12px;color:#B8C3D6;line-height:1.5">' + line + (hist ? '<br><span style="color:#8A99B2">' + hist + '</span>' : '') + '</div>';
  }
  function armed(b, label, fn) {
    if (b._arm) { clearTimeout(b._arm); b._arm = 0; b.querySelector('b').textContent = b._orig; fn(); return; }
    b._orig = b.querySelector('b').textContent; b.querySelector('b').textContent = label; b._arm = setTimeout(function () { b._arm = 0; b.querySelector('b').textContent = b._orig; }, 4000);
  }
  async function lockNow() {
    var R = window.PHRev; if (!R) return; var M = needM(); if (!M) return;
    try {
      toast('Measuring the script pages...'); var L = await g('pcLib')(); R.unlock();
      await g('pcBuildOne')(L, ['script'], { fs: 8, days: [], pkgName: '' });
      var logs = window.PH_LASTPAGES || []; if (!logs.length) { toast('Could not measure the pages.'); return; }
      var n = R.setLock(logs); toast('Pages locked: ' + n + ' pages. New material will be numbered 12A, 12B and so on.');
    } catch (e) { toast('Could not lock the pages: ' + e.message); }
  }
  function refresh() { try { g('reload')(); g('renderHub')(); } catch (e) { } open(); }

  /* ---------- cloud save (logged-in Wix members) ---------- */
  function esc(x) { return String(x == null ? '' : x).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cloudHtml() { return window.PHCloud ? '<h3>Cloud save and sharing</h3><div id="phxCloud" style="grid-column:1/-1;display:contents"><div style="grid-column:1/-1;font-size:12px;color:#8A99B2">Checking your login...</div></div>' : ''; }
  async function cloudFill() {
    var C = window.PHCloud, box = document.getElementById('phxCloud'); if (!C || !box) return;
    var st = await C.hello(), c = C.cfg(), h = '';
    if (!document.getElementById('phxCloud')) return;
    if (!st.embedded) { box.innerHTML = '<div style="grid-column:1/-1;font-size:12px;color:#B8C3D6;line-height:1.5">' + (window.parent === window ? 'Cloud save works when filmHUB is open inside <b>rooksproductions.com</b>. Open it from the site, not from this address.' : 'The Wix page did not answer. Check that the page code from <b>page-code.js</b> is on the page that holds this embed, that <b>FRAME</b> matches the embed\'s ID, and that the site is published.') + '</div>'; return; }
    if (!st.loggedIn) { box.innerHTML = '<div style="grid-column:1/-1;font-size:12px;color:#B8C3D6">Log in to your Rooks account to save projects to the cloud.</div><button data-k="cloudLogin"><b>Log in</b><small>Opens the site login.</small></button>'; return; }
    var who = {}, list = []; try { who = await C.whoami(); list = await C.projects(); } catch (e) { box.innerHTML = '<div style="grid-column:1/-1;font-size:12px;color:#F87171">' + esc(e.message) + '</div>'; return; }
    if (!document.getElementById('phxCloud')) return;
    h += '<div style="grid-column:1/-1;font-size:12px;color:#B8C3D6;line-height:1.5">Signed in as <b>' + esc(who.name) + '</b>' + (c.pid ? ' · project <b>' + esc(c.name || c.pid) + '</b>' + (c.auto ? ' · auto-save on' : '') : ' · no project chosen') + '</div>';
    h += '<button data-k="cloudTest"><b>Test the connection</b><small>Creates a throwaway project, saves and loads a test item, then deletes it. Tells you which Wix piece is missing.</small></button><div id="phxCTest" style="grid-column:1/-1;font-size:12px;line-height:1.6;color:#B8C3D6"></div>';
    h += '<div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap"><select id="phxCSel" style="flex:1;min-width:200px;background:#0E1526;border:1px solid #1A2233;border-radius:8px;color:#E9EDF5;padding:8px 10px;font:inherit"><option value="">Choose a project...</option>' + list.map(function (p) { return '<option value="' + esc(p.pid) + '"' + (p.pid === c.pid ? ' selected' : '') + ' data-n="' + esc(p.name) + '">' + esc(p.name) + (p.mine ? '' : ' (shared with you)') + '</option>'; }).join('') + '</select><button data-k="cloudPick" style="padding:8px 12px"><b>Use</b></button></div>';
    h += '<div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap"><input id="phxCName" placeholder="new project name" value="' + esc((window.M && M.title) || '') + '" style="flex:1;min-width:200px;background:#0E1526;border:1px solid #1A2233;border-radius:8px;color:#E9EDF5;padding:8px 10px;font:inherit"><button data-k="cloudNew" style="padding:8px 12px"><b>Create from this device</b></button></div>';
    if (c.pid) {
      var cur = list.filter(function (p) { return p.pid === c.pid; })[0];
      h += '<button data-k="cloudSave"><b>Save to cloud now</b><small>Sends everything that changed since the last save.</small></button><button data-k="cloudLoad"><b>Load from cloud</b><small>Replaces the data on this device with the cloud copy.</small></button><button data-k="cloudAuto"><b>' + (c.auto ? 'Turn auto-save off' : 'Turn auto-save on') + '</b><small>Checks for changes every 20 seconds while this page is open.</small></button>';
      if (cur && cur.mine) h += '<div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap"><input id="phxCShare" placeholder="emails of members who can edit, comma separated" value="' + esc((cur.editors || []).join(', ')) + '" style="flex:1;min-width:200px;background:#0E1526;border:1px solid #1A2233;border-radius:8px;color:#E9EDF5;padding:8px 10px;font:inherit"><button data-k="cloudShare" style="padding:8px 12px"><b>Share</b></button></div><button data-k="cloudDelete"><b>Delete this cloud project</b><small>Removes it for everyone. Data on this device stays.</small></button>';
      h += '<button data-k="cloudLeave"><b>Disconnect this device</b><small>The cloud copy stays.</small></button>';
    }
    box.innerHTML = h;
  }
  function cloudRun(k, b) {
    var C = window.PHCloud; if (!C) return; function fail(e) { toast(String((e && e.message) || e)); }
    function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
    if (k === 'cloudTest') { cloudTest(); return; }
    if (k === 'cloudLogin') { C.login().then(function () { cloudFill(); }).catch(fail); return; }
    if (k === 'cloudPick') { var sel = document.getElementById('phxCSel'); if (!sel || !sel.value) return toast('Choose a project first.'); C.select(sel.value, sel.options[sel.selectedIndex].getAttribute('data-n')); toast('Project selected. Use Load from cloud to bring its data onto this device.'); cloudFill(); return; }
    if (k === 'cloudNew') { var nm = val('phxCName').trim() || 'Untitled project'; C.create(nm).then(function () { return C.push({ all: true }); }).then(function (r) { toast('Project created and ' + r.sent + ' item(s) saved.'); cloudFill(); }).catch(fail); return; }
    if (k === 'cloudSave') { C.push().then(function (r) { if (r.conflicts.length) { var c0 = C.cfg(); r.conflicts.forEach(function (x) { c0.last[x.k] = x.ts; }); try { localStorage.setItem('prohub_cloud_v1', JSON.stringify(c0)); } catch (e) { } toast((r.conflicts[0].by || 'Someone') + ' saved newer data for ' + r.conflicts.length + ' item(s). Load first, or click Save again to overwrite.'); } else toast(r.sent ? 'Saved ' + r.sent + ' item(s) to the cloud.' : 'Everything is already saved.'); }).catch(fail); return; }
    if (k === 'cloudLoad') { armed(b, 'Click again to replace local data', function () { C.pull().then(function (r) { toast('Loaded ' + r.keys + ' item(s) from the cloud.'); try { g('reload')(); g('renderHub')(); } catch (e) { } open(); }).catch(fail); }); return; }
    if (k === 'cloudAuto') { C.setAuto(!C.cfg().auto); cloudFill(); return; }
    if (k === 'cloudShare') { C.share(val('phxCShare')).then(function (r) { toast(r.editors.length ? 'Shared with ' + r.editors.join(', ') + '. They need a member account with that email.' : 'Sharing removed.'); cloudFill(); }).catch(fail); return; }
    if (k === 'cloudDelete') { armed(b, 'Click again to delete for everyone', function () { C.remove().then(function () { toast('Cloud project deleted.'); cloudFill(); }).catch(fail); }); return; }
    if (k === 'cloudLeave') { C.leave(); cloudFill(); }
  }
  async function cloudTest() {
    var C = window.PHCloud, out = document.getElementById('phxCTest'), log = [], cur = null;
    function row(ok, t) { log.push((ok ? '&#10003; ' : '<span style="color:#F87171">&#10007; ') + esc(t) + (ok ? '' : '</span>')); out.innerHTML = log.join('<br>'); }
    async function step(name, fn, hint) { try { var r = await fn(); row(true, name); return r; } catch (e) { row(false, name + ': ' + (e.message || e) + (hint ? '  Fix: ' + hint : '')); throw e; } }
    try {
      out.innerHTML = 'Testing...';
      await step('Wix page answers and you are logged in', async function () { var h = await C.hello(); if (!h.embedded) throw new Error('no answer'); if (!h.loggedIn) throw new Error('not logged in'); }, 'add page-code.js to the page and publish.');
      await step('Backend web module reachable (whoami)', function () { return C.whoami(); }, 'create backend/proHubCloud.web.js and publish.');
      cur = C.cfg(); await step('ProHubProjects collection writes', function () { return C.create('connection test'); }, 'create the ProHubProjects collection with fields pid, name, owner, editors, created and publish.');
      await step('ProHubSaves collection writes', function () { return C.push({ all: true }).then(function (r) { if (!r.sent && !r.conflicts.length) throw new Error('nothing was sent, load a script first'); return r; }); }, 'create the ProHubSaves collection with fields pid, k, i, n, ts, v, by.');
      await step('Data loads back', function () { return C.pull().then(function (r) { if (!r.keys) throw new Error('no data came back'); }); });
      await step('Test project deleted', function () { return C.remove(); });
      if (cur && cur.pid) C.select(cur.pid, cur.name);
      row(true, 'All good. Cloud save is ready.');
    } catch (e) { try { if (C.cfg().pid && /connection test/.test(C.cfg().name || '')) await C.remove(); } catch (x) { } if (cur && cur.pid) C.select(cur.pid, cur.name); }
  }
  function cloudBoot() {
    var C = window.PHCloud; if (!C || window.parent === window) return; var c = C.cfg();
    if (c.pid) setTimeout(function () { C.hello().then(function (st) { if (!st.loggedIn) return; return C.check().then(function (r) { if (r.newer.length) toast((r.by || 'Someone') + ' saved newer data to "' + (c.name || 'your project') + '". Open Export data to load it.'); }); }).catch(function () { }); }, 2500);
  }

  /* ---------- panel ---------- */
  var CSS = '#phx{position:fixed;inset:0;z-index:2147482000;background:rgba(3,5,10,.72);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,Segoe UI,sans-serif}' +
    '#phx .bx{width:min(680px,100%);max-height:min(88vh,760px);display:flex;flex-direction:column;background:#0B1020;color:#E9EDF5;border:1px solid #25344E;border-radius:14px;overflow:hidden}' +
    '#phx header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #1A2233}#phx h2{margin:0;font-size:16px}' +
    '#phx .bd{padding:14px 16px;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}' +
    '#phx h3{grid-column:1/-1;margin:6px 0 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8A99B2}' +
    '#phx button{font:inherit;text-align:left;color:#E9EDF5;background:#0E1526;border:1px solid #1A2233;border-radius:10px;padding:10px 12px;cursor:pointer}' +
    '#phx button:hover{border-color:#A9D95B}#phx button:focus-visible{outline:2px solid #5B68E8;outline-offset:2px}' +
    '#phx header button{padding:8px 12px;font:600 12px system-ui,sans-serif}#phx button b{display:block;font-size:13px}#phx button small{display:block;color:#8A99B2;font-size:12px;margin-top:2px;line-height:1.35}';
  function close() { var e = document.getElementById('phx'); if (e) e.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function open() {
    close(); if (!document.getElementById('phx-css')) { var s = document.createElement('style'); s.id = 'phx-css'; s.textContent = CSS; document.head.appendChild(s); }
    var el = document.createElement('div'); el.id = 'phx'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Export data');
    var h = '<div class="bx"><header><h2>Export data</h2><button data-k="x">Close</button></header><div class="bd">';
    h += '<h3>Script (keeps scene numbers and tags)</h3><button data-k="fountain"><b>Fountain (.fountain)</b><small>Plain text. Scene numbers and breakdown tags travel as notes.</small></button><button data-k="fdx"><b>FDX (.fdx)</b><small>Scene numbers and tags included. Import it back to restore them.</small></button>';
    h += '<h3>Spreadsheets (open in Excel, Numbers, Sheets)</h3>';
    Object.keys(SETS).forEach(function (k) { h += '<button data-k="csv:' + k + '"><b>' + SETS[k].label + '</b><small>' + SETS[k].sub + '</small></button>'; });
    if (window.PHRev) {
      var rs = PHRev.status();
      h += '<h3>Script revisions and locked pages</h3>' + revHtml();
      h += '<button data-k="revIssue"><b>Issue ' + rs.next + ' revision</b><small>Stars every changed line and tints those pages when you print the script.</small></button>';
      h += '<button data-k="revLock"><b>' + (rs.lock ? 'Re-lock page numbers' : 'Lock pages') + '</b><small>Freezes page numbers so added pages are numbered 12A, 12B.</small></button>';
      if (rs.lock) h += '<button data-k="revUnlock"><b>Unlock pages</b><small>Numbers pages 1, 2, 3 again.</small></button>';
      if (rs.revs.length) h += '<button data-k="revUndo"><b>Undo last revision</b><small>Removes the ' + rs.current + ' issue and its stars.</small></button>';
    }
    h += '<h3>Crew formats</h3><button data-k="mm"><b>Import Movie Magic CSV</b><small>Scene, description, cast, shoot day and element columns. Matches by scene number and builds the stripboard from Shoot Day.</small></button><button data-k="edl"><b>EDL (.edl)</b><small>One placeholder clip per shot (or scene) in script order with scene markers, for Premiere, Resolve or Avid.</small></button>';
    h += cloudHtml();
    h += '<h3>Calendar</h3><button data-k="ics"><b>Shooting schedule (.ics)</b><small>One event per shoot day for Apple, Google or Outlook calendars.</small></button></div></div>';
    el.innerHTML = h; document.body.appendChild(el); document.addEventListener('keydown', onKey); cloudFill();
    el.addEventListener('click', function (e) {
      if (e.target === el) return close(); var b = e.target.closest('button'); if (!b) return; var k = b.getAttribute('data-k');
      if (k === 'x') close(); else if (/^cloud/.test(k)) cloudRun(k, b); else if (k === 'mm') pickMM(); else if (k === 'edl') exportEDL();
      else if (k === 'revIssue') armed(b, 'Click again to issue ' + PHRev.status().next, function () { var r = PHRev.issue(); toast(r.ok ? 'Issued the ' + r.color + ' revision: ' + r.changed + ' changed lines starred.' : r.msg); refresh(); });
      else if (k === 'revLock') lockNow().then(refresh); else if (k === 'revUnlock') { PHRev.unlock(); toast('Pages unlocked.'); refresh(); }
      else if (k === 'revUndo') armed(b, 'Click again to undo', function () { var r = PHRev.undoIssue(); toast(r.ok ? 'Removed the ' + r.color + ' revision.' : r.msg); refresh(); });
      else if (k === 'fountain') exportFountain(); else if (k === 'fdx') exportFDX(); else if (k === 'ics') exportICS(); else if (/^csv:/.test(k)) exportCSV(k.slice(4));
    });
  }

  window.PHX = { importMM: importMM, parseCSV: parseCSV, eighthsOf: eighthsOf, edl: exportEDL, open: open, close: close, csv: exportCSV, ics: exportICS, fountain: exportFountain, fdx: exportFDX, readFDX: readFDX, prepare: prepare, toFountain: fountain, toFdx: fdx, sets: SETS };
  wrapRun(); cloudBoot();
  if (/#export\b/.test(location.hash)) setTimeout(open, 600);
})();
