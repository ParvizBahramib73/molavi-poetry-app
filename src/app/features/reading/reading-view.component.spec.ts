import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { GanjoorService } from '../../core/ganjoor.service';
import { GanjoorApiError, Poem } from '../../models';
import { ReadingViewComponent } from './reading-view.component';

/** نمونهٔ شعر آزمونی با عنوان، مسیر کامل و چند بیت. */
function makePoem(overrides: Partial<Poem> = {}): Poem {
  return {
    id: 8,
    title: 'بشنو این نی چون شکایت می‌کند',
    fullTitle: 'مولوی > مثنوی > دفتر اول > بخش ۱',
    fullUrl: '/moulavi/masnavi/daftar1/sh1',
    verses: [
      { vOrder: 1, text: 'بشنو این نی چون شکایت می‌کند', position: 'RIGHT' },
      { vOrder: 2, text: 'از جدایی‌ها حکایت می‌کند', position: 'LEFT' },
    ],
    recitations: [],
    translations: [],
    ...overrides,
  };
}

/** خطای آزمونی لایهٔ سرویس. */
const apiError: GanjoorApiError = {
  kind: 'network',
  messageFa: 'خطای شبکه رخ داد.',
};

describe('ReadingViewComponent', () => {
  let fixture: ComponentFixture<ReadingViewComponent>;
  let component: ReadingViewComponent;
  let ganjoorSpy: jasmine.SpyObj<GanjoorService>;

  beforeEach(async () => {
    ganjoorSpy = jasmine.createSpyObj<GanjoorService>('GanjoorService', [
      'getPoem',
    ]);

    await TestBed.configureTestingModule({
      imports: [ReadingViewComponent],
      providers: [
        provideRouter([]),
        { provide: GanjoorService, useValue: ganjoorSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReadingViewComponent);
    component = fixture.componentInstance;
  });

  function text(selector: string): string {
    const el = fixture.nativeElement.querySelector(selector) as HTMLElement | null;
    return el?.textContent?.trim() ?? '';
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch the poem when the id input is set', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));

    component.id = '8';
    fixture.detectChanges();

    expect(ganjoorSpy.getPoem).toHaveBeenCalledOnceWith(8);
  });

  it('should render the poem title and hierarchical full path', () => {
    const poem = makePoem();
    ganjoorSpy.getPoem.and.returnValue(of(poem));

    component.id = '8';
    fixture.detectChanges();

    expect(text('.reading__title')).toBe(poem.title);
    expect(text('.reading__path')).toBe(poem.fullTitle);
  });

  it('should render every verse of the poem', () => {
    const poem = makePoem();
    ganjoorSpy.getPoem.and.returnValue(of(poem));

    component.id = '8';
    fixture.detectChanges();

    const verses = fixture.nativeElement.querySelectorAll('.poem-text__verse');
    expect(verses.length).toBe(poem.verses.length);
    expect((verses[0] as HTMLElement).textContent?.trim()).toBe(
      poem.verses[0].text,
    );
    expect((verses[1] as HTMLElement).textContent?.trim()).toBe(
      poem.verses[1].text,
    );
  });

  it('should show a Persian empty message when the poem has no verses', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem({ verses: [] })));

    component.id = '8';
    fixture.detectChanges();

    expect(text('.empty__message')).toBe('متن این شعر در دسترس نیست.');
    expect(fixture.nativeElement.querySelector('app-poem-text')).toBeNull();
  });

  it('should show the Persian error message when fetching fails', () => {
    ganjoorSpy.getPoem.and.returnValue(throwError(() => apiError));

    component.id = '8';
    fixture.detectChanges();

    expect(text('.error__message')).toBe(apiError.messageFa);
  });

  it('should preserve previously rendered content when a later fetch fails', () => {
    const poem = makePoem();
    ganjoorSpy.getPoem.and.returnValue(of(poem));

    component.id = '8';
    fixture.detectChanges();

    // واکشی بعدی شکست می‌خورد؛ محتوای قبلی باید حفظ شود (R2.5).
    ganjoorSpy.getPoem.and.returnValue(throwError(() => apiError));
    component.reload();
    fixture.detectChanges();

    expect(text('.error__message')).toBe(apiError.messageFa);
    // عنوان و ابیات قبلی همچنان نمایش داده می‌شوند.
    expect(text('.reading__title')).toBe(poem.title);
    expect(component.poem).toEqual(poem);
  });

  it('should re-invoke getPoem and restore content when retry is clicked', () => {
    const poem = makePoem();
    ganjoorSpy.getPoem.and.returnValue(of(poem));

    component.id = '8';
    fixture.detectChanges();

    ganjoorSpy.getPoem.and.returnValue(throwError(() => apiError));
    component.reload();
    fixture.detectChanges();

    // تلاش مجدد: واکشی بعدی موفق است.
    ganjoorSpy.getPoem.and.returnValue(of(poem));
    const retryBtn = fixture.nativeElement.querySelector(
      '.error__retry',
    ) as HTMLButtonElement;
    retryBtn.click();
    fixture.detectChanges();

    // getPoem برای: مقداردهی اولیه + reload + کلیک تلاش مجدد = ۳ بار.
    expect(ganjoorSpy.getPoem).toHaveBeenCalledTimes(3);
    expect(ganjoorSpy.getPoem.calls.mostRecent().args).toEqual([8]);
    expect(fixture.nativeElement.querySelector('.error__message')).toBeNull();
    expect(text('.reading__title')).toBe(poem.title);
  });

  it('should expose exactly three reading sections (text/audio/translation)', () => {
    ganjoorSpy.getPoem.and.returnValue(of(makePoem()));

    component.id = '8';
    fixture.detectChanges();

    const sections =
      fixture.nativeElement.querySelectorAll('.reading__section');
    expect(sections.length).toBe(3);
    expect(
      fixture.nativeElement.querySelector('.reading__text'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('.reading__audio'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('.reading__translation'),
    ).toBeTruthy();
  });
});
