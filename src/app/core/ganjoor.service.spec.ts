/**
 * آزمون واحد متمرکز برای {@link GanjoorService} با mock در سطح شبکه.
 *
 * این آزمون مکملِ {@link ./ganjoor.service.integration.spec.ts} است: آزمون
 * integration متدهای `getPoet`/`getPoem`/`searchPoems` را پوشش می‌دهد و این
 * فایل تنها متدهایی را آزمون می‌کند که در آنجا به‌صورت عمیق بررسی نشده‌اند:
 * `getCategory(catId)`، `getRecitations(poemId)` و `getTranslationLanguages()`.
 *
 * برای هر متد بررسی می‌شود که:
 * - درخواست `GET` به نشانیِ مورد انتظار روی `api.ganjoor.net` ارسال شود
 *   (صحت endpoint و پارامترها).
 * - پاسخ خام (mock JSON) به مدل داخلی برنامه نگاشت شود (محدودسازی دامنه به
 *   مولوی در `getCategory`، حذف خوانش‌های فاقد `mp3Url` در `getRecitations`،
 *   و نگاشت `id/name/code` در `getTranslationLanguages`).
 *
 * Requirements: 6.1, 6.4, 5.1
 */

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Category, Language, Recitation } from '../models';
import { GanjoorService } from './ganjoor.service';

