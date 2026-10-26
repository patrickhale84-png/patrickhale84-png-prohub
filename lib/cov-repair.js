/* proHUB Script Coverage: import repair. A fixed list of named rules that clean up badly formatted or badly imported script text
   (PDF copy-paste, web pages, word-processor exports, double spacing, play-style cues, broken headings...).
   Every rule is deterministic, reports how many places it changed and shows an example. */
(function () {
  'use strict';
  var C = window.PHCov = window.PHCov || {};
  var RULES = [];
  function rule(id, group, name, desc, fn, off) { RULES.push({ id: id, group: group, name: name, desc: desc, fn: fn, off: !!off }); }
  function sample(a, b) { a = String(a).replace(/\s+/g, ' ').trim(); b = String(b).replace(/\s+/g, ' ').trim(); return a.slice(0, 70) + (a.length > 70 ? '\u2026' : '') + '  \u2192  ' + b.slice(0, 70) + (b.length > 70 ? '\u2026' : ''); }
  function lines(t) { return t.split('\n'); }
  var TOD = /^(DAY|NIGHT|MORNING|EVENING|AFTERNOON|DAWN|DUSK|LATER|CONTINUOUS|MOMENTS? LATER|SAME|SUNSET|SUNRISE|EARLY MORNING|LATE NIGHT|SAME TIME|CONT(?:'|\u2019)?D|DAYS? LATER|NIGHT LATER|THE NEXT DAY|NEXT DAY|NEXT MORNING|TWILIGHT|MIDNIGHT|NOON)\.?$/i;

  /* ---------- A. characters and encoding ---------- */
  rule('R01', 'Encoding', 'Broken characters and invisible marks',
    'Fixes garbled apostrophes and quotes (\u00e2\u20ac\u2122), non-breaking and zero-width spaces, form feeds, odd line endings and the byte-order mark.',
    function (t) {
      var n = 0, ex = '';
      var map = [['\u00e2\u20ac\u2122', '\u2019'], ['\u00e2\u20ac\u02dc', '\u2018'], ['\u00e2\u20ac\u0153', '\u201c'], ['\u00e2\u20ac\u009d', '\u201d'], ['\u00e2\u20ac\u201c', '\u2013'], ['\u00e2\u20ac\u201d', '\u2014'], ['\u00e2\u20ac\u00a6', '\u2026'], ['\u00c3\u00a9', '\u00e9'], ['\u00c3\u00a8', '\u00e8'], ['\u00c3\u00a1', '\u00e1'], ['\u00c3\u00b1', '\u00f1'], ['\u00c3\u00b3', '\u00f3'], ['\u00c3\u00ad', '\u00ed'], ['\ufb01', 'fi'], ['\ufb02', 'fl'], ['\ufb00', 'ff'], ['\ufb03', 'ffi']];
      map.forEach(function (p) { var parts = t.split(p[0]); if (parts.length > 1) { n += parts.length - 1; ex = ex || sample(p[0], p[1]); t = parts.join(p[1]); } });
      var before = t; t = t.replace(/^\ufeff/, '').replace(/[\u200b-\u200d\u2060\ufeff]/g, '').replace(/[\u00a0\u2007\u202f]/g, ' ').replace(/\u2028|\u2029/g, '\n').replace(/\f/g, '\n\n').replace(/\r\n?/g, '\n');
      if (t !== before) { n += Math.abs(before.length - t.length) || 1; ex = ex || 'invisible or non-breaking characters replaced'; }
      return { text: t, n: n, ex: ex };
    });

  rule('R02', 'Encoding', 'Web page leftovers',
    'Removes HTML tags, scripts and comments, turns line-break tags into new lines and decodes entities such as &amp; and &nbsp;.',
    function (t) {
      if (!/<\/?(?:html|head|body|pre|b|i|u|br|p|font|span|div|center|title|script|style)\b/i.test(t) && !/&(?:amp|nbsp|quot|lt|gt|#\d+);/.test(t)) return { text: t, n: 0 };
      var o = t, n = 0;
      t = t.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<\/?(?:html|body|pre|b|i|u|em|strong|p|font|span|div|center|title|a|table|tr|td|th|ul|ol|li|h\d)\b[^>]*>/gi, function (m) { n++; return ''; });
      var ents = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '\u2019', lsquo: '\u2018', ldquo: '\u201c', rdquo: '\u201d', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026' };
      t = t.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, function (m, e) { n++; if (e.charAt(0) === '#') { var c = e.charAt(1).toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return c ? String.fromCharCode(c) : m; } return ents[e.toLowerCase()] != null ? ents[e.toLowerCase()] : m; });
      return { text: t, n: n, ex: n ? 'tags and entities removed (' + n + ')' : '' };
    });

  rule('R03', 'Encoding', 'Markdown and Fountain markup',
    'Removes **bold**, *italic* and _underline_ markers, [[notes]], /* boneyard */ blocks and === page-break lines when they are used repeatedly.',
    function (t) {
      var n = 0, ex = '';
      var b = (t.match(/\*\*[^*\n]+\*\*/g) || []).length, i = (t.match(/(?<![\w*])\*[^*\s][^*\n]*[^*\s]\*(?![\w*])/g) || []).length, u = (t.match(/(?<![\w])_[^_\s][^_\n]*[^_\s]_(?![\w])/g) || []).length;
      if (b + i + u >= 3) { t = t.replace(/\*\*([^*\n]+)\*\*/g, function (m, a) { n++; ex = ex || sample(m, a); return a; }).replace(/(?<![\w*])\*([^*\s][^*\n]*[^*\s])\*(?![\w*])/g, function (m, a) { n++; return a; }).replace(/(?<![\w])_([^_\s][^_\n]*[^_\s])_(?![\w])/g, function (m, a) { n++; return a; }); }
      var notes = (t.match(/\[\[[\s\S]*?\]\]/g) || []).length; if (notes) { t = t.replace(/\[\[[\s\S]*?\]\]/g, ''); n += notes; ex = ex || notes + ' note(s) removed'; }
      var bone = (t.match(/\/\*[\s\S]*?\*\//g) || []).length; if (bone) { t = t.replace(/\/\*[\s\S]*?\*\//g, ''); n += bone; }
      var pb = (t.match(/^\s*={3,}\s*$/gm) || []).length; if (pb) { t = t.replace(/^\s*={3,}\s*$/gm, ''); n += pb; }
      return { text: t, n: n, ex: ex };
    });

  /* ---------- B. page furniture and layout ---------- */
  rule('R04', 'Layout', 'Line numbers down the margin',
    'If most lines start with a running number (1, 2, 3 \u2026 or 001, 002 \u2026) the numbers are removed.',
    function (t) {
      var L = lines(t), nb = L.filter(function (l) { return l.trim(); }); if (nb.length < 40) return { text: t, n: 0 };
      var hits = [], prev = -1, inc = 0;
      L.forEach(function (l, i) { var m = /^\s*(\d{1,5})[.):\t ]\s*(?=\S)/.exec(l); if (m && l.trim().length > m[0].trim().length) { hits.push(i); var v = +m[1]; if (v > prev) inc++; prev = v; } });
      if (hits.length / nb.length < 0.6 || inc / hits.length < 0.85) return { text: t, n: 0 };
      var ex = '';
      hits.forEach(function (i) { var o = L[i]; L[i] = o.replace(/^(\s*)\d{1,5}[.):\t ]\s*/, '$1'); ex = ex || sample(o, L[i]); });
      return { text: L.join('\n'), n: hits.length, ex: ex };
    });

  rule('R05', 'Layout', 'Double-spaced text',
    'When every line is followed by a blank line, the extra blank lines are removed so that real paragraph breaks remain.',
    function (t) {
      var L = lines(t), nb = 0, alt = 0; for (var i = 0; i < L.length - 1; i++) { if (L[i].trim()) { nb++; if (!L[i + 1].trim() && L[i + 2] !== undefined && L[i + 2].trim()) alt++; } }
      if (nb < 40 || alt / nb < 0.75) return { text: t, n: 0 };
      var out = [], n = 0; for (i = 0; i < L.length; i++) { if (!L[i].trim() && L[i - 1] !== undefined && L[i - 1].trim() && L[i + 1] !== undefined && L[i + 1].trim()) { n++; continue; } out.push(L[i]); }
      return { text: out.join('\n'), n: n, ex: n + ' alternate blank lines removed' };
    });

  rule('R06', 'Layout', 'Page headers, footers and page numbers',
    'Removes lines that repeat at regular intervals (running titles, dates, "Draft 3"), CONTINUED markers and runs of page numbers.',
    function (t) {
      var L = lines(t), n = 0, ex = '', kill = {};
      /* continued markers */
      L.forEach(function (l, i) { if (/^\s*(?:\(?\s*CONTINUED\s*\)?:?\s*(?:\(\s*\d+\s*\))?|\d+[A-Z]?\s+CONTINUED:?|CONTINUED:?\s*\(?\d*\)?)\s*$/i.test(l) && l.trim()) { kill[i] = 1; } });
      /* page numbers: bare numbers, "- 12 -", "Page 12", "12." that climb */
      var pn = []; L.forEach(function (l, i) { var m = /^\s*(?:page\s+)?[-\u2013\u2014]?\s*(\d{1,3})\s*[-\u2013\u2014.]?\s*(?:of\s+\d+)?\s*$/i.exec(l); if (m && l.trim()) pn.push([i, +m[1]]); });
      if (pn.length >= 8) { var up = 0; for (var k = 1; k < pn.length; k++) if (pn[k][1] > pn[k - 1][1]) up++; if (up / (pn.length - 1) > 0.8) pn.forEach(function (p) { kill[p[0]] = 1; }); }
      /* running headers: same short line, regular spacing */
      var pos = {}; L.forEach(function (l, i) { var s = l.trim(); if (s && s.length < 70) (pos[s] = pos[s] || []).push(i); });
      Object.keys(pos).forEach(function (s) {
        var p = pos[s]; if (p.length < 6) return; if (/^[A-Z]{0,2}\d+[A-Z]{0,2}\.?$/.test(s) || /^(?:INT|EXT|I\/E)/i.test(s)) return; var gaps = []; for (var k2 = 1; k2 < p.length; k2++) gaps.push(p[k2] - p[k2 - 1]);
        var m = gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length, sd = Math.sqrt(gaps.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / gaps.length);
        if (m >= 30 && m <= 90 && sd / m < 0.3) p.forEach(function (i) { kill[i] = 1; });
      });
      var out = []; L.forEach(function (l, i) { if (kill[i]) { n++; ex = ex || '\u201c' + l.trim().slice(0, 50) + '\u201d removed'; } else out.push(l); });
      return { text: out.join('\n'), n: n, ex: ex };
    });

  rule('R07', 'Layout', 'Dialogue split across pages',
    'Joins a speech that was cut by (MORE) and repeated as NAME (CONT\'D) at the top of the next page.',
    function (t) {
      var n = 0, ex = '';
      t = t.replace(/\n[ \t]*\(MORE\)[ \t]*\n(?:[ \t]*\n)*[ \t]*[A-Z][A-Z0-9 .'#\u2019-]*[ \t]*\(\s*CONT(?:'|\u2019)?D\s*\)[ \t]*\n/g, function (m) { n++; ex = ex || '(MORE) / NAME (CONT\u2019D) pair joined'; return '\n'; });
      return { text: t, n: n, ex: ex };
    });

  rule('R08', 'Layout', 'Hyphenated line breaks',
    'Joins words split by a hyphen at the end of a wrapped line ("some-\\nthing"), when the pattern appears repeatedly.',
    function (t) {
      var c = (t.match(/[a-z]{2,}-\n[ \t]*[a-z]{2,}/g) || []).length; if (c < 4) return { text: t, n: 0 };
      var n = 0, ex = ''; t = t.replace(/([a-z]{2,})-\n[ \t]*([a-z]{2,})/g, function (m, a, b) { n++; ex = ex || sample(m, a + b); return a + b; });
      return { text: t, n: n, ex: ex };
    }, true);

  rule('R09', 'Layout', 'Spaced-out letters',
    'Collapses letter-spaced text such as "F A D E  I N:" or "T H E  E N D".',
    function (t) {
      var n = 0, ex = '';
      t = lines(t).map(function (l) {
        var s = l.trim(); if (s.length < 5) return l; var toks = s.split(/\s+/); var single = toks.filter(function (x) { return x.length === 1 && /[A-Za-z]/.test(x); }).length;
        if (single / toks.length < 0.8 || toks.length < 5 || !/\S\s{2,}\S/.test(s)) return l;
        var o = l; var res = s.replace(/\s{2,}/g, '\u0001').replace(/\s/g, '').replace(/\u0001/g, ' '); n++; ex = ex || sample(o, res); return l.replace(s, res);
      }).join('\n');
      return { text: t, n: n, ex: ex };
    });

  /* ---------- C. scene headings ---------- */
  rule('R10', 'Headings', 'Scene heading spelling',
    'Standardises INTERIOR/EXTERIOR/INT/EXT/I.E, adds the missing full stop and space, and capitalises lower-case headings.',
    function (t) {
      var n = 0, ex = '';
      t = lines(t).map(function (l) {
        var m = /^(\s*(?:\d+[A-Z]{0,2}[.)]?\s+)?)(INTERIOR|EXTERIOR|INT\.?\s*\/\s*EXT|EXT\.?\s*\/\s*INT|INT|EXT|EST|I\/E)(?:\.\s*|[-:,]\s*|\s+)(?=\S)(.*)$/i.exec(l);
        if (!m) return l; if (l !== l.toUpperCase() && !(l === l.toLowerCase() && /^(?:int|ext|i\/e)/.test(m[2].toLowerCase()) && !/^(?:interior|exterior)$/i.test(m[2]) && /\s[-\u2013\u2014]\s*(?:day|night|morning|evening|dawn|dusk|afternoon|later|continuous|latter|same|moments later)\b/.test(m[3]))) return l; var rest = m[3], key = m[2].toUpperCase().replace(/\s+/g, ''); if (rest.split(/\s+/).length > 14 || /[a-z]{3,}.*[.!?]\s+[A-Z]/.test(rest)) return l;
        if (/^(INT|EXT|EST)$/i.test(m[2]) && /[a-z]/.test(rest) && !/^[A-Z][A-Z0-9 .'\-\/,()]*$/.test(rest) && /^(int|ext)$/.test(m[2])) {/* lower-case int/ext in running text? only accept when rest looks like a location */ }
        if (/^(INT|EXT)$/i.test(m[2]) && m[2] !== m[2].toUpperCase() && /[a-z]/.test(rest) && rest.split(/\s+/).length > 7) return l;
        var kind = key === 'INTERIOR' ? 'INT.' : key === 'EXTERIOR' ? 'EXT.' : (key.replace(/\./g, '') === 'INT/EXT' ? 'INT./EXT.' : key.replace(/\./g, '') === 'EXT/INT' ? 'EXT./INT.' : key === 'I/E' ? 'I/E.' : key.replace(/\./g, '') + '.');
        var out = m[1] + kind + ' ' + rest.toUpperCase().replace(/\s*[\u2013\u2014]\s*/g, ' - ').replace(/\s{2,}/g, ' ').trim();
        if (out !== l.trim() && out !== l) { n++; ex = ex || sample(l, out); return out; } return l;
      }).join('\n');
      return { text: t, n: n, ex: ex };
    });

  rule('R11', 'Headings', 'Scene heading split over two lines',
    'Joins "INT. HOUSE -" with a "NIGHT" on the next line, or a heading wrapped onto a second capitalised line.',
    function (t) {
      var L = lines(t), out = [], n = 0, ex = '';
      for (var i = 0; i < L.length; i++) {
        var l = L[i], nx = L[i + 1];
        if (/^\s*(?:\d+[A-Z]?\s+)?(?:INT|EXT|EST|I\/E)[.\s\/]/.test(l) && !/[a-z]/.test(l) && nx !== undefined && nx.trim() && !/[a-z]/.test(nx) && nx.trim().length < 40 && (/[-\u2013\u2014]\s*$/.test(l.trim()) || TOD.test(nx.trim())) && !/^(INT|EXT)/.test(nx.trim()) && !(L[i - 1] !== undefined && false)) {
          var j = l.replace(/\s+$/, '') + ' ' + nx.trim(); if (!/[-\u2013\u2014]\s/.test(j) && TOD.test(nx.trim())) j = l.replace(/\s+$/, '') + ' - ' + nx.trim();
          out.push(j.replace(/-\s+-/g, '-')); n++; ex = ex || sample(l + ' / ' + nx, j); i++; continue;
        }
        out.push(l);
      }
      return { text: out.join('\n'), n: n, ex: ex };
    });

  rule('R12', 'Headings', 'Numbered scene lines',
    'Turns lines like "SCENE 12 - KITCHEN" or "12. KITCHEN - NIGHT" into a standard heading marker when the script has no INT./EXT. headings.',
    function (t) {
      if (/(^|\n)\s*(?:\d+\s+)?(?:INT|EXT)[.\s]/.test(t)) return { text: t, n: 0 };
      var re = /^\s*SCENE\s+(\d+)\s*[-\u2013\u2014:.]\s*(.+)$/i, c = lines(t).filter(function (l) { return re.test(l); }).length; if (c < 3) return { text: t, n: 0 };
      var n = 0, ex = ''; t = lines(t).map(function (l) { var m = re.exec(l); if (!m) return l; n++; var o = '.' + m[2].trim().toUpperCase(); ex = ex || sample(l, o); return '\n' + o + '\n'; }).join('\n');
      return { text: t, n: n, ex: ex };
    });

  /* ---------- D. speakers and dialogue ---------- */
  rule('R13', 'Dialogue', 'Play-style speakers (NAME: text)',
    'Splits "JOHN: Where were you?" into a speaker line and a dialogue line when the pattern is used throughout.',
    function (t) {
      var re = /^\s*([A-Za-z][A-Za-z0-9 .'\u2019#-]{0,24}?)\s*(\([^)]*\))?\s*:\s+(\S.*)$/, L = lines(t), cand = {}, tot = 0;
      L.forEach(function (l) { var m = re.exec(l); if (m && !/^(INT|EXT|NOTE|TITLE|AUTHOR|DRAFT|FADE|CUT|SUPER|CHYRON|DATE|TIME|SCENE|ACT|SOUND|SFX|MUSIC|TEXT|SCREEN)$/i.test(m[1].trim()) && m[1].trim().split(/\s+/).length <= 3) { var k = m[1].trim().toUpperCase(); cand[k] = (cand[k] || 0) + 1; tot++; } });
      var names = Object.keys(cand).filter(function (k) { return cand[k] >= 3; }); var covered = names.reduce(function (a, k) { return a + cand[k]; }, 0);
      var nb = L.filter(function (l) { return l.trim(); }).length; if (names.length < 2 || covered < 12 || covered / nb < 0.12) return { text: t, n: 0 };
      var set = {}; names.forEach(function (k) { set[k] = 1; }); var out = [], n = 0, ex = '';
      L.forEach(function (l) { var m = re.exec(l); if (m && set[m[1].trim().toUpperCase()]) { n++; out.push('', m[1].trim().toUpperCase()); if (m[2]) out.push(m[2].trim()); out.push(m[3].trim()); ex = ex || sample(l, m[1].trim().toUpperCase() + ' / ' + m[3]); } else out.push(l); });
      return { text: out.join('\n'), n: n, ex: ex };
    });

  rule('R14', 'Dialogue', 'Speaker names not in capitals',
    'Capitalises speaker lines written as "John" or "john" when the same short line appears many times directly above dialogue.',
    function (t) {
      var L = lines(t), cnt = {}, ok = {};
      L.forEach(function (l, i) { var s = l.trim(); if (!s || s.length > 24 || /[.!?,:;]$/.test(s) || /^[A-Z0-9 .'#()\u2019-]+$/.test(s)) return; if (s.split(/\s+/).length > 3) return; if (!/^[A-Za-z][A-Za-z .'\u2019-]*(\s*\([^)]*\))?$/.test(s)) return;
        var prevBlank = i === 0 || !L[i - 1].trim(), nextText = L[i + 1] !== undefined && L[i + 1].trim(); if (prevBlank && nextText) { var base = s.replace(/\s*\([^)]*\)$/, ''); cnt[base.toLowerCase()] = (cnt[base.toLowerCase()] || 0) + 1; } });
      Object.keys(cnt).forEach(function (k) { if (cnt[k] >= 8) ok[k] = 1; }); if (Object.keys(ok).length < 2) return { text: t, n: 0 };
      var n = 0, ex = ''; var out = L.map(function (l, i) { var s = l.trim(); var m = /^([A-Za-z][A-Za-z .'\u2019-]*?)(\s*\([^)]*\))?$/.exec(s); if (!m || !ok[m[1].trim().toLowerCase()] || (i > 0 && L[i - 1].trim()) || !(L[i + 1] !== undefined && L[i + 1].trim())) return l; var u = m[1].trim().toUpperCase() + (m[2] ? ' ' + m[2].trim().toUpperCase() : ''); if (u === s) return l; n++; ex = ex || sample(s, u); return l.replace(s, u); });
      return { text: out.join('\n'), n: n, ex: ex };
    });

  rule('R15', 'Dialogue', 'Parenthetical broken over two lines',
    'Joins "(to" / "Edmund)" into a single parenthetical line.',
    function (t) {
      var L = lines(t), out = [], n = 0, ex = '';
      for (var i = 0; i < L.length; i++) { var l = L[i], nx = L[i + 1]; if (/^\s*\([^)]*$/.test(l) && nx !== undefined && /^[^()]*\)\s*$/.test(nx) && (l.trim() + nx.trim()).length < 90) { var j = l.replace(/\s+$/, '') + ' ' + nx.trim(); out.push(j); n++; ex = ex || sample(l + ' / ' + nx, j); i++; } else out.push(l); }
      return { text: out.join('\n'), n: n, ex: ex };
    });

  rule('R16', 'Dialogue', 'Bracketed speakers',
    'Turns [JOHN] or <JOHN> on a line of its own into JOHN when the same tag is used repeatedly above dialogue.',
    function (t) {
      var L = lines(t), cnt = {}; L.forEach(function (l) { var m = /^\s*[\[<]([A-Za-z][A-Za-z0-9 .'-]{0,22})[\]>]\s*$/.exec(l); if (m) cnt[m[1].toUpperCase()] = (cnt[m[1].toUpperCase()] || 0) + 1; });
      var good = Object.keys(cnt).filter(function (k) { return cnt[k] >= 3; }); if (good.length < 2) return { text: t, n: 0 };
      var n = 0, ex = ''; L = L.map(function (l) { var m = /^\s*[\[<]([A-Za-z][A-Za-z0-9 .'-]{0,22})[\]>]\s*$/.exec(l); if (m && good.indexOf(m[1].toUpperCase()) >= 0) { n++; ex = ex || sample(l, m[1].toUpperCase()); return m[1].toUpperCase(); } return l; });
      return { text: L.join('\n'), n: n, ex: ex };
    });

  /* ---------- E. clean-up ---------- */
  rule('R17', 'Clean-up', 'Repeated identical lines',
    'Removes a long line (over 20 characters) that is repeated twice in a row, a common copy-and-paste slip.',
    function (t) {
      var L = lines(t), out = [], n = 0, ex = ''; L.forEach(function (l) { var p = out[out.length - 1]; if (p !== undefined && l.trim() && l.trim() === p.trim() && l.trim().length > 20 && !/^\s*[A-Z0-9 .'()\u2019-]+$/.test(l.trim())) { n++; ex = ex || '\u201c' + l.trim().slice(0, 60) + '\u201d repeated'; return; } out.push(l); });
      return { text: out.join('\n'), n: n, ex: ex };
    }, true);

  rule('R18', 'Clean-up', 'Spacing',
    'Strips trailing spaces and tabs, replaces tabs inside a line with a space (leading indentation is kept), and reduces three or more blank lines to one.',
    function (t) {
      var n = 0, o = t;
      t = lines(t).map(function (l) { var m = /^(\s*)(.*?)\s*$/.exec(l); var lead = m[1], body = m[2].replace(/\t+/g, ' ').replace(/ {2,}(?=\S)/g, function (s) { return s.length > 3 ? s : ' '; }); return (body ? lead + body : ''); }).join('\n');
      t = t.replace(/\n{3,}/g, '\n\n');
      if (t !== o) n = Math.max(1, lines(o).length - lines(t).length || 1);
      return { text: t, n: n, ex: n ? 'extra spaces and blank lines tidied' : '' };
    });

  C.REPAIR_RULES = RULES.map(function (r) { return { id: r.id, group: r.group, name: r.name, desc: r.desc, off: r.off }; });
  C.repair = function (raw, opts) {
    opts = opts || {}; var skip = {}; (opts.skip || []).forEach(function (s) { skip[s] = 1; }); var on = {}; (opts.on || []).forEach(function (s) { on[s] = 1; });
    RULES.forEach(function (r) { if (r.off && !on[r.id]) skip[r.id] = 1; });
    var t = String(raw == null ? '' : raw), log = [];
    RULES.forEach(function (r) {
      if (skip[r.id]) { log.push({ id: r.id, group: r.group, name: r.name, desc: r.desc, n: 0, skipped: true, off: r.off }); return; }
      var res; try { res = r.fn(t) || { text: t, n: 0 }; } catch (e) { res = { text: t, n: 0, err: e.message }; }
      if (res.n > 0) t = res.text; log.push({ id: r.id, group: r.group, name: r.name, desc: r.desc, n: res.n || 0, ex: res.ex || '', err: res.err || '' });
    });
    var letters = (t.match(/[A-Za-z]/g) || []).length, upper = (t.match(/[A-Z]/g) || []).length;
    var notes = []; if (letters > 400 && upper / letters > 0.9) notes.push('The whole script is in capital letters, so speakers and headings cannot be told apart from action by case alone. Check the result carefully.');
    return { text: t, log: log, changed: log.some(function (x) { return x.n > 0; }), notes: notes, total: log.reduce(function (a, x) { return a + x.n; }, 0) };
  };
})();
