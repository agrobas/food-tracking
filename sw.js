/* Food tracking service worker: works offline, picks up new versions when online.
   The label reader (vendor/) lives in its own cache so app updates don't download it again. */
var CACHE = 'ft-v1.6.0';
var VENDOR = 'ft-vendor-v1';
var FILES = ['./', 'index.html', 'css/app.css', 'js/foods.js', 'js/core.js', 'js/app.js', 'js/ocr.js', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== VENDOR; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = e.request.url;
  if (url.indexOf('/vendor/') > -1) {
    // big, versioned files: cache first
    e.respondWith(caches.open(VENDOR).then(function (c) {
      return c.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (res) { if (res && res.ok) c.put(e.request, res.clone()); return res; });
      });
    }));
    return;
  }
  // app files: network first, so updates arrive; cached copy when offline
  e.respondWith(fetch(e.request).then(function (res) {
    if (res && res.ok && (url.indexOf(self.location.origin) === 0 || url.indexOf('fonts.') > -1)) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match('index.html'); });
  }));
});
