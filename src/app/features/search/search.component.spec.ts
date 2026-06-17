/**
 * آزمون‌های واحد کامپوننت جست‌وجوی اشعار مولوی (SearchComponent).
 *
 * این آزمون‌ها رفتارهای کلیدی زیر را پوشش می‌دهند:
 * - اعتبارسنجی ورودی: عبارت کوتاه‌تر از ۲ نویسه پیام راهنما را نشان می‌دهد و
 *   درخواستی به سرویس ارسال نمی‌شود (R5.2).
 * - محدودسازی به مولوی و واکشی نتایج با searchPoems(term, 1) و رندر نتایج با
 *   پیوند به مسیر /poem/:id (R5.1, R5.3).
 * - حالت خالی «نتیجه‌ای یافت نشد» (R5.4).
 * - حالت خطا و «تلاش مجدد» که همان عبارت را دوباره جست‌وجو می‌کند و عبارت
 *   واردشده حفظ می‌شود (R5.5).
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { GanjoorService } from '../../core/ganjoor.service';
import { GanjoorApiError, PoemSummary, SearchResultPage } from '../../models';
import { SearchComponent } from './search.component';

/** ساخت یک صفحهٔ نتیجهٔ آزمایشی. */
function makePage(term: string, results: PoemSummary[]): SearchResultPage {
  return { term, results, pageNumber: 1, hasMore: false };
}

/** نمونهٔ خطای سرویس برای حالت ناموفق. */
const SERVICE_ERROR: GanjoorApiError = {
  kind: 'network',
  messageFa: 'خطا در ارتباط با سرور.',
};

