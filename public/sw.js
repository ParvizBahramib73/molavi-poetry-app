const CACHE_NAME = 'molavi-app-shell-v1';
const SCOPE_URL = new URL(self.registration.scope);
const APP_SHELL_URL = new URL('./', SCOPE_URL).toString();
const OFFLINE_URL = new URL('offline.html', SCOPE_URL).toString();
const STATIC_URLS = [
  APP_SHELL_URL,
  new URL('manifest.webmanifest', SCOPE_URL).toString(),
  new URL('icons/molavi.svg', SCOPE_URL).toString(),
  OFFLINE_URL,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('molavi-app-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== SCOPE_URL.origin || !requestUrl.pathname.startsWith(SCOPE_URL.pathname)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(APP_SHELL_URL, copy));
          }
          return response;
        })
        .catch(async () => (
          await caches.match(APP_SHELL_URL) ||
          await caches.match(OFFLINE_URL)
        )),
    );
    return;
  }

  const cacheableDestination = ['script', 'style', 'font', 'image'].includes(request.destination) ||
    requestUrl.pathname.endsWith('/manifest.webmanifest');
  if (!cacheableDestination) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            void cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
