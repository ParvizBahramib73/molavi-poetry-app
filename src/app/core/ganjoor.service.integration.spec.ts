/**
 * آزمون integration برای {@link GanjoorService} با mock در سطح شبکه.
 *
 * این آزمون با استفاده از `TestBed` به‌همراه `provideHttpClient()` و
 * `provideHttpClientTesting()` (معادل `HttpClientTestingModule` در Angular)
 * و `HttpTestingController`، جریان واقعی واکشی داده از endpointهای گنجور را
 * تأیید می‌کند: ساخت نشانی درست (`api.ganjoor.net` + مسیر مورد انتظار، و
 * تنظیم `poetId=5` در جست‌وجو)، flush پاسخ‌های mock، و نگاشت پاسخ خام به
 * مدل‌های داخلی برنامه (مرتب‌سازی ابیات بر اساس vOrder و حذف خوانش‌های فاقد
 * mp3Url).
 *
 * Requirements: 6.1, 7.4
 */

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Poem, Poet, SearchResultPage } from '../models';
import { GanjoorService } from './ganjoor.service';

describe('GanjoorService (integration / network-level mock)', () => {
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
    // تضمین این‌که هیچ درخواست HTTP پیش‌بینی‌نشده‌ای باقی نمانده است.
    httpMock.verify();
  });

  describe('getPoet()', () => {
    it('درخواست را به endpoint شاعرِ مولوی در api.ganjoor.net می‌فرستد و پاسخ را به مدل داخلی نگاشت می‌کند', () => {
      let result: Poet | undefined;
      service.getPoet().subscribe((poet) => (result = poet));

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.includes('/api/ganjoor/poet/5'),
      );
      expect(req.request.url).toContain('https://api.ganjoor.net');
      expect(req.request.url).toContain('/api/ganjoor/poet/5');

      req.flush({
        poet: { id: 5, name: 'مولوی', fullUrl: '/moulavi' },
        cat: {
          id: 100,
          title: 'مولوی',
          fullUrl: '/moulavi',
          parentId: null,
          children: [
            { id: 101, title: 'مثنوی معنوی', fullUrl: '/moulavi/masnavi' },
            // آیتم خارج از دامنه باید توسط scopeResults حذف شود.
            { id: 999, title: 'دیگر', fullUrl: '/hafez/ghazal' },
          ],
          poems: [],
        },
      });

      expect(result).toBeDefined();
      expect(result!.id).toBe(5);
      expect(result!.name).toBe('مولوی');
      expect(result!.urlSlug).toBe('moulavi');
      // تنها زیردستهٔ متعلق به مولوی باید باقی بماند.
      expect(result!.rootCategory.children.length).toBe(1);
      expect(result!.rootCategory.children[0].id).toBe(101);
    });
  });

  describe('getPoem(id)', () => {
    it('درخواست را به endpoint شعر می‌فرستد، ابیات را بر اساس vOrder مرتب می‌کند و خوانش‌های فاقد mp3Url را حذف می‌کند', () => {
      const poemId = 8;
      let result: Poem | undefined;
      service.getPoem(poemId).subscribe((poem) => (result = poem));

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.includes(`/api/ganjoor/poem/${poemId}`),
      );
      expect(req.request.url).toContain('https://api.ganjoor.net');
      expect(req.request.url).toContain(`/api/ganjoor/poem/${poemId}`);

      req.flush({
        id: poemId,
        title: 'شعر نمونه',
        fullTitle: 'مولوی > مثنوی > دفتر اول',
        fullUrl: '/moulavi/masnavi/daftar1/sh1',
        // ابیات به‌صورت نامرتب ارائه شده‌اند تا مرتب‌سازی بررسی شود.
        verses: [
          { vOrder: 3, text: 'بیت سوم', versePosition: 'RIGHT' },
          { vOrder: 1, text: 'بیت اول', versePosition: 'RIGHT' },
          { vOrder: 2, text: 'بیت دوم', versePosition: 'LEFT' },
        ],
        recitations: [
          { id: 1, audioTitle: 'خوانش یک', audioArtist: 'هنرمند', mp3Url: 'https://x/1.mp3' },
          // فاقد mp3Url → باید حذف شود.
          { id: 2, audioTitle: 'خوانش دو', audioArtist: 'هنرمند', mp3Url: null },
          { id: 3, audioTitle: 'خوانش سه', audioArtist: 'هنرمند', mp3Url: '' },
        ],
        translations: [],
      });

      expect(result).toBeDefined();
      // ابیات باید بر اساس vOrder صعودی مرتب باشند و هیچ بیتی حذف/اضافه نشود.
      expect(result!.verses.map((v) => v.vOrder)).toEqual([1, 2, 3]);
      expect(result!.verses.map((v) => v.text)).toEqual([
        'بیت اول',
        'بیت دوم',
        'بیت سوم',
      ]);
      // تنها خوانش دارای mp3Url معتبر باید باقی بماند.
      expect(result!.recitations.length).toBe(1);
      expect(result!.recitations[0].id).toBe(1);
      expect(result!.recitations[0].mp3Url).toBe('https://x/1.mp3');
    });
  });

  describe('searchPoems(term, page)', () => {
    it('درخواست جست‌وجو را با poetId=5 می‌سازد و نتایج را به مولوی محدود می‌کند', () => {
      let result: SearchResultPage | undefined;
      service.searchPoems('عشق', 1).subscribe((page) => (result = page));

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.includes('/api/ganjoor/poems/search'),
      );
      expect(req.request.url).toContain('https://api.ganjoor.net');
      // محدودسازی قطعی دامنه به مولوی.
      expect(req.request.url).toContain('poetId=5');
      expect(req.request.url).toContain('term=');

      req.flush([
        { id: 11, title: 'نتیجهٔ مولوی', fullUrl: '/moulavi/masnavi/daftar1/sh1' },
        // نتیجهٔ خارج از دامنه باید حذف شود (تضمین مضاعف علاوه بر poetId=5).
        { id: 22, title: 'نتیجهٔ غیرمولوی', fullUrl: '/saadi/boostan/sh1' },
      ]);

      expect(result).toBeDefined();
      expect(result!.term).toBe('عشق');
      expect(result!.pageNumber).toBe(1);
      expect(result!.results.length).toBe(1);
      expect(result!.results[0].id).toBe(11);
    });
  });
});
