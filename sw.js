self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // Solo para permitir la instalación
    e.respondWith(fetch(e.request));
});