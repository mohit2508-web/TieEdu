// Frontend SW push handlers.
//
// Plain JavaScript, deliberately. This file lives in `public/`, which the build
// pipeline copies verbatim — nothing transpiles it, so TypeScript annotations
// here are not stripped, they are a syntax error the browser refuses to parse.
// `importScripts` fails, `push` never gets a listener, and every push the backend
// sends is silently dropped with no error anywhere to find it by.
//
// Loaded from sw.js via `importScripts`, so `self` is the service worker global.

self.addEventListener('push', function (event) {
  var data = {};
  try {
    data = (event.data && event.data.json()) || {};
  } catch (e) {
    data = { title: 'TieEdu', body: (event.data && event.data.text()) || '' };
  }

  var options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    // A second broadcast arriving while the first is on screen must not stack up
    // silently: the newest one replaces it in place. Without `renotify` the OS
    // would replace the text and still play the old alert tone, or stay silent
    // for something the user was not looking at.
    renotify: true,
    tag: 'tieedu-notif'
  };

  event.waitUntil(self.registration.showNotification(data.title || 'TieEdu', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clients) {
      // Focus an existing tab first: opening a second copy of a PWA is how a
      // student ends up with three of the same course open.
      for (var i = 0; i < clients.length; i++) {
        var c = clients[i];
        if (c.url === url && 'focus' in c) return c.focus();
      }
      // Fall back to reusing any window, so a notification tapped from a cold
      // closed app still lands in the app rather than nowhere.
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});

// The browser can drop a push endpoint (endpoint rotation, storage pressure).
// Without this, the subscription sitting in our database is dead and every
// broadcast after that silently fails for this device forever.
//
// This handler deliberately does NOT call the API. It used to, and it could
// never have worked: a service worker has no access token, `/api/notifications/
// subscribe` is bearer-only, and `credentials: 'include'` rides on cookies that
// do not exist here. So the fetch was guaranteed to 401 while looking like a
// repair — the most expensive kind of bug, because it reads as handled.
//
// What the worker *can* do is tell the page. The page has a token and can read
// the browser's current subscription, which is the new endpoint after a
// rotation. It re-registers on load regardless, so a rotation that happens while
// no tab is open is repaired on the next visit rather than never.
self.addEventListener('pushsubscriptionchange', function (event) {
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (clients) {
        for (var i = 0; i < clients.length; i++) {
          clients[i].postMessage({ type: 'RESUBSCRIBE' });
        }
      })
      .catch(function () {
        /* no open tab: the next page load re-registers the current endpoint */
      })
  );
});