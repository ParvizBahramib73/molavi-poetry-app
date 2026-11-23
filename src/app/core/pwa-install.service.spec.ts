import { TestBed } from '@angular/core/testing';
import { PwaInstallService } from './pwa-install.service';

describe('PwaInstallService', () => {
  let service: PwaInstallService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PwaInstallService);
  });

  it('captures the browser install prompt and exposes the install action', () => {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    event.prompt = () => Promise.resolve();
    event.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBeTrue();
    expect(service.canInstall()).toBeTrue();
  });

  it('runs the deferred prompt and hides the action after acceptance', async () => {
    const prompt = jasmine.createSpy('prompt').and.returnValue(Promise.resolve());
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
    window.dispatchEvent(event);

    await service.promptInstall();

    expect(prompt).toHaveBeenCalled();
    expect(service.canInstall()).toBeFalse();
  });

  it('marks the app as installed after the browser confirms installation', () => {
    window.dispatchEvent(new Event('appinstalled'));

    expect(service.isInstalled()).toBeTrue();
    expect(service.canInstall()).toBeFalse();
  });
});
