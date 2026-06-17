/**
 * آزمون افزوده‌های پخش‌کنندهٔ استوری‌وار {@link ImmersivePlayerComponent}:
 * - بارگذاری شعر پیش‌فرض هنگام نبودِ id (فراخوانی getPoemByUrl).
 * - تعویض خوانش (به‌روزرسانی خوانش فعال و منبع <audio>).
 * - ناوبری سوایپ بین اشعار (router.navigate با شناسهٔ شعر بعدی/پیشین).
 *
 * این فایل از یک spy گسترده‌تر (دارای getPoem و getPoemByUrl) استفاده می‌کند تا
 * مسیر شعر پیش‌فرض را هم پوشش دهد؛ آزمون موجود (مسیر id) دست‌نخورده می‌ماند.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ElementRef } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { GanjoorService } from '../../core/ganjoor.service';
import { Poem, Recitation } from '../../models';
import { ImmersivePlayerComponent } from './immersive-player.component';

const recA: Recitation = {
  id: 1,
  audioTitle: 'خوانش الف',
  audioArtist: 'استاد اول',
  mp3Url: 'https://example.com/a.mp3',
};

const recB: Recitation = {
  id: 2,
  audioTitle: 'خوانش ب',
  audioArtist: 'استاد دوم',
  mp3Url: 'https://example.com/b.mp3',
};

function makePoem(overrides: Partial<Poem> = {}): Poem {
  return {
    id: 8,
    title: 'بشنو این نی',
    fullTitle: 'مولوی > مثنوی > دفتر اول > بخش ۱',
    fullUrl: '/moulavi/masnavi/daftar1/sh1',
    verses: [
      { vOrder: 1, text: 'بشنو این نی چون شکایت می‌کند', position: 'RIGHT' },
      { vOrder: 2, text: 'از جدایی‌ها حکایت می‌کند', position: 'LEFT' },
    ],
    recitations: [recA, recB],
    translations: [],
    prevPoem: { id: 7, title: 'بخش پیشین' },
    nextPoem: { id: 9, title: 'بخش بعدی' },
    ...overrides,
  };
}

describe('ImmersivePlayerComponent — استوری‌وار (پیش‌فرض/خوانش/سوایپ)', () => {
  let fixture: ComponentFixture<ImmersivePlayerComponent>;
  let component: ImmersivePlayerComponent;
  let ganjoorSpy: jasmine.SpyObj<GanjoorService>;

  beforeEach(async () => {
    ganjoorSpy = jasmine.createSpyObj<GanjoorService>('GanjoorService', [
      'getPoem',
      'getPoemByUrl',
      'getPoet',
      'getCategory',
    ]);

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

  it('هنگام نبودِ id، شعر پیش‌فرض «بشنو از نی» را با getPoemByUrl بارگذاری می‌کند', () => {
    ganjoorSpy.getPoemByUrl.and.returnValue(of(makePoem()));

    // بدون تنظیم id → ngOnInit باید مسیر URL را بزند.
    fixture.detectChanges();

    expect(ganjoorSpy.getPoemByUrl).toHaveBeenCalledOnceWith(
      '/moulavi/masnavi/daftar1/sh1',
    );
    expect(ganjoorSpy.getPoem).not.toHaveBeenCalled();
    expect(component.poem).toBeTruthy();
    expect(component.recitation).toEqual(recA);
  });

  it('با تنظیم id، شعر پیش‌فرض را بارگذاری نمی‌کند (مسیر موجود حفظ می‌شود)', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));

    component.id = '8';
    fixture.detectChanges();

    expect(ganjoorSpy.getPoem).toHaveBeenCalledOnceWith(8);
    expect(ganjoorSpy.getPoemByUrl).not.toHaveBeenCalled();
  });

  it('تعویض خوانش، خوانش فعال و منبع <audio> را به‌روزرسانی می‌کند', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));
    component.id = '8';
    fixture.detectChanges();

    // خوانش پیش‌فرض اولین مورد است.
    expect(component.recitation).toEqual(recA);
    let audioEl = fixture.nativeElement.querySelector(
      'audio',
    ) as HTMLAudioElement;
    expect(audioEl.getAttribute('src')).toBe(recA.mp3Url);

    // تعویض به خوانش دوم.
    component.selectRecitation(recB);
    fixture.detectChanges();

    expect(component.recitation).toEqual(recB);
    expect(component.currentTime).toBe(0);
    audioEl = fixture.nativeElement.querySelector('audio') as HTMLAudioElement;
    expect(audioEl.getAttribute('src')).toBe(recB.mp3Url);
  });

  it('سوایپ/شِوْرون به شعر بعدی، با شناسهٔ مجاورِ بعدی ناوبری می‌کند', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));
    component.id = '8';
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate').and.resolveTo(true);

    component.goNextPoem();
    expect(navSpy).toHaveBeenCalledWith(['/poem', 9, 'listen']);

    component.goPrevPoem();
    expect(navSpy).toHaveBeenCalledWith(['/poem', 7, 'listen']);
  });

  it('وقتی مجاورت وجود ندارد، سوایپ ناوبری نمی‌کند', () => {
    ganjoorSpy.getPoem.and.returnValue(
      of(makePoem({ prevPoem: null, nextPoem: null })),
    );
    component.id = '8';
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate').and.resolveTo(true);

    component.goNextPoem();
    component.goPrevPoem();
    expect(navSpy).not.toHaveBeenCalled();
  });

  it('سوایپ افقی (pointer) به چپ، به شعر بعدی می‌رود', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));
    component.id = '8';
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navSpy = spyOn(router, 'navigate').and.resolveTo(true);

    component.onPointerDown({ clientX: 300, clientY: 200 } as PointerEvent);
    component.onPointerUp({ clientX: 200, clientY: 205 } as PointerEvent);

    expect(navSpy).toHaveBeenCalledWith(['/poem', 9, 'listen']);
  });
});
