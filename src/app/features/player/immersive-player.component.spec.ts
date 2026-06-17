import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { GanjoorService } from '../../core/ganjoor.service';
import { GanjoorApiError, Poem, Recitation } from '../../models';
import { ImmersivePlayerComponent } from './immersive-player.component';

/** خوانش صوتی آزمونی. */
const recitation: Recitation = {
  id: 1,
  audioTitle: 'خوانش نخست',
  audioArtist: 'استاد اول',
  mp3Url: 'https://example.com/1.mp3',
};

/** نمونهٔ شعر آزمونی. */
function makePoem(overrides: Partial<Poem> = {}): Poem {
  return {
    id: 8,
    title: 'بشنو این نی',
    fullTitle: 'مولوی > مثنوی > دفتر اول > بخش ۱',
    fullUrl: '/moulavi/masnavi/daftar1/sh1',
    verses: [
      { vOrder: 1, text: 'بشنو این نی چون شکایت می‌کند', position: 'RIGHT' },
      { vOrder: 2, text: 'از جدایی‌ها حکایت می‌کند', position: 'LEFT' },
      { vOrder: 3, text: 'کز نیستان تا مرا ببریده‌اند', position: 'RIGHT' },
    ],
    recitations: [recitation],
    translations: [],
    ...overrides,
  };
}

const apiError: GanjoorApiError = {
  kind: 'network',
  messageFa: 'خطای شبکه رخ داد.',
};

/** ساخت یک عنصر <audio> ساختگی. */
function fakeAudio(): Partial<HTMLAudioElement> {
  return {
    currentTime: 0,
    duration: 120,
    paused: true,
    playbackRate: 1,
    load: () => {
      /* noop */
    },
    play: () => Promise.resolve(),
    pause: () => {
      /* noop */
    },
  };
}

