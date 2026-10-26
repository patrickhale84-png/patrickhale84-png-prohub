// Paste this into your Wix site: Velo sidebar > Backend > http-functions.js
// (create the file if it does not exist, or merge these functions into the existing one).
// It stores each project in the "ProHubSaves" collection and is reached at
//   https://www.YOURDOMAIN.com/_functions/save | load | meta | purge
import { response } from 'wix-http-functions';
import wixData from 'wix-data';

const COL = 'ProHubSaves';
const OPTS = { suppressAuth: true };
const H = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};
const PID = /^[A-Za-z0-9_-]{20,64}$/;
const KEY = /^[\w.-]{1,60}$/;
const MAX_PARTS = 60;          // per key
const MAX_KEYS = 40;           // per project

function reply(body, status) { return response({ status: status || 200, headers: H, body: JSON.stringify(body) }); }
export function options_save() { return response({ status: 204, headers: H }); }
export function options_load() { return response({ status: 204, headers: H }); }
export function options_meta() { return response({ status: 204, headers: H }); }
export function options_purge() { return response({ status: 204, headers: H }); }

// Save one key of a project. Body is JSON sent as text/plain: {pid,k,ts,base,parts:[...],force}
export async function post_save(request) {
  try {
    const b = JSON.parse(await request.body.text());
    const { pid, k, ts, base, parts, force } = b;
    if (!PID.test(pid || '') || !KEY.test(k || '') || !Array.isArray(parts) || !parts.length || parts.length > MAX_PARTS) return reply({ ok: false, error: 'Bad request' }, 400);
    const ex = await wixData.query(COL).eq('pid', pid).eq('k', k).limit(1000).find(OPTS);
    const cur = ex.items.length ? ex.items[0].ts : 0;
    if (cur > (base || 0) && !force) return reply({ ok: false, conflict: true, ts: cur });
    if (!ex.items.length) {
      const all = await wixData.query(COL).eq('pid', pid).eq('i', 0).limit(1000).find(OPTS);
      if (all.items.length >= MAX_KEYS) return reply({ ok: false, error: 'Too many items in this project' }, 400);
    }
    if (ex.items.length) await wixData.bulkRemove(COL, ex.items.map(function (i) { return i._id; }), OPTS);
    await wixData.bulkInsert(COL, parts.map(function (v, i) { return { pid: pid, k: k, i: i, n: parts.length, ts: ts, v: String(v) }; }), OPTS);
    return reply({ ok: true, ts: ts });
  } catch (e) { return reply({ ok: false, error: String((e && e.message) || e) }, 500); }
}

// Load a whole project: /_functions/load?pid=...
export async function get_load(request) {
  try {
    const pid = request.query.pid;
    if (!PID.test(pid || '')) return reply({ ok: false, error: 'Bad request' }, 400);
    const r = await wixData.query(COL).eq('pid', pid).ascending('k', 'i').limit(1000).find(OPTS);
    const keys = {};
    r.items.forEach(function (it) { const o = keys[it.k] = keys[it.k] || { ts: it.ts, parts: [] }; o.parts[it.i] = it.v; });
    return reply({ ok: true, keys: keys });
  } catch (e) { return reply({ ok: false, error: String((e && e.message) || e) }, 500); }
}

// Cheap check for what changed: /_functions/meta?pid=...  ->  {k: ts}
export async function get_meta(request) {
  try {
    const pid = request.query.pid;
    if (!PID.test(pid || '')) return reply({ ok: false, error: 'Bad request' }, 400);
    const r = await wixData.query(COL).eq('pid', pid).eq('i', 0).limit(1000).find(OPTS);
    const m = {}; r.items.forEach(function (it) { m[it.k] = it.ts; });
    return reply({ ok: true, meta: m });
  } catch (e) { return reply({ ok: false, error: String((e && e.message) || e) }, 500); }
}

// Delete a project: body {pid}
export async function post_purge(request) {
  try {
    const b = JSON.parse(await request.body.text());
    if (!PID.test(b.pid || '')) return reply({ ok: false, error: 'Bad request' }, 400);
    const r = await wixData.query(COL).eq('pid', b.pid).limit(1000).find(OPTS);
    if (r.items.length) await wixData.bulkRemove(COL, r.items.map(function (i) { return i._id; }), OPTS);
    return reply({ ok: true, removed: r.items.length });
  } catch (e) { return reply({ ok: false, error: String((e && e.message) || e) }, 500); }
}
