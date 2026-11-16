/* Food tracking service worker: works offline, picks up new versions when online. */
var CACHE = 'ft-v1.2.0';
var FILES = ['./', 'index.html', 'css/app.css', 'js/foods.js', 'js/core.js', 'js/app.js', 'js/ocr.js', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // network first, so updates arrive; fall back to the cached copy when offline
  e.respondWith(fetch(e.request).then(function (res) {
    if (res && res.ok && (e.request.url.indexOf(self.location.origin) === 0 || e.request.url.indexOf('fonts.') > -1)) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match('index.html'); });
  }));
});
