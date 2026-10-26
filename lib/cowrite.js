/* Co-writing engine: the script is a list of lines with stable ids, so two people can edit different lines at the same time
   and their changes merge instead of overwriting each other. Works through PHCloud (Wix member login). */
(function () {
  if (window.PHCow) return;
  var DKEY = 'prohub_cowrite_v1', MKEY = 'prehub_master_v1', RK = 'cowrite_v1', PART = 100000;
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function jget(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function empty() { return { v: 1, lines: [], comments: [] }; }
  function local() { var d = jget(DKEY); if (!d || !d.doc) return { doc: empty(), base: null, ts: 0 }; return d; }
  function store(st) { jset(DKEY, st); }

  /* take the current master script into the shared document (keeps ids for lines that did not change) */
  function fromMaster(prev, who) {
    var m = jget(MKEY), out = empty(); if (!m || !m.lines) return out;
    var pool = {}; (prev ? prev.lines : []).forEach(function (l) { (pool[l.type + '|' + l.text] = pool[l.type + '|' + l.text] || []).push(l); });
    out.lines = m.lines.map(function (l) { var k = (l.type || 'action') + '|' + (l.text || ''), p = pool[k] && pool[k].shift(); return p ? p : { id: uid(), type: l.type || 'action', text: l.text || '', by: who || '', ts: Date.now() }; });
    out.comments = prev ? prev.comments.slice() : [];
    return out;
  }
  function toMaster(doc) {
    var m = jget(MKEY) || { lines: [] }, old = {}; (m.lines || []).forEach(function (l) { (old[l.type + '|' + l.text] = old[l.type + '|' + l.text] || []).push(l); });
    m.lines = doc.lines.map(function (l) { var k = l.type + '|' + l.text, p = old[k] && old[k].shift(); return p ? p : { type: l.type, text: l.text }; });
    jset(MKEY, m); return m.lines.length;
  }

  function same(a, b) { return a && b && a.type === b.type && a.text === b.text; }

  /* three-way merge by line id. base = last common version, mine = my edits, theirs = what is in the cloud now */
  function merge3(base, mine, theirs, who) {
    var B = {}, M = {}, T = {}; base.lines.forEach(function (l) { B[l.id] = l; }); mine.lines.forEach(function (l) { M[l.id] = l; }); theirs.lines.forEach(function (l) { T[l.id] = l; });
    var out = [], notes = [], seen = {};
    function push(l) { if (seen[l.id]) return; seen[l.id] = 1; out.push(clone(l)); }
    /* start from their order, decide each line */
    theirs.lines.forEach(function (t) {
      var b = B[t.id], m = M[t.id];
      if (!b) { push(t); return; }                       /* they added it */
      if (!m) { if (same(b, t)) return; push(t); return; }   /* I deleted it: delete unless they changed it */
      var meCh = !same(b, m), thCh = !same(b, t);
      if (meCh && !thCh) push(m);
      else if (!meCh) push(t);
      else if (same(m, t)) push(t);
      else { push(t); notes.push({ id: uid(), line: t.id, by: who || 'Me', text: 'My version of this line: ' + m.text, ts: Date.now(), done: false }); }
    });
    /* lines they deleted that I still have */
    base.lines.forEach(function (b) { var m = M[b.id], t = T[b.id]; if (m && !t && !same(b, m) && !seen[m.id]) { /* they deleted, I edited: keep mine */ out.push(clone(m)); seen[m.id] = 1; } });
    /* lines I added: place after the line that precedes them in my copy */
    mine.lines.forEach(function (m, i) {
      if (B[m.id] || seen[m.id]) return;
      var at = 0; for (var j = i - 1; j >= 0; j--) { var pid = mine.lines[j].id, ix = idx(out, pid); if (ix >= 0) { at = ix + 1; break; } }
      out.splice(at, 0, clone(m)); seen[m.id] = 1;
    });
    /* put edited-but-undeleted-by-them lines back where mine had them if they were appended at the end */
    var cm = {}, comments = [];
    theirs.comments.concat(mine.comments).forEach(function (c) { var e = cm[c.id]; if (!e) { cm[c.id] = c; comments.push(clone(c)); } else if (c.done) { e.done = true; comments.forEach(function (x) { if (x.id === c.id) x.done = true; }); } });
    notes.forEach(function (n) { comments.push(n); });
    var ids = {}; out.forEach(function (l) { ids[l.id] = 1; });
    comments = comments.filter(function (c) { return ids[c.line]; });
    return { doc: { v: 1, lines: out, comments: comments }, conflicts: notes.length };
  }
  function idx(a, id) { for (var i = 0; i < a.length; i++) if (a[i].id === id) return i; return -1; }

  function enc(doc) { var s = JSON.stringify(doc), o = []; for (var i = 0; i < s.length; i += PART) o.push(s.slice(i, i + PART)); return o.length ? o : ['']; }
  function cfg() { return window.PHCloud ? PHCloud.cfg() : {}; }

  /* one sync round: pull remote if newer, merge, push if different */
  async function sync(st, who) {
    var c = cfg(); if (!c.pid) return { ok: false, msg: 'Pick a project first.' };
    var r = await PHCloud.call('loadKey', [c.pid, RK], 60000), res = { merged: 0, pushed: false, remoteTs: r.found ? r.ts : 0, by: r.found ? r.by : '' };
    var theirs = r.found ? JSON.parse(r.parts.join('')) : null;
    if (theirs && r.ts !== st.ts) {
      var base = st.base || empty();
      var mg = merge3(base, st.doc, theirs, who); st.doc = mg.doc; res.merged = mg.conflicts; res.changed = true;
      st.base = clone(theirs); st.ts = r.ts;
    }
    var remoteSame = theirs && JSON.stringify(theirs) === JSON.stringify(st.doc);
    if (!remoteSame) {
      for (var tries = 0; tries < 3; tries++) {
        var ts = Date.now(), sv = await PHCloud.call('saveKey', [c.pid, RK, ts, st.ts || 0, enc(st.doc), false], 60000);
        if (sv && sv.ok) { st.base = clone(st.doc); st.ts = ts; res.pushed = true; break; }
        if (sv && sv.conflict) { var r2 = await PHCloud.call('loadKey', [c.pid, RK], 60000); var th2 = JSON.parse(r2.parts.join('')); var mg2 = merge3(st.base || empty(), st.doc, th2, who); st.doc = mg2.doc; st.base = clone(th2); st.ts = r2.ts; res.merged += mg2.conflicts; res.changed = true; continue; }
        break;
      }
    }
    store(st); res.ok = true; return res;
  }
  function beat(line, who) { var c = cfg(); if (!c.pid || !PHCloud.call) return Promise.resolve(); var k = 'pres-' + (who || 'x').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40); return PHCloud.call('saveKey', [c.pid, k, Date.now(), 0, [JSON.stringify({ line: line || '' })], true]).catch(function () { }); }
  function people() { var c = cfg(); if (!c.pid) return Promise.resolve({ people: [] }); return PHCloud.call('presence', [c.pid]); }

  window.PHCow = { uid: uid, empty: empty, local: local, store: store, fromMaster: fromMaster, toMaster: toMaster, merge3: merge3, sync: sync, beat: beat, people: people, RK: RK };
})();
