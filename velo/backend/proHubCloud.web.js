// Wix Velo web module: Backend > proHubCloud.web.js
// Only logged-in site members can call these. The member is identified on the server, never by the browser.
import { Permissions, webMethod } from 'wix-web-module';
import { currentMember } from 'wix-members-backend';
import wixData from 'wix-data';

const SAVES = 'ProHubSaves', PROJ = 'ProHubProjects';
const OPTS = { suppressAuth: true };
const KEY = /^[\w.-]{1,60}$/;
const MAX_PARTS = 60, MAX_KEYS = 40, MAX_PROJECTS = 25;

async function me() {
  const m = await currentMember.getMember({ fieldsets: ['FULL'] });
  if (!m) throw new Error('Please log in.');
  const email = String(m.loginEmail || (m.contactDetails && m.contactDetails.emails && m.contactDetails.emails[0]) || '').toLowerCase();
  const name = (m.profile && m.profile.nickname) || (m.contactDetails && m.contactDetails.firstName) || email;
  return { id: m._id, email: email, name: name };
}
function editorsOf(p) { return String(p.editors || '').toLowerCase().split(/[,\s;]+/).filter(Boolean); }
async function project(pid, u, ownerOnly) {
  const r = await wixData.query(PROJ).eq('pid', String(pid || '')).limit(1).find(OPTS);
  const p = r.items[0]; if (!p) throw new Error('Project not found.');
  const isOwner = p.owner === u.id;
  if (ownerOnly ? !isOwner : (!isOwner && editorsOf(p).indexOf(u.email) < 0)) throw new Error(ownerOnly ? 'Only the owner can do that.' : 'You do not have access to this project.');
  return p;
}
function newPid() { const c = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 24; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }

export const whoami = webMethod(Permissions.SiteMember, async () => { const u = await me(); return { name: u.name, email: u.email }; });

export const listProjects = webMethod(Permissions.SiteMember, async () => {
  const u = await me();
  const a = await wixData.query(PROJ).eq('owner', u.id).limit(100).find(OPTS);
  const b = await wixData.query(PROJ).contains('editors', u.email).limit(100).find(OPTS);
  const seen = {}, out = [];
  a.items.concat(b.items).forEach(p => { if (seen[p.pid]) return; if (p.owner !== u.id && editorsOf(p).indexOf(u.email) < 0) return; seen[p.pid] = 1; out.push({ pid: p.pid, name: p.name, mine: p.owner === u.id, editors: p.owner === u.id ? editorsOf(p) : [] }); });
  return out;
});

export const createProject = webMethod(Permissions.SiteMember, async (name) => {
  const u = await me();
  const n = await wixData.query(PROJ).eq('owner', u.id).count(OPTS);
  if (n >= MAX_PROJECTS) throw new Error('You have reached the limit of ' + MAX_PROJECTS + ' projects.');
  const pid = newPid();
  await wixData.insert(PROJ, { pid: pid, name: String(name || 'Untitled project').slice(0, 80), owner: u.id, editors: '', created: Date.now() }, OPTS);
  return { pid: pid };
});

export const shareProject = webMethod(Permissions.SiteMember, async (pid, emails) => {
  const u = await me(); const p = await project(pid, u, true);
  const list = (Array.isArray(emails) ? emails : String(emails || '').split(/[,\s;]+/)).map(e => String(e).trim().toLowerCase()).filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)).slice(0, 20);
  p.editors = list.join(','); await wixData.update(PROJ, p, OPTS); return { editors: list };
});

export const removeProject = webMethod(Permissions.SiteMember, async (pid) => {
  const u = await me(); const p = await project(pid, u, true);
  const r = await wixData.query(SAVES).eq('pid', p.pid).limit(1000).find(OPTS);
  if (r.items.length) await wixData.bulkRemove(SAVES, r.items.map(i => i._id), OPTS);
  await wixData.remove(PROJ, p._id, OPTS); return { removed: r.items.length };
});

export const saveKey = webMethod(Permissions.SiteMember, async (pid, k, ts, base, parts, force) => {
  const u = await me(); await project(pid, u, false);
  if (!KEY.test(k || '') || !Array.isArray(parts) || !parts.length || parts.length > MAX_PARTS) throw new Error('Bad request');
  const ex = await wixData.query(SAVES).eq('pid', pid).eq('k', k).limit(1000).find(OPTS);
  const cur = ex.items.length ? ex.items[0].ts : 0;
  if (cur > (base || 0) && !force) return { ok: false, conflict: true, ts: cur, by: ex.items[0].by || '' };
  if (!ex.items.length) { const all = await wixData.query(SAVES).eq('pid', pid).eq('i', 0).limit(1000).find(OPTS); if (all.items.length >= MAX_KEYS) throw new Error('Too many items in this project'); }
  if (ex.items.length) await wixData.bulkRemove(SAVES, ex.items.map(i => i._id), OPTS);
  await wixData.bulkInsert(SAVES, parts.map((v, i) => ({ pid: pid, k: k, i: i, n: parts.length, ts: ts, v: String(v), by: u.name })), OPTS);
  return { ok: true, ts: ts };
});

export const loadProject = webMethod(Permissions.SiteMember, async (pid) => {
  const u = await me(); await project(pid, u, false);
  const r = await wixData.query(SAVES).eq('pid', pid).ascending('k', 'i').limit(1000).find(OPTS);
  const keys = {}; r.items.forEach(it => { const o = keys[it.k] = keys[it.k] || { ts: it.ts, by: it.by || '', parts: [] }; o.parts[it.i] = it.v; });
  return { keys: keys };
});

export const projectMeta = webMethod(Permissions.SiteMember, async (pid) => {
  const u = await me(); await project(pid, u, false);
  const r = await wixData.query(SAVES).eq('pid', pid).eq('i', 0).limit(1000).find(OPTS);
  const m = {}; r.items.forEach(it => { m[it.k] = { ts: it.ts, by: it.by || '' }; }); return { meta: m };
});
