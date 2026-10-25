/* proHUB data exchange: CSV and calendar exports, Fountain and Final Draft (FDX) export and import
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
  function exportFDX() { var M = needM(); if (!M) return; save(slug(M.title) + '.fdx', fdx(M), 'application/xml'); toast('Saved Final Draft file with scene numbers and breakdown tags.'); }

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
    h += '<h3>Script (keeps scene numbers and tags)</h3><button data-k="fountain"><b>Fountain (.fountain)</b><small>Plain text. Scene numbers and breakdown tags travel as notes.</small></button><button data-k="fdx"><b>Final Draft (.fdx)</b><small>Scene numbers and tags included. Import it back to restore them.</small></button>';
    h += '<h3>Spreadsheets (open in Excel, Numbers, Sheets)</h3>';
    Object.keys(SETS).forEach(function (k) { h += '<button data-k="csv:' + k + '"><b>' + SETS[k].label + '</b><small>' + SETS[k].sub + '</small></button>'; });
    h += '<h3>Calendar</h3><button data-k="ics"><b>Shooting schedule (.ics)</b><small>One event per shoot day for Apple, Google or Outlook calendars.</small></button></div></div>';
    el.innerHTML = h; document.body.appendChild(el); document.addEventListener('keydown', onKey);
    el.addEventListener('click', function (e) {
      if (e.target === el) return close(); var b = e.target.closest('button'); if (!b) return; var k = b.getAttribute('data-k');
      if (k === 'x') close(); else if (k === 'fountain') exportFountain(); else if (k === 'fdx') exportFDX(); else if (k === 'ics') exportICS(); else if (/^csv:/.test(k)) exportCSV(k.slice(4));
    });
  }

  window.PHX = { open: open, close: close, csv: exportCSV, ics: exportICS, fountain: exportFountain, fdx: exportFDX, readFDX: readFDX, prepare: prepare, toFountain: fountain, toFdx: fdx, sets: SETS };
  wrapRun();
  if (/#export\b/.test(location.hash)) setTimeout(open, 600);
})();
