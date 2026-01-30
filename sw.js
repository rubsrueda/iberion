// Service Worker con versión dinámica - Iberion
const CACHE_VERSION = 'iberion-v1.007'; // Se actualiza automáticamente con ./version
const FORCE_UPDATE = true; // Cambiar a false en producción

self.addEventListener('install', (e) => {
    console.log(`🔧 SW instalando: ${CACHE_VERSION}`);
    // Forzar actualización inmediata
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    console.log(`✅ SW activando: ${CACHE_VERSION}`);
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Eliminar TODOS los cachés anteriores
                    if (cacheName !== CACHE_VERSION) {
                        console.log(`🗑️  Eliminando caché antigua: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('🎯 Tomando control de todos los clientes');
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (e) => {
    // En desarrollo: NO cachear nada, siempre desde red
    if (FORCE_UPDATE) {
        e.respondWith(
            fetch(e.request, { 
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
            }).catch(err => {
                console.error('Error fetch:', err);
                return new Response('Offline', { status: 503 });
            })
        );
    } else {
        // En producción: Network first, fallback a caché
        e.respondWith(
            fetch(e.request)
                .then(response => {
                    // Clonar respuesta para guardar en caché
                    const responseClone = response.clone();
                    caches.open(CACHE_VERSION).then(cache => {
                        cache.put(e.request, responseClone);
                    });
                    return response;
                })
                .catch(() => caches.match(e.request))
        );
    }
});

// Escuchar mensajes para forzar actualización
self.addEventListener('message', (e) => {
    if (e.data === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (e.data === 'CLEAR_CACHE') {
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
    }
});