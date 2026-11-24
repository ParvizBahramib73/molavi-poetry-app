import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

function registerServiceWorker(): void {
  // The Capacitor Android shell bundles the Angular files with the APK.
  // Registering the web PWA service worker on its local origin could leave
  // stale pages after an APK update, so only register it in the browser.
  const nativeBridge = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  if (nativeBridge?.isNativePlatform?.()) {
    return;
  }

  if (!('serviceWorker' in navigator)) {
    return;
  }

  const isSecureContext =
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';

  if (!isSecureContext) {
    return;
  }

  const baseUrl = new URL('.', document.baseURI);
  const workerUrl = new URL('sw.js', baseUrl);

  void navigator.serviceWorker
    .register(workerUrl.toString(), { scope: baseUrl.pathname })
    .catch((error: unknown) => {
      console.warn('Molavi service worker registration failed.', error);
    });
}

bootstrapApplication(App, appConfig)
  .then(() => registerServiceWorker())
  .catch((err) => console.error(err));
