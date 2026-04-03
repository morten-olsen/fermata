/**
 * Register the OPFS service worker on web.
 * Call this once during app initialization, before any OPFS URLs are rendered.
 *
 * No-op on native (service workers don't exist there).
 */
export async function registerOpfsServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/opfs-sw.js');

    // Wait for the service worker to be active before proceeding,
    // so /_opfs/ URLs work immediately after registration.
    if (registration.installing || registration.waiting) {
      await new Promise<void>((resolve) => {
        const sw = registration.installing ?? registration.waiting;
        if (!sw) { resolve(); return; }
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') resolve();
        });
        // Safety timeout — don't block app init forever
        setTimeout(resolve, 3000);
      });
    }
  } catch (e) {
    // Service worker registration failed — OPFS URLs won't work,
    // but the app can still function with remote URLs.
    console.warn('OPFS service worker registration failed:', e);
  }
}
