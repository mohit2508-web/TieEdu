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
// broadcast after that silently fails for this device forever. Re-subscribing
// here is what makes the endpoint self-healing instead of a one-way door.
self.addEventListener('pushsubscriptionchange', function (event) {
  // A service worker cannot read the app's access token out of React state or
  // localStorage reliably, and `/api/auth` accepts a bearer header only — there
  // is no cookie to ride along on. So this re-registers the endpoint with the
  // backend but does NOT re-point it at a user: the row stays keyed to whoever
  // subscribed originally, and the next sign-in on the app claims it. The
  // endpoint is kept valid, which is the part that actually breaks silently.
  //
  // If this ever needs to be user-attributed, the fix is a short-lived,
  // single-use claim token issued by the app — not a wider auth surface here.
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription
        ? { userVisibleOnly: true, applicationServerKey: event.oldSubscription.options && event.oldSubscription.options.applicationServerKey }
        : { userVisibleOnly: true })
      .then(function (sub) {
        return fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subscription: sub.toJSON() })
        });
      })
      .catch(function () { /* the app will re-subscribe on next enable */ })
  );
});