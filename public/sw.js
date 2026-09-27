self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(self.registration.unregister());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.unregister());
});
