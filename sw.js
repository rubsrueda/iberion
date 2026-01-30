// Service Worker v1738165000 - Forzar actualización
self.addEventListener('install', (e) => {
    console.log('SW instalando v1738165000');
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    console.log('SW activando v1738165000');
    // Limpiar todos los caches
    e.waitUntil(
        caches.keys().then(names => {
            return Promise.all(
                names.map(name => caches.delete(name))
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // NO cachear - siempre fetch desde red
    e.respondWith(
        fetch(e.request, { cache: 'no-store' })
            .catch(() => fetch(e.request))
    );
});