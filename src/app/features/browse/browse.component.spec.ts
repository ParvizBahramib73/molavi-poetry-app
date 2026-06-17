import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { GanjoorService } from '../../core/ganjoor.service';
import { Category, GanjoorApiError, Poet } from '../../models';
import { BrowseComponent } from './browse.component';

/**
 * آزمون واحد BrowseComponent.
 *
 * این آزمون‌ها رفتار ویوی مرور را با یک GanjoorService جعلی (jasmine spy)
 * بررسی می‌کنند: رندر Workها/Categoryها/Poemها با حفظ ترتیب، باز کردن دسته،
 * حالت خالی، و مسیر خطا + تلاش مجدد با حفظ محتوای قبلی.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.5, 1.6
 */
describe('BrowseComponent', () => {
  let fixture: ComponentFixture<BrowseComponent>;
  let ganjoor: jasmine.SpyObj<GanjoorService>;

  /** ساخت یک Category با مقادیر پیش‌فرض و امکان بازنویسی. */
  function makeCategory(overrides: Partial<Category> = {}): Category {
    return {
      id: 0,
      title: 'آثار مولوی',
      fullUrl: '/moulavi',
      parentId: null,
      children: [],
      poems: [],
      ...overrides,
    };
  }

  /** ساخت یک Poet با rootCategory مشخص. */
  function makePoet(rootCategory: Category): Poet {
    return {
      id: 5,
      name: 'مولوی',
      urlSlug: 'moulavi',
      rootCategory,
    };
  }

  /** خطای نمونهٔ یکپارچهٔ سرویس. */
  const apiError: GanjoorApiError = {
    kind: 'network',
    messageFa: 'خطا در ارتباط با شبکه.',
  };

  /** ریشه‌ای با سه دستهٔ مرتب و دو شعر مرتب. */
  const rootCategory = makeCategory({
    title: 'آثار مولوی',
    children: [
      { id: 11, title: 'مثنوی معنوی', fullUrl: '/moulavi/masnavi' },
      { id: 12, title: 'دیوان شمس', fullUrl: '/moulavi/shams' },
      { id: 13, title: 'رباعیات', fullUrl: '/moulavi/robaiyat' },
    ],
    poems: [
      { id: 101, title: 'شعر اول', fullUrl: '/moulavi/p1' },
      { id: 102, title: 'شعر دوم', fullUrl: '/moulavi/p2' },
    ],
  });

  beforeEach(async () => {
    ganjoor = jasmine.createSpyObj<GanjoorService>('GanjoorService', [
      'getPoet',
      'getCategory',
    ]);
    ganjoor.getPoet.and.returnValue(of(makePoet(rootCategory)));

    await TestBed.configureTestingModule({
      imports: [BrowseComponent],
      providers: [
        { provide: GanjoorService, useValue: ganjoor },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BrowseComponent);
  });

  /** متن دکمه‌های دسته (به ترتیب نمایش). */
  function categoryTitles(): string[] {
    const nodes = fixture.nativeElement.querySelectorAll(
      '.browse__link--cat',
    ) as NodeListOf<HTMLElement>;
    return Array.from(nodes).map((el) => el.textContent?.trim() ?? '');
  }

  /** متن لینک‌های شعر (به ترتیب نمایش). */
  function poemTitles(): string[] {
    const nodes = fixture.nativeElement.querySelectorAll(
      '.browse__link--poem',
    ) as NodeListOf<HTMLElement>;
    return Array.from(nodes).map((el) => el.textContent?.trim() ?? '');
  }

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('بارگذاری ریشه: آثار سطح‌بالا را از getPoet می‌خواند (R1.1)', () => {
    fixture.detectChanges();
    expect(ganjoor.getPoet).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.state().data?.id).toBe(rootCategory.id);
  });

  it('Workها/Categoryها را با حفظ ترتیب دریافتی رندر می‌کند (R1.2)', () => {
    fixture.detectChanges();
    expect(categoryTitles()).toEqual([
      'مثنوی معنوی',
      'دیوان شمس',
      'رباعیات',
    ]);
  });

  it('Poemها را با حفظ ترتیب دریافتی رندر می‌کند (R1.3)', () => {
    fixture.detectChanges();
    expect(poemTitles()).toEqual(['شعر اول', 'شعر دوم']);
  });

  it('کلیک روی یک دسته getCategory را با شناسهٔ همان دسته فراخوانی می‌کند (R1.2)', () => {
    const childCategory = makeCategory({
      id: 11,
      title: 'مثنوی معنوی',
      parentId: 0,
      children: [{ id: 21, title: 'دفتر اول', fullUrl: '/moulavi/masnavi/d1' }],
      poems: [],
    });
    ganjoor.getCategory.and.returnValue(of(childCategory));

    fixture.detectChanges();
    const firstCat = fixture.nativeElement.querySelector(
      '.browse__link--cat',
    ) as HTMLButtonElement;
    firstCat.click();
    fixture.detectChanges();

    expect(ganjoor.getCategory).toHaveBeenCalledOnceWith(11);
    expect(categoryTitles()).toEqual(['دفتر اول']);
  });

  it('وقتی دسته‌ها و شعرها خالی باشند حالت خالی را نمایش می‌دهد (R1.2/R1.3)', () => {
    ganjoor.getPoet.and.returnValue(
      of(makePoet(makeCategory({ children: [], poems: [] }))),
    );

    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector(
      'app-empty-state',
    ) as HTMLElement;
    expect(empty).toBeTruthy();
    expect(empty.textContent?.trim()).toContain('محتوایی برای نمایش وجود ندارد.');
    expect(categoryTitles()).toEqual([]);
    expect(poemTitles()).toEqual([]);
  });

  it('هنگام خطا حالت خطا را با پیام فارسی نمایش می‌دهد (R1.5)', () => {
    ganjoor.getPoet.and.returnValue(
      throwError(() => apiError) as Observable<Poet>,
    );

    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector(
      'app-error-state .error__message',
    ) as HTMLElement;
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent?.trim()).toBe(apiError.messageFa);
    expect(fixture.componentInstance.state().error).toEqual(apiError);
  });

  it('تلاش مجدد سرویس را دوباره فراخوانی می‌کند و در موفقیت محتوا را نمایش می‌دهد (R1.6)', () => {
    ganjoor.getPoet.and.returnValue(
      throwError(() => apiError) as Observable<Poet>,
    );
    fixture.detectChanges();
    expect(ganjoor.getPoet).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.state().error).toEqual(apiError);

    // بار دوم سرویس موفق پاسخ می‌دهد.
    ganjoor.getPoet.and.returnValue(of(makePoet(rootCategory)));
    const retryBtn = fixture.nativeElement.querySelector(
      'app-error-state .error__retry',
    ) as HTMLButtonElement;
    retryBtn.click();
    fixture.detectChanges();

    expect(ganjoor.getPoet).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.state().error).toBeNull();
    expect(categoryTitles()).toEqual([
      'مثنوی معنوی',
      'دیوان شمس',
      'رباعیات',
    ]);
  });

  it('هنگام خطا محتوای قبلی حفظ می‌شود (R1.6)', () => {
    // ابتدا ریشه با موفقیت بارگذاری می‌شود.
    fixture.detectChanges();
    expect(categoryTitles().length).toBe(3);

    // سپس باز کردن یک دسته با خطا مواجه می‌شود؛ محتوای قبلی باید بماند.
    ganjoor.getCategory.and.returnValue(
      throwError(() => apiError) as Observable<Category>,
    );
    const firstCat = fixture.nativeElement.querySelector(
      '.browse__link--cat',
    ) as HTMLButtonElement;
    firstCat.click();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector(
      'app-error-state .error__message',
    ) as HTMLElement;
    expect(errorEl).toBeTruthy();
    // محتوای ریشهٔ قبلی هنوز نمایش داده می‌شود.
    expect(categoryTitles()).toEqual([
      'مثنوی معنوی',
      'دیوان شمس',
      'رباعیات',
    ]);
    expect(poemTitles()).toEqual(['شعر اول', 'شعر دوم']);
  });
});
