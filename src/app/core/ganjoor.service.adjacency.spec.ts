/**
 * آزمون واحد برای افزوده‌های پخش‌کنندهٔ استوری‌وار در {@link GanjoorService}:
 * - `getPoemByUrl(url)`: ارسال GET به `/api/ganjoor/poem` با پارامتر `url`
 *   محدودشده به دامنهٔ مولوی و نگاشت پاسخ به مدل داخلی.
 * - نگاشت مجاورت (`previous`/`next`) در `mapPoem` و مقدار پیش‌فرض `null` در
 *   نبودِ این فیلدها.
 *
 * Requirements: 2.1, 6.1, 6.4
 */

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Poem } from '../models';
import { GanjoorService } from './ganjoor.service';

describe('GanjoorService — getPoemByUrl و مجاورت اشعار', () => {
  let service: GanjoorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GanjoorService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(GanjoorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getPoemByUrl(url)', () => {
    it('GET را به /api/ganjoor/poem با پارامتر url محدودشده به مولوی می‌فرستد و شعر را نگاشت می‌کند', () => {
      let result: Poem | undefined;
      service
        .getPoemByUrl('/moulavi/masnavi/daftar1/sh1')
        .subscribe((poem) => (result = poem));

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.includes('/api/ganjoor/poem'),
      );
      expect(req.request.url).toContain('https://api.ganjoor.net');
      expect(req.request.url).toContain('/api/ganjoor/poem');
      // پارامتر url باید موجود و محدود به دامنهٔ مولوی باشد.
      expect(req.request.url).toContain('url=');
      expect(decodeURIComponent(req.request.url)).toContain(
        '/moulavi/masnavi/daftar1/sh1',
      );

      req.flush({
        id: 3526,
        title: 'بخش ۱ - سرآغاز',
        fullTitle: 'مولوی > مثنوی > دفتر اول > بخش ۱',
        fullUrl: '/moulavi/masnavi/daftar1/sh1',
        verses: [
          { vOrder: 1, text: 'بشنو این نی چون شکایت می‌کند', versePosition: 'RIGHT' },
          { vOrder: 2, text: 'از جدایی‌ها حکایت می‌کند', versePosition: 'LEFT' },
        ],
        recitations: [
          { id: 1, audioTitle: 'خوانش', audioArtist: 'هنرمند', mp3Url: 'https://x/1.mp3' },
        ],
        translations: [],
        next: { id: 3527, title: 'بخش ۲' },
      });

      expect(result).toBeDefined();
      expect(result!.id).toBe(3526);
      expect(result!.verses.map((v) => v.text)).toEqual([
        'بشنو این نی چون شکایت می‌کند',
        'از جدایی‌ها حکایت می‌کند',
      ]);
      expect(result!.recitations.length).toBe(1);
      expect(result!.nextPoem).toEqual({ id: 3527, title: 'بخش ۲' });
      expect(result!.prevPoem).toBeNull();
    });
  });

  describe('نگاشت مجاورت در getPoem', () => {
    it('previous/next را به prevPoem/nextPoem نگاشت می‌کند', () => {
      let result: Poem | undefined;
      service.getPoem(8).subscribe((poem) => (result = poem));

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.includes('/api/ganjoor/poem/8'),
      );

      req.flush({
        id: 8,
        title: 'شعر میانی',
        fullUrl: '/moulavi/masnavi/daftar1/sh8',
        verses: [{ vOrder: 1, text: 'بیت', versePosition: 'RIGHT' }],
        recitations: [],
        translations: [],
        previous: { id: 7, title: 'بخش ۷' },
        next: { id: 9, title: 'بخش ۹' },
      });

      expect(result!.prevPoem).toEqual({ id: 7, title: 'بخش ۷' });
      expect(result!.nextPoem).toEqual({ id: 9, title: 'بخش ۹' });
    });

    it('در نبودِ previous/next یا شناسهٔ صفر، مقدار null می‌گذارد', () => {
      let result: Poem | undefined;
      service.getPoem(1).subscribe((poem) => (result = poem));

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.includes('/api/ganjoor/poem/1'),
      );

      req.flush({
        id: 1,
        title: 'نخستین شعر',
        fullUrl: '/moulavi/masnavi/daftar1/sh1',
        verses: [{ vOrder: 1, text: 'بیت', versePosition: 'RIGHT' }],
        recitations: [],
        translations: [],
        // previous با شناسهٔ صفر → null؛ next غایب → null.
        previous: { id: 0, title: '' },
      });

      expect(result!.prevPoem).toBeNull();
      expect(result!.nextPoem).toBeNull();
    });
  });
});
