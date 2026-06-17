import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslationPanelComponent } from './translation-panel.component';
import { Translation } from '../../models/models';

/**
 * آزمون واحد برای TranslationPanelComponent.
 *
 * پوشش:
 * - نمایش فهرست ترجمه‌ها با حفظ ترتیب و انتخاب آن‌ها (R4.1).
 * - نمایش هم‌زمان متن ترجمهٔ انتخاب‌شده در کنار متن شعر و انتشار selectionChange (R4.2).
 * - حالت خالیِ آرایهٔ ترجمه‌ها → «ترجمه‌ای برای این شعر موجود نیست» (R4.3).
 * - حالت ترجمهٔ بدون متن/فاصله‌ای → «متن ترجمه در دسترس نیست» (R4.4).
 * - حالت خطا + دکمهٔ «تلاش مجدد» با انتشار retry (R4.5).
 */
describe('TranslationPanelComponent', () => {
  let fixture: ComponentFixture<TranslationPanelComponent>;
  let component: TranslationPanelComponent;

  const makeTranslation = (overrides: Partial<Translation> = {}): Translation => ({
    languageId: 1,
    languageName: 'انگلیسی',
    contributorName: null,
    verses: [{ vOrder: 1, text: 'In the name of God' }],
    ...overrides,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslationPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TranslationPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the list of translations preserving the received order', () => {
    component.translations = [
      makeTranslation({ languageId: 1, languageName: 'انگلیسی' }),
      makeTranslation({ languageId: 2, languageName: 'فرانسوی' }),
      makeTranslation({ languageId: 3, languageName: 'آلمانی' }),
    ];
    fixture.detectChanges();

    const langs = Array.from(
      fixture.nativeElement.querySelectorAll('.translations__lang'),
    ).map((el) => (el as HTMLElement).textContent?.trim());

    expect(langs).toEqual(['انگلیسی', 'فرانسوی', 'آلمانی']);
  });

  it('should render the contributor name when present', () => {
    component.translations = [
      makeTranslation({ languageName: 'انگلیسی', contributorName: 'نیکلسون' }),
    ];
    fixture.detectChanges();

    const contributor = fixture.nativeElement.querySelector(
      '.translations__contributor',
    ) as HTMLElement;
    expect(contributor).toBeTruthy();
    expect(contributor.textContent).toContain('نیکلسون');
  });

  it('should emit selectionChange and display the selected translation verse text on selection', () => {
    component.translations = [
      makeTranslation({ languageName: 'انگلیسی', verses: [{ vOrder: 1, text: 'First verse' }] }),
      makeTranslation({ languageName: 'فرانسوی', verses: [{ vOrder: 1, text: 'Premier vers' }] }),
    ];
    fixture.detectChanges();

    const emitSpy = spyOn(component.selectionChange, 'emit').and.callThrough();
    const options = fixture.nativeElement.querySelectorAll(
      '.translations__option',
    ) as NodeListOf<HTMLButtonElement>;

    options[1].click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith(1);
    expect(component.selectedIndex).toBe(1);

    const verses = Array.from(
      fixture.nativeElement.querySelectorAll('.translations__verse'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(verses).toEqual(['Premier vers']);
  });

  it('should display the first translation text alongside the list by default', () => {
    component.translations = [
      makeTranslation({
        languageName: 'انگلیسی',
        verses: [
          { vOrder: 1, text: 'Line one' },
          { vOrder: 2, text: 'Line two' },
        ],
      }),
    ];
    fixture.detectChanges();

    const verses = Array.from(
      fixture.nativeElement.querySelectorAll('.translations__verse'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(verses).toEqual(['Line one', 'Line two']);
  });

  it('should mark the selected option as active via aria-selected', () => {
    component.translations = [
      makeTranslation({ languageName: 'انگلیسی' }),
      makeTranslation({ languageName: 'فرانسوی' }),
    ];
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll(
      '.translations__option',
    ) as NodeListOf<HTMLButtonElement>;
    options[1].click();
    fixture.detectChanges();

    expect(options[0].getAttribute('aria-selected')).toBe('false');
    expect(options[1].getAttribute('aria-selected')).toBe('true');
  });

  it('should render the empty-state message when there are no translations', () => {
    component.translations = [];
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('app-empty-state .empty__message') as HTMLElement;
    expect(empty).toBeTruthy();
    expect(empty.textContent?.trim()).toBe('ترجمه‌ای برای این شعر موجود نیست');

    const list = fixture.nativeElement.querySelector('.translations__list');
    expect(list).toBeNull();
  });

  it('should show "متن ترجمه در دسترس نیست" when the selected translation has empty/whitespace verses', () => {
    component.translations = [
      makeTranslation({
        languageName: 'انگلیسی',
        verses: [
          { vOrder: 1, text: '' },
          { vOrder: 2, text: '   ' },
        ],
      }),
    ];
    fixture.detectChanges();

    const verses = fixture.nativeElement.querySelectorAll('.translations__verse');
    expect(verses.length).toBe(0);

    const empty = fixture.nativeElement.querySelector(
      '.translations__text app-empty-state .empty__message',
    ) as HTMLElement;
    expect(empty).toBeTruthy();
    expect(empty.textContent?.trim()).toBe('متن ترجمه در دسترس نیست');
  });

  it('should render the error-state with its message when the error input is set', () => {
    component.translations = [];
    component.error = { messageFa: 'دریافت ترجمه‌ها ناموفق بود.' };
    fixture.detectChanges();

    const errorMessage = fixture.nativeElement.querySelector(
      'app-error-state .error__message',
    ) as HTMLElement;
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.textContent?.trim()).toBe('دریافت ترجمه‌ها ناموفق بود.');
  });

  it('should emit the retry output when the retry button is clicked in the error state', () => {
    component.error = { messageFa: 'خطا رخ داد.' };
    fixture.detectChanges();

    const emitSpy = spyOn(component.retry, 'emit');
    const retryButton = fixture.nativeElement.querySelector(
      'app-error-state .error__retry',
    ) as HTMLButtonElement;
    expect(retryButton).toBeTruthy();

    retryButton.click();
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should keep previous content visible while showing the error and retry option (R4.5)', () => {
    component.translations = [
      makeTranslation({ languageName: 'انگلیسی', verses: [{ vOrder: 1, text: 'Existing text' }] }),
    ];
    component.error = { messageFa: 'خطا رخ داد.' };
    fixture.detectChanges();

    // محتوای پیشین (فهرست و متن ترجمه) همچنان نمایش داده می‌شود
    const verses = Array.from(
      fixture.nativeElement.querySelectorAll('.translations__verse'),
    ).map((el) => (el as HTMLElement).textContent?.trim());
    expect(verses).toEqual(['Existing text']);

    // و در کنار آن، حالت خطا با دکمهٔ تلاش مجدد ارائه می‌شود
    const retryButton = fixture.nativeElement.querySelector('app-error-state .error__retry');
    expect(retryButton).toBeTruthy();
  });
});
