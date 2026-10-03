/* Wigglegram Bench service worker.
 *
 * The tool already does everything locally: decoding, aligning, encoding.
 * Caching the shell is therefore the whole offline story, with no data
 * layer to reconcile.
 *
 * TO SHIP AN UPDATE: bump VERSION. The new worker precaches the new shell,
 * deletes older caches on activate, and the page offers the user a reload.
 */
const VERSION = 'wgb-2026-10-03a';
const SHELL = 'shell-' + VERSION;
const FONTS = 'fonts-' + VERSION;

// Relative paths, so this works from a project subfolder
// (mokokocode.github.io/wigglegram/) as readily as from a domain root.
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './icon-180.png',
  './favicon-64.png'
];

const isFont = url =>
  url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(SHELL);
    // One miss must not fail the whole install, or a renamed icon would
    // leave the app with no offline copy at all.
    await Promise.all(PRECACHE.map(async p => {
      try { await c.add(new Request(p, {cache:'reload'})); }
      catch (err) { console.warn('[sw] could not precache', p, err); }
    }));
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k !== SHELL && k !== FONTS)
      .map(k => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
  })());
});

// The page asks for this when the user accepts an update.
self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

const SHARED = 'shared-inbox';

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // Share target: the OS POSTs the chosen photos here. Stash them, then
  // redirect to the app, which picks them up on load. Redirecting rather
  // than rendering keeps the POST out of the history stack.
  if (req.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const form = await req.formData();
        const files = form.getAll('frames').filter(f => f && f.size);
        const c = await caches.open(SHARED);
        const keys = await c.keys();
        await Promise.all(keys.map(k => c.delete(k)));
        await Promise.all(files.map((f, i) =>
          c.put('./shared/' + i + '/' + encodeURIComponent(f.name || ('frame' + i)),
                new Response(f, {headers:{'Content-Type': f.type || 'image/jpeg'}}))));
        return Response.redirect('./?shared=' + files.length, 303);
      } catch (err) {
        return Response.redirect('./?shared=0', 303);
      }
    })());
    return;
  }

  if (req.method !== 'GET') return;

  // Navigations: serve the cached shell first so a cold offline launch is
  // instant, and refresh it in the background for next time.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match('./index.html', {ignoreSearch:true});
      const net = (async () => {
        try {
          const pre = await e.preloadResponse;
          const res = pre || await fetch(req);
          if (res && res.ok) (await caches.open(SHELL)).put('./index.html', res.clone());
          return res;
        } catch (_) { return null; }
      })();
      if (cached) { e.waitUntil(net); return cached; }
      return (await net) || new Response(
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<body style="font:16px system-ui;padding:32px">' +
        '<h1>Offline</h1><p>Open this page once while connected and it will ' +
        'work offline from then on.</p>',
        {headers:{'Content-Type':'text/html'}, status:503});
    })());
    return;
  }

  // Webfonts: cache-first, refreshed in the background. Google serves these
  // opaquely cross-origin, which is fine to store and replay.
  if (isFont(url)) {
    e.respondWith((async () => {
      const c = await caches.open(FONTS);
      const hit = await c.match(req);
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
        return res;
      }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
    return;
  }

  // Everything else same-origin: cache, then network, then cache again.
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const hit = await caches.match(req, {ignoreSearch:true});
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && res.ok && res.type === 'basic') {
          (await caches.open(SHELL)).put(req, res.clone());
        }
        return res;
      } catch (err) {
        return Response.error();
      }
    })());
  }
});
