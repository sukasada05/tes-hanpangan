// ============================================================
//  SERVICE WORKER - HANPANGAN PWA
//  KORAMIL 1609-05/SUKASADA
// ============================================================

const CACHE_NAME = 'hanpangan-v7';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Apply formal A4 typography to the app's print stylesheet and its
// separately generated print document in cetakJadwal().
async function applyPrintTypography(response) {
  const html = await response.text();
  const printStyles = `
    @page { size: A4; }
    @media print {
      html, body, table, td, .print-note, .signature-box {
        font-family: Arial, sans-serif !important;
        font-size: 12pt !important;
      }
      th, .kop .kodim, .kop .koramil, .judul, .signature-title {
        font-family: Arial, sans-serif !important;
        font-size: 11pt !important;
      }
    }
  `;
  const transformedHtml = html.replace(/<\/style>/gi, printStyles + '</style>');
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(transformedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// ============================================================
//  INSTALL - Cache asset utama
// ============================================================
self.addEventListener('install', function(event) {
  console.log('📦 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('📦 Cache opened');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch(function(error) {
        console.error('❌ Failed to cache assets:', error);
      })
  );
});

// ============================================================
//  ACTIVATE - Hapus cache lama
// ============================================================
self.addEventListener('activate', function(event) {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      console.log('✅ Service Worker activated successfully');
      return self.clients.claim();
    })
  );
});

// ============================================================
//  FETCH - Cache First Strategy
// ============================================================
self.addEventListener('fetch', function(event) {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isAppPage = event.request.mode === 'navigate' ||
    requestUrl.pathname.endsWith('/index.html') ||
    requestUrl.pathname.endsWith('/');

  event.respondWith(
    caches.match(event.request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          console.log('📦 Serving from cache:', event.request.url);
          return cachedResponse;
        }

        return fetch(event.request)
          .then(function(response) {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                try {
                  cache.put(event.request, responseToCache);
                  console.log('💾 Cached:', event.request.url);
                } catch (error) {
                  console.warn('⚠️ Failed to cache:', event.request.url, error);
                }
              });

            return response;
          })
          .catch(function(error) {
            console.warn('⚠️ Network request failed:', event.request.url, error);
            return new Response('Network Error', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
      .then(function(response) {
        return isAppPage && response.ok ? applyPrintTypography(response) : response;
      })
  );
});