describe('ImmersivePlayerComponent', () => {
  let fixture: ComponentFixture<ImmersivePlayerComponent>;
  let component: ImmersivePlayerComponent;
  let ganjoorSpy: jasmine.SpyObj<GanjoorService>;

  beforeEach(async () => {
    ganjoorSpy = jasmine.createSpyObj<GanjoorService>('GanjoorService', [
      'getPoem',
      'getRecitationSync',
    ]);
    ganjoorSpy.getRecitationSync.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ImmersivePlayerComponent],
      providers: [
        provideRouter([]),
        { provide: GanjoorService, useValue: ganjoorSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImmersivePlayerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch the poem when the id input is set', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));

    component.id = '8';
    fixture.detectChanges();

    expect(ganjoorSpy.getPoem).toHaveBeenCalledOnceWith(8);
  });

  it('should render every non-empty verse', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));

    component.id = '8';
    fixture.detectChanges();

    const verses = fixture.nativeElement.querySelectorAll('.player__verse');
    expect(verses.length).toBe(3);
    expect((verses[0] as HTMLElement).textContent?.trim()).toBe(
      'بشنو این نی چون شکایت می‌کند',
    );
  });

  it('should set dir="rtl" on the root element', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));

    component.id = '8';
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('.player') as HTMLElement;
    expect(root.getAttribute('dir')).toBe('rtl');
  });

  it('should mark the active verse after a simulated timeupdate', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));

    component.id = '8';
    fixture.detectChanges();

    // عنصر صوت ساختگی با مدت‌زمان مشخص.
    const audio = fakeAudio();
    component.audioRef = new ElementRef(audio as HTMLAudioElement);
    component.onLoadedMetadata();

    // پرش زمان به انتهای خوانش → باید بیت آخر فعال شود.
    (audio as { currentTime: number }).currentTime = 119;
    component.onTimeUpdate();
    fixture.detectChanges();

    const verses = fixture.nativeElement.querySelectorAll('.player__verse');
    const active = fixture.nativeElement.querySelectorAll(
      '.player__verse--active',
    );
    expect(active.length).toBe(1);
    expect(component.currentVerseIndex).toBe(2);
    expect(
      (verses[2] as HTMLElement).classList.contains('player__verse--active'),
    ).toBeTrue();
  });

  it('should toggle play/pause via the audio element', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));
    component.id = '8';
    fixture.detectChanges();

    const playSpy = jasmine
      .createSpy('play')
      .and.returnValue(Promise.resolve());
    const pauseSpy = jasmine.createSpy('pause');
    const audio = {
      ...fakeAudio(),
      paused: true,
      play: playSpy,
      pause: pauseSpy,
    };
    component.audioRef = new ElementRef(audio as unknown as HTMLAudioElement);

    // در حالت paused → باید play فراخوانی شود.
    audio.paused = true;
    component.togglePlay();
    expect(playSpy).toHaveBeenCalled();

    // در حالت در حال پخش → باید pause فراخوانی شود.
    audio.paused = false;
    component.togglePlay();
    expect(pauseSpy).toHaveBeenCalled();
  });

  it('should reflect play/pause state from audio events', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));
    component.id = '8';
    fixture.detectChanges();

    component.onPlay();
    expect(component.isPlaying).toBeTrue();
    component.onPause();
    expect(component.isPlaying).toBeFalse();
  });

  it('should set the audio playbackRate when speed changes', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));
    component.id = '8';
    fixture.detectChanges();

    const audio = fakeAudio();
    component.audioRef = new ElementRef(audio as HTMLAudioElement);

    const event = {
      target: { value: '1.5' },
    } as unknown as Event;
    component.onSpeedChange(event);

    expect(component.playbackRate).toBe(1.5);
    expect(audio.playbackRate).toBe(1.5);
  });

  it('should seek to a verse start time when a verse is tapped', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));
    component.id = '8';
    fixture.detectChanges();

    const audio = fakeAudio();
    component.audioRef = new ElementRef(audio as HTMLAudioElement);
    component.onLoadedMetadata();

    component.seekToVerse(2);

    expect(component.currentTime).toBe(component.timings[2]);
    expect(audio.currentTime).toBe(component.timings[2]);
  });

  it('should clamp seek values to the [0, duration] range', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));
    component.id = '8';
    fixture.detectChanges();

    const audio = fakeAudio();
    component.audioRef = new ElementRef(audio as HTMLAudioElement);
    component.onLoadedMetadata();

    component.onSeek({ target: { value: '9999' } } as unknown as Event);
    expect(component.currentTime).toBe(120);

    component.onSeek({ target: { value: '-50' } } as unknown as Event);
    expect(component.currentTime).toBe(0);
  });

  it('should toggle the bookmark state', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));
    component.id = '8';
    fixture.detectChanges();

    expect(component.bookmarked).toBeFalse();
    const btn = fixture.nativeElement.querySelector(
      '.player__bookmark',
    ) as HTMLButtonElement;
    btn.click();
    fixture.detectChanges();

    expect(component.bookmarked).toBeTrue();
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('should show the Persian empty message and still render verses when no recitation', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem({ recitations: [] })));

    component.id = '8';
    fixture.detectChanges();

    expect(component.recitation).toBeNull();
    const message = fixture.nativeElement.querySelector(
      '.empty__message',
    ) as HTMLElement;
    expect(message.textContent?.trim()).toBe(
      'خوانش صوتی برای این شعر موجود نیست',
    );
    // متن همچنان رندر می‌شود.
    const verses = fixture.nativeElement.querySelectorAll('.player__verse');
    expect(verses.length).toBe(3);
    // نوار کنترل پخش نمایش داده نمی‌شود.
    expect(fixture.nativeElement.querySelector('.player__bar')).toBeNull();
  });

  it('should show a loading indicator while fetching', () => {
    ganjoorSpy.getPoem.and.returnValue(throwError(() => apiError));
    component.id = '8';
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.error__message')?.textContent?.trim(),
    ).toBe(apiError.messageFa);
  });

  it('should re-invoke getPoem on retry', () => {
    ganjoorSpy.getPoem.and.returnValue(throwError(() => apiError));
    component.id = '8';
    fixture.detectChanges();

    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));
    component.reload();
    fixture.detectChanges();

    expect(ganjoorSpy.getPoem).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelector('.error__message')).toBeNull();
  });
});