describe('SearchComponent', () => {
  let fixture: ComponentFixture<SearchComponent>;
  let component: SearchComponent;
  let ganjoorSpy: jasmine.SpyObj<GanjoorService>;

  beforeEach(async () => {
    ganjoorSpy = jasmine.createSpyObj<GanjoorService>('GanjoorService', [
      'searchPoems',
    ]);

    await TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [
        provideRouter([]),
        { provide: GanjoorService, useValue: ganjoorSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
  });

  /** متن نمایش‌داده‌شده در DOM. */
  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  /** ثبت فرم از طریق دکمهٔ ارسال (رویداد DOM، سازگار با OnPush). */
  function submitViaDom(): void {
    const submitBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.search__submit',
    );
    submitBtn!.click();
    fixture.detectChanges();
  }

  describe('اعتبارسنجی ورودی (R5.2)', () => {
    it('عبارت کوتاه‌تر از ۲ نویسه پیام راهنما را نمایش می‌دهد و searchPoems را صدا نمی‌زند', () => {
      fixture.detectChanges();

      component.term = 'م';
      submitViaDom();

      expect(ganjoorSpy.searchPoems).not.toHaveBeenCalled();
      expect(component.guidanceMessage.length).toBeGreaterThan(0);
      const guidance = (fixture.nativeElement as HTMLElement).querySelector(
        '.search__guidance',
      );
      expect(guidance?.textContent).toContain('۲');
    });

    it('عبارت خالی/تنها فاصله نامعتبر است و درخواستی ارسال نمی‌شود', () => {
      fixture.detectChanges();

      component.term = '   ';
      component.onSubmit();
      fixture.detectChanges();

      expect(ganjoorSpy.searchPoems).not.toHaveBeenCalled();
      expect(component.guidanceMessage.length).toBeGreaterThan(0);
      expect(component.results.length).toBe(0);
    });
  });

  describe('جست‌وجوی معتبر و رندر نتایج (R5.1, R5.3)', () => {
    it('عبارت معتبر searchPoems(term, 1) را صدا می‌زند و نتایج را با پیوند به /poem/:id رندر می‌کند', () => {
      const results: PoemSummary[] = [
        { id: 11, title: 'شعر اول', fullUrl: '/moulavi/a' },
        { id: 22, title: 'شعر دوم', fullUrl: '/moulavi/b' },
      ];
      ganjoorSpy.searchPoems.and.returnValue(of(makePage('عشق', results)));

      fixture.detectChanges();
      component.term = 'عشق';
      component.onSubmit();
      fixture.detectChanges();

      expect(ganjoorSpy.searchPoems).toHaveBeenCalledTimes(1);
      expect(ganjoorSpy.searchPoems).toHaveBeenCalledWith('عشق', 1);

      const links = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>(
          '.search__result-link',
        ),
      );
      expect(links.length).toBe(2);
      expect(links[0].getAttribute('href')).toBe('/poem/11');
      expect(links[1].getAttribute('href')).toBe('/poem/22');
      expect(links[0].textContent).toContain('شعر اول');
    });

    it('عبارت پیش از ارسال trim می‌شود', () => {
      ganjoorSpy.searchPoems.and.returnValue(of(makePage('مولوی', [])));

      fixture.detectChanges();
      component.term = '  مولوی  ';
      component.onSubmit();
      fixture.detectChanges();

      expect(ganjoorSpy.searchPoems).toHaveBeenCalledWith('مولوی', 1);
    });
  });

  describe('حالت خالی (R5.4)', () => {
    it('نتایج خالی پیام «نتیجه‌ای یافت نشد» را نمایش می‌دهد', () => {
      ganjoorSpy.searchPoems.and.returnValue(of(makePage('xyz', [])));

      fixture.detectChanges();
      component.term = 'xyz';
      component.onSubmit();
      fixture.detectChanges();

      expect(component.results.length).toBe(0);
      expect(text()).toContain('نتیجه‌ای یافت نشد');
    });
  });

  describe('حالت خطا و تلاش مجدد (R5.5)', () => {
    it('خطا را نمایش می‌دهد و تلاش مجدد همان عبارت را دوباره جست‌وجو می‌کند و عبارت حفظ می‌شود', () => {
      ganjoorSpy.searchPoems.and.returnValue(throwError(() => SERVICE_ERROR));

      fixture.detectChanges();
      component.term = 'سماع';
      component.onSubmit();
      fixture.detectChanges();

      // خطا نمایش داده می‌شود.
      expect(component.error).toEqual(SERVICE_ERROR);
      expect(text()).toContain(SERVICE_ERROR.messageFa);
      expect(ganjoorSpy.searchPoems).toHaveBeenCalledTimes(1);

      // کلیک روی دکمهٔ «تلاش مجدد».
      const retryBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '.error__retry',
      );
      expect(retryBtn).withContext('دکمهٔ تلاش مجدد باید موجود باشد').not.toBeNull();
      retryBtn!.click();
      fixture.detectChanges();

      // همان عبارت دوباره جست‌وجو می‌شود و عبارت واردشده حفظ شده است.
      expect(ganjoorSpy.searchPoems).toHaveBeenCalledTimes(2);
      expect(ganjoorSpy.searchPoems.calls.allArgs()).toEqual([
        ['سماع', 1],
        ['سماع', 1],
      ]);
      expect(component.term).toBe('سماع');
    });

    it('پس از تلاش مجدد موفق، نتایج نمایش داده می‌شوند و خطا پاک می‌شود', () => {
      const results: PoemSummary[] = [
        { id: 7, title: 'نتیجهٔ تازه', fullUrl: '/moulavi/c' },
      ];
      ganjoorSpy.searchPoems.and.returnValues(
        throwError(() => SERVICE_ERROR),
        of(makePage('نی', results)),
      );

      fixture.detectChanges();
      component.term = 'نی';
      component.onSubmit();
      fixture.detectChanges();
      expect(component.error).toEqual(SERVICE_ERROR);

      const retryBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '.error__retry',
      );
      retryBtn!.click();
      fixture.detectChanges();

      expect(component.error).toBeNull();
      expect(component.results.length).toBe(1);
      expect(text()).toContain('نتیجهٔ تازه');
    });
  });
});
