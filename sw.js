// ============================================================
//  SERVICE WORKER - HANPANGAN PWA
//  KORAMIL 1609-05/SUKASADA
// ============================================================

const CACHE_NAME = 'hanpangan-v5';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Tambahkan catatan dan area tanda tangan di bagian akhir dokumen cetak.
async function addPrintSignature(response) {
  const html = await response.text();
  const signatureBlock = `</table>
<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-top:24px;break-inside:avoid;page-break-inside:avoid;color:#000;font-family:Arial,sans-serif;font-size:10pt;">
  <div style="font-weight:bold;">Catatan : Jadwal Ini sewaktu waktu bisa berubah</div>
  <div style="min-width:220px;text-align:center;">
    <div style="font-weight:bold;text-transform:uppercase;">TANDA TANGAN</div>
    <div style="height:80px;"></div>
    <div style="width:180px;margin:0 auto;border-top:1px solid #000;"></div>
  </div>
</div>
</table>`;
  const transformedHtml = html.replace(/<\/table>(\s*)<\/body>(\s*)<\/html>/i, signatureBlock + '$1</body>$2</html>');
  return new Response(transformedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
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

  event.respondWith(
    caches.match(event.request)
      .then(function(cachedResponse) {
        const responsePromise = cachedResponse
          ? Promise.resolve(cachedResponse)
          : fetch(event.request).then(function(response) {
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              const responseToCache = response.clone();
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
            });

        return responsePromise.then(function(response) {
          const isAppPage = event.request.mode === 'navigate' ||
            new URL(event.request.url).pathname.endsWith('/index.html');
          return isAppPage ? addPrintSignature(response) : response;
        }).catch(function(error) {
          console.warn('⚠️ Network request failed:', event.request.url, error);
          return new Response('Network Error', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
