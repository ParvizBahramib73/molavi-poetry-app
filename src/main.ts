import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

function registerServiceWorker(): void {
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
