import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';

import { Recitation } from '../../models';
import { AudioPlayerComponent } from './audio-player.component';

/**
 * آزمون واحد برای پخش‌کنندهٔ خوانش صوتی.
 *
 * Requirements: 3.4, 3.6, 3.7
 */
describe('AudioPlayerComponent', () => {
  let fixture: ComponentFixture<AudioPlayerComponent>;
  let component: AudioPlayerComponent;

  const recitation: Recitation = {
    id: 1,
    audioTitle: 'خوانش نخست',
    audioArtist: 'استاد اول',
    mp3Url: 'https://example.com/1.mp3',
  };

  /** ساخت یک عنصر <audio> ساختگی برای تزریق از طریق ViewChild. */
  function fakeAudio(): { el: Partial<HTMLAudioElement>; loadCalls: () => number } {
    let loadCount = 0;
    const el: Partial<HTMLAudioElement> = {
      currentTime: 0,
      paused: true,
      load: () => {
        loadCount += 1;
      },
      play: () => Promise.resolve(),
      pause: () => {
        /* noop */
      },
    };
    return { el, loadCalls: () => loadCount };
  }

  function setAudioRef(el: Partial<HTMLAudioElement>): void {
    component.audioRef = new ElementRef(el as HTMLAudioElement);
  }

  function seekEvent(value: number): Event {
    return { target: { value: String(value) } } as unknown as Event;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AudioPlayerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AudioPlayerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render nothing when no recitation is provided', () => {
    component.recitation = null;
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('.player') as HTMLElement | null;
    expect(section).toBeNull();
  });

  describe('onSeek clamping (R3.4)', () => {
    it('should clamp negative seek values to 0', () => {
      const { el } = fakeAudio();
      setAudioRef(el);
      component.duration = 120;

      component.onSeek(seekEvent(-50));

      expect(component.currentTime).toBe(0);
      expect(el.currentTime).toBe(0);
    });

    it('should clamp seek values above duration to duration', () => {
      const { el } = fakeAudio();
      setAudioRef(el);
      component.duration = 120;

      component.onSeek(seekEvent(500));

      expect(component.currentTime).toBe(120);
      expect(el.currentTime).toBe(120);
    });

    it('should keep in-range seek values unchanged', () => {
      const { el } = fakeAudio();
      setAudioRef(el);
      component.duration = 120;

      component.onSeek(seekEvent(45));

      expect(component.currentTime).toBe(45);
      expect(el.currentTime).toBe(45);
    });

    it('should clamp to 0 when duration is unknown', () => {
      const { el } = fakeAudio();
      setAudioRef(el);
      component.duration = 0;

      component.onSeek(seekEvent(30));

      expect(component.currentTime).toBe(0);
      expect(el.currentTime).toBe(0);
    });
  });

  describe('error and retry (R3.6, R3.7)', () => {
    it('should auto-retry up to 3 times before setting hasError', () => {
      const { el, loadCalls } = fakeAudio();
      component.recitation = recitation;
      setAudioRef(el);

      // سه خطای متوالی باید باعث تلاش مجدد خودکار شوند، بدون نمایش خطا.
      component.onError();
      component.onError();
      component.onError();

      expect(component.hasError).toBeFalse();
      expect(loadCalls()).toBe(3);

      // چهارمین خطا تلاش‌ها را تمام‌شده اعلام می‌کند و خطا را نشان می‌دهد.
      component.onError();

      expect(component.hasError).toBeTrue();
      // تلاش مجدد دیگری انجام نمی‌شود.
      expect(loadCalls()).toBe(3);
    });

    it('should reset the retry counter after a successful canplay', () => {
      const { el, loadCalls } = fakeAudio();
      component.recitation = recitation;
      setAudioRef(el);

      component.onError();
      component.onError();
      // بارگذاری موفق، شمارنده را بازنشانی می‌کند.
      component.onCanPlay();

      component.onError();
      component.onError();
      component.onError();
      expect(component.hasError).toBeFalse();
      // مجموع تلاش‌ها: ۲ + ۳ = ۵
      expect(loadCalls()).toBe(5);

      component.onError();
      expect(component.hasError).toBeTrue();
    });

    it('should clear the error and retry on manual retry (R3.7)', () => {
      const { el } = fakeAudio();
      component.recitation = recitation;
      setAudioRef(el);

      // تسلیم پس از چهار خطا.
      component.onError();
      component.onError();
      component.onError();
      component.onError();
      expect(component.hasError).toBeTrue();

      component.onManualRetry();

      expect(component.hasError).toBeFalse();

      // پس از تلاش دستی، چرخهٔ سه‌بارهٔ تلاش خودکار دوباره در دسترس است.
      component.onError();
      component.onError();
      component.onError();
      expect(component.hasError).toBeFalse();
      component.onError();
      expect(component.hasError).toBeTrue();
    });

    it('should render the error state in the template after giving up', () => {
      const { el } = fakeAudio();
      component.recitation = recitation;
      setAudioRef(el);

      component.onError();
      component.onError();
      component.onError();
      component.onError();
      fixture.detectChanges();

      const error = fixture.nativeElement.querySelector('.error__message') as HTMLElement;
      expect(error).toBeTruthy();
      expect(error.textContent?.trim()).toBe('پخش این خوانش صوتی ناموفق بود.');
    });
  });
});
