// Wix page code for the page that holds the proHUB / filmHUB embed.
// In the editor: select the embed, open its settings, and note its ID (shown in the Properties panel, e.g. html1).
// Put that ID below, then paste this into the page's code panel (the page, not the backend).
import { authentication } from 'wix-members-frontend';
import * as cloud from 'backend/proHubCloud.web';

const FRAME = '#html1';
const OPS = ['whoami', 'listProjects', 'createProject', 'shareProject', 'removeProject', 'saveKey', 'loadProject', 'projectMeta'];

$w.onReady(function () {
  const f = $w(FRAME);
  f.onMessage(async (ev) => {
    const m = ev.data;
    if (!m || m.type !== 'ph-cloud') return;
    const reply = (o) => f.postMessage(Object.assign({ type: 'ph-cloud-reply', id: m.id }, o));
    try {
      if (m.op === 'hello') return reply({ ok: true, result: { loggedIn: authentication.loggedIn() } });
      if (m.op === 'login') { await authentication.promptLogin(); return reply({ ok: true, result: { loggedIn: authentication.loggedIn() } }); }
      if (OPS.indexOf(m.op) < 0) return reply({ ok: false, error: 'Unknown request' });
      if (!authentication.loggedIn()) return reply({ ok: false, error: 'login' });
      reply({ ok: true, result: await cloud[m.op].apply(null, m.args || []) });
    } catch (e) { reply({ ok: false, error: String((e && e.message) || e) }); }
  });
});
