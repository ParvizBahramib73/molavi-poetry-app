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

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';

import { GanjoorService } from '../../core/ganjoor.service';
import { GanjoorApiError, PoemSummary, SearchResultPage, Verse } from '../../models';
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
      'getPoemVerses',
    ]);
    ganjoorSpy.getPoemVerses.and.returnValue(of([]));

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


  it('uses a visible Persian label and example for the search field', () => {
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('#molavi-search-input') as HTMLInputElement;
    const label = fixture.nativeElement.querySelector('label[for="molavi-search-input"]') as HTMLLabelElement;

    expect(label.textContent).toContain('بخشی از شعر');
    expect(input.type).toBe('search');
    expect(input.placeholder).toContain('مثلاً');
  });

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
      expect(links[0].textContent).toContain('خواندن شعر');
      const titles = fixture.nativeElement.querySelectorAll('.search__card-title');
      expect(titles[0].textContent).toContain('شعر اول');
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

  describe('جست‌وجوی بخشی از شعر و تجربه موبایل', () => {
    it('متن بیت پیدا شده را برجسته می‌کند و لینک مطالعه به همان بیت اشاره می‌کند', () => {
      const results: PoemSummary[] = [
        { id: 42, title: 'غزل شماره ۴۲', fullUrl: '/moulavi/shams/ghazal/sh42' },
      ];
      const verses: Verse[] = [
        { vOrder: 1, text: 'مصرع آغازین', position: 'RIGHT' },
        { vOrder: 2, text: 'بشنو از نی چون حکایت می‌کند', position: 'RIGHT' },
        { vOrder: 3, text: 'از جدایی‌ها شکایت می‌کند', position: 'LEFT' },
      ];
      ganjoorSpy.searchPoems.and.returnValue(of(makePage('بشنو از نی', results)));
      ganjoorSpy.getPoemVerses.and.returnValue(of(verses));

      fixture.detectChanges();
      component.term = 'بشنو از نی';
      component.onSubmit();
      fixture.detectChanges();

      expect(ganjoorSpy.getPoemVerses).toHaveBeenCalledOnceWith(42);
      const match = fixture.nativeElement.querySelector('.search__verse mark') as HTMLElement;
      expect(match.textContent).toBe('بشنو از نی');
      expect(fixture.nativeElement.textContent).toContain('از جدایی‌ها');
      const link = fixture.nativeElement.querySelector('.search__result-link') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toContain('v=2');
    });

    it('تغییر ورودی را با مکث ۶۰۰ میلی‌ثانیه جست‌وجو می‌کند', fakeAsync(() => {
      ganjoorSpy.searchPoems.and.returnValue(of(makePage('عشق', [])));
      fixture.detectChanges();

      component.onTermChange('عشق');
      tick(599);
      expect(ganjoorSpy.searchPoems).not.toHaveBeenCalled();
      tick(1);

      expect(ganjoorSpy.searchPoems).toHaveBeenCalledOnceWith('عشق', 1);
    }));

    it('پاسخ جست‌وجوی قبلی را بعد از تغییر عبارت نشان نمی‌دهد', () => {
      const stale = new Subject<SearchResultPage>();
      ganjoorSpy.searchPoems.and.returnValues(
        stale.asObservable(),
        of(makePage('نی', [
          { id: 99, title: 'شعر جدید', fullUrl: '/moulavi/masnavi/daftar1/sh5' },
        ])),
      );
      fixture.detectChanges();
      component.term = 'عشق';
      component.onSubmit();
      component.onTermChange('نی');
      component.term = 'نی';
      component.onSubmit();
      stale.next(makePage('عشق', [
        { id: 11, title: 'نتیجه قدیمی', fullUrl: '/moulavi/masnavi/daftar1/sh1' },
      ]));
      fixture.detectChanges();

      expect(component.results.map((hit) => hit.id)).toEqual([99]);
      expect(text()).not.toContain('نتیجه قدیمی');
    });

    it('نتایج را در گروه‌های هشت‌تایی نشان می‌دهد، نه یک فهرست طولانی', () => {
      const results = Array.from({ length: 18 }, (_, n) => ({
        id: n + 1,
        title: `غزل شماره ${n + 1}`,
        fullUrl: `/moulavi/shams/ghazal/sh${n + 1}`,
      }));
      ganjoorSpy.searchPoems.and.returnValue(of(makePage('عشق', results)));
      fixture.detectChanges();
      component.term = 'عشق';
      component.onSubmit();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.search__card').length).toBe(8);
      component.showMore();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.search__card').length).toBe(16);
      component.showMore();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.search__card').length).toBe(18);
    });

    it('پیش‌نمایش بیت‌ها را با حداکثر دو درخواست همزمان واکشی می‌کند', () => {
      const results = [1, 2, 3, 4].map((id) => ({
        id,
        title: `غزل شماره ${id}`,
        fullUrl: `/moulavi/shams/ghazal/sh${id}`,
      }));
      const verse1 = new Subject<Verse[]>();
      const verse2 = new Subject<Verse[]>();
      const verse3 = new Subject<Verse[]>();
      ganjoorSpy.searchPoems.and.returnValue(of(makePage('عشق', results)));
      ganjoorSpy.getPoemVerses.and.returnValues(verse1, verse2, verse3, of([]));
      fixture.detectChanges();
      component.term = 'عشق';
      component.onSubmit();

      expect(ganjoorSpy.getPoemVerses).toHaveBeenCalledTimes(2);
      verse1.next([]);
      verse1.complete();

      expect(ganjoorSpy.getPoemVerses).toHaveBeenCalledTimes(3);
    });

    it('وقتی متن بیت دریافت نشود، نتیجه اصلی را همچنان نمایش می‌دهد', () => {
      ganjoorSpy.searchPoems.and.returnValue(of(makePage('نی', [
        { id: 123, title: 'غزل شماره ۱۲۳', fullUrl: '/moulavi/shams/ghazal/sh123' },
      ])));
      ganjoorSpy.getPoemVerses.and.returnValue(throwError(() => new Error('offline')));
      fixture.detectChanges();
      component.term = 'نی';
      component.onSubmit();
      fixture.detectChanges();

      expect(text()).toContain('غزل شماره ۱۲۳');
      expect(text()).toContain('متن نمونه فعلاً در دسترس نیست');
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
