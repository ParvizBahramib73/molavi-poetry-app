import { Injectable, signal } from '@angular/core';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  readonly canInstall = signal(false);
  readonly isInstalled = signal(false);

  private deferredPrompt: InstallPromptEvent | null = null;

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    this.isInstalled.set(
      window.matchMedia?.('(display-mode: standalone)').matches ?? false,
    );

    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event as InstallPromptEvent;
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
    });
  }

  async promptInstall(): Promise<void> {
    const prompt = this.deferredPrompt;
    if (!prompt) {
      return;
    }

    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === 'accepted') {
      this.deferredPrompt = null;
      this.canInstall.set(false);
    }
  }
}