describe('GanjoorService (unit / network-level mock)', () => {
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

  describe('getCategory(catId)', () => {
    it('درخواست را به endpoint دستهٔ گنجور با poems=true می‌فرستد و زیردسته‌ها/شعرها را به مولوی محدود می‌کند', () => {
      const catId = 101;
      let result: Category | undefined;
      service.getCategory(catId).subscribe((cat) => (result = cat));

      const req = httpMock.expectOne(
        (r) =>
          r.method === 'GET' && r.url.includes(`/api/ganjoor/cat/${catId}`),
      );
      expect(req.request.url).toContain('https://api.ganjoor.net');
      expect(req.request.url).toContain(`/api/ganjoor/cat/${catId}`);
      // پارامتر poems=true باید روی نشانی تنظیم شده باشد.
      expect(req.request.url).toContain('poems=true');

      req.flush({
        cat: {
          id: catId,
          title: 'مثنوی معنوی',
          fullUrl: '/moulavi/masnavi',
          parentId: 100,
          children: [
            { id: 201, title: 'دفتر اول', fullUrl: '/moulavi/masnavi/daftar1' },
            // زیردستهٔ خارج از دامنه باید توسط scopeResults حذف شود.
            { id: 999, title: 'بیرون از دامنه', fullUrl: '/hafez/ghazal' },
          ],
          poems: [
            { id: 301, title: 'شعر مولوی', fullUrl: '/moulavi/masnavi/daftar1/sh1' },
            // شعر خارج از دامنه باید حذف شود.
            { id: 888, title: 'شعر غیرمولوی', fullUrl: '/saadi/boostan/sh1' },
          ],
        },
      });

      expect(result).toBeDefined();
      expect(result!.id).toBe(catId);
      expect(result!.title).toBe('مثنوی معنوی');
      expect(result!.fullUrl).toBe('/moulavi/masnavi');
      expect(result!.parentId).toBe(100);

      // تنها آیتم‌های متعلق به مولوی باید باقی بمانند.
      expect(result!.children.length).toBe(1);
      expect(result!.children[0].id).toBe(201);
      expect(result!.poems.length).toBe(1);
      expect(result!.poems[0].id).toBe(301);
    });

    it('پاسخی را که cat را مستقیماً در ریشه قرار می‌دهد (بدون پوشش) نیز نگاشت می‌کند', () => {
      const catId = 55;
      let result: Category | undefined;
      service.getCategory(catId).subscribe((cat) => (result = cat));

      const req = httpMock.expectOne(
        (r) =>
          r.method === 'GET' && r.url.includes(`/api/ganjoor/cat/${catId}`),
      );

      // شکل جایگزین پاسخ: خودِ cat در ریشه (بدون کلید پوشش‌دهندهٔ cat).
      req.flush({
        id: catId,
        title: 'دیوان شمس',
        fullUrl: '/moulavi/shams',
        parentId: null,
        children: [],
        poems: [],
      });

      expect(result).toBeDefined();
      expect(result!.id).toBe(catId);
      expect(result!.title).toBe('دیوان شمس');
      expect(result!.parentId).toBeNull();
      expect(result!.children).toEqual([]);
      expect(result!.poems).toEqual([]);
    });

    it('شعرهای فاقد fullUrl را با ساختن fullUrl از urlSlug دستهٔ والد حفظ می‌کند (رگرسیون باگ صفحهٔ خالی)', () => {
      const catId = 99;
      let result: Category | undefined;
      service.getCategory(catId).subscribe((cat) => (result = cat));

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.includes(`/api/ganjoor/cat/${catId}`),
      );

      // پاسخ واقعی گنجور: خلاصهٔ شعرها تنها urlSlug دارند و fullUrl ندارند.
      req.flush({
        cat: {
          id: catId,
          title: 'غزلیات',
          fullUrl: '/moulavi/shams/ghazalsh',
          parentId: 5,
          children: [],
          poems: [
            { id: 2626, title: 'غزل شمارهٔ ۲', urlSlug: 'sh2' },
            { id: 2627, title: 'غزل شمارهٔ ۳', urlSlug: 'sh3' },
          ],
        },
      });

      expect(result).toBeDefined();
      // شعرها نباید حذف شوند؛ fullUrl باید از دستهٔ والد ساخته شود.
      expect(result!.poems.length).toBe(2);
      expect(result!.poems[0].id).toBe(2626);
      expect(result!.poems[0].fullUrl).toBe('/moulavi/shams/ghazalsh/sh2');
      expect(result!.poems[1].fullUrl).toBe('/moulavi/shams/ghazalsh/sh3');
    });
  });

  describe('getRecitations(poemId)', () => {
    it('درخواست را به endpoint خوانش‌های شعر می‌فرستد و خوانش‌های فاقد mp3Url را حذف می‌کند', () => {
      const poemId = 42;
      let result: Recitation[] | undefined;
      service.getRecitations(poemId).subscribe((recitations) => (result = recitations));

      const req = httpMock.expectOne(
        (r) =>
          r.method === 'GET' &&
          r.url.includes(`/api/ganjoor/poem/${poemId}/recitations`),
      );
      expect(req.request.url).toContain('https://api.ganjoor.net');
      expect(req.request.url).toContain(`/api/ganjoor/poem/${poemId}/recitations`);

      req.flush([
        { id: 1, audioTitle: 'خوانش یک', audioArtist: 'هنرمند الف', mp3Url: 'https://x/1.mp3' },
        // فاقد mp3Url معتبر → باید حذف شود.
        { id: 2, audioTitle: 'خوانش دو', audioArtist: 'هنرمند ب', mp3Url: null },
        { id: 3, audioTitle: 'خوانش سه', audioArtist: 'هنرمند ج', mp3Url: '' },
        // فضای خالی نیز نامعتبر تلقی می‌شود.
        { id: 4, audioTitle: 'خوانش چهار', audioArtist: 'هنرمند د', mp3Url: '   ' },
        { id: 5, audioTitle: 'خوانش پنج', audioArtist: 'هنرمند ه', mp3Url: 'https://x/5.mp3' },
      ]);

      expect(result).toBeDefined();
      // تنها خوانش‌های دارای mp3Url معتبر باید باقی بمانند.
      expect(result!.map((r) => r.id)).toEqual([1, 5]);
      expect(result![0].audioTitle).toBe('خوانش یک');
      expect(result![0].audioArtist).toBe('هنرمند الف');
      expect(result![0].mp3Url).toBe('https://x/1.mp3');
      expect(result![1].mp3Url).toBe('https://x/5.mp3');
    });

    it('برای پاسخ خالی، فهرست خالی بازمی‌گرداند', () => {
      const poemId = 7;
      let result: Recitation[] | undefined;
      service.getRecitations(poemId).subscribe((recitations) => (result = recitations));

      const req = httpMock.expectOne(
        (r) =>
          r.method === 'GET' &&
          r.url.includes(`/api/ganjoor/poem/${poemId}/recitations`),
      );
      req.flush([]);

      expect(result).toEqual([]);
    });
  });

  describe('getTranslationLanguages()', () => {
    it('درخواست را به endpoint زبان‌های ترجمه می‌فرستد و id/name/code را نگاشت می‌کند', () => {
      let result: Language[] | undefined;
      service.getTranslationLanguages().subscribe((languages) => (result = languages));

      const req = httpMock.expectOne(
        (r) => r.method === 'GET' && r.url.includes('/api/translations/languages'),
      );
      expect(req.request.url).toContain('https://api.ganjoor.net');
      expect(req.request.url).toContain('/api/translations/languages');

      req.flush([
        { id: 1, name: 'انگلیسی', code: 'en' },
        { id: 2, name: 'فرانسوی', code: 'fr' },
        // فیلدهای ناقص باید با مقادیر پیش‌فرض ایمن نگاشت شوند.
        { id: 3, name: undefined, code: undefined },
      ]);

      expect(result).toBeDefined();
      expect(result!.length).toBe(3);
      expect(result![0]).toEqual({ id: 1, name: 'انگلیسی', code: 'en' });
      expect(result![1]).toEqual({ id: 2, name: 'فرانسوی', code: 'fr' });
      // نگاشت ایمن: مقادیر نامشخص به مقادیر پیش‌فرض تبدیل می‌شوند.
      expect(result![2]).toEqual({ id: 3, name: '', code: '' });
    });
  });
});
