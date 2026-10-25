/* proHUB service worker: makes the site installable and usable with no signal.
   Pages and scripts: try the network first so updates arrive, fall back to the saved copy.
   Fonts, icons and library files from other sites: serve the saved copy, refresh it in the background. */
var VER = 'prohub-v3';
var CORE = [
  './', 'index.html', 'filmhub.html', 'roles.json', 'manifest.webmanifest',
  'tiles/pre-production.html', 'tiles/production.html', 'tiles/post-production.html',
  'lib/pdf-lib.min.js', 'lib/safety.js', 'lib/exchange.js', 'lib/autotag.js',
  'favicon.svg', 'favicon-32.png', 'favicon-192.png', 'favicon-512.png', 'apple-touch-icon.png'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VER).then(function (c) {
    return Promise.all(CORE.map(function (u) { return c.add(u).catch(function () {}); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VER; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function put(req, res) {
  if (res && (res.status === 200 || res.type === 'opaque')) { var copy = res.clone(); caches.open(VER).then(function (c) { c.put(req, copy); }); }
  return res;
}
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(req).then(function (r) { return put(req, r); }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (m) { return m || caches.match('index.html'); });
    }));
  } else {
    e.respondWith(caches.match(req).then(function (m) {
      var net = fetch(req).then(function (r) { return put(req, r); }).catch(function () { return m; });
      return m || net;
    }));
  }
});
