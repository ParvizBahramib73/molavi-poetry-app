import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Verse } from '../../models';
import { PoemTextComponent, TextSize } from './poem-text.component';

/** کلید ذخیره‌سازی اندازهٔ متن در localStorage (هم‌راستا با کامپوننت). */
const TEXT_SIZE_STORAGE_KEY = 'molavi.reading.textSize';

const SAMPLE_VERSES: Verse[] = [
  { vOrder: 1, text: 'بشنو این نی چون شکایت می‌کند', position: 'RIGHT' },
  { vOrder: 2, text: 'از جدایی‌ها حکایت می‌کند', position: 'LEFT' },
  { vOrder: 3, text: 'کز نیستان تا مرا ببریده‌اند', position: 'RIGHT' },
];

describe('PoemTextComponent', () => {
  let fixture: ComponentFixture<PoemTextComponent>;
  let component: PoemTextComponent;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [PoemTextComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PoemTextComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.clear();
  });

  function verseElements(): HTMLElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('.poem-text__verse'),
    );
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should offer at least three text-size options', () => {
    expect(component.sizeOptions.length).toBeGreaterThanOrEqual(3);

    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll(
      '.poem-text__size-btn',
    );
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('should render each verse as a separate line in order', () => {
    component.verses = SAMPLE_VERSES;
    fixture.detectChanges();

    const verses = verseElements();
    expect(verses.length).toBe(SAMPLE_VERSES.length);
    verses.forEach((el, i) => {
      expect(el.textContent?.trim()).toBe(SAMPLE_VERSES[i].text);
    });
  });

  it('should persist the selected text size to localStorage', () => {
    const setItemSpy = spyOn(
      Storage.prototype,
      'setItem',
    ).and.callThrough();
    fixture.detectChanges();

    component.setTextSize('large');

    expect(component.textSize).toBe('large');
    expect(setItemSpy).toHaveBeenCalledWith(TEXT_SIZE_STORAGE_KEY, 'large');
    expect(localStorage.getItem(TEXT_SIZE_STORAGE_KEY)).toBe('large');
  });

  it('should apply the selected size as a CSS class on the verses container', () => {
    component.verses = SAMPLE_VERSES;
    fixture.detectChanges();

    component.setTextSize('small');
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector(
      '.poem-text__verses',
    ) as HTMLElement;
    expect(container.classList).toContain('poem-text__verses--small');
  });

  it('should restore the persisted size in a new instance on ngOnInit', () => {
    const persisted: TextSize = 'large';
    localStorage.setItem(TEXT_SIZE_STORAGE_KEY, persisted);

    const freshFixture = TestBed.createComponent(PoemTextComponent);
    const freshComponent = freshFixture.componentInstance;

    // پیش از ngOnInit مقدار پیش‌فرض است.
    expect(freshComponent.textSize).toBe('medium');

    freshFixture.detectChanges(); // ngOnInit را فعال می‌کند.

    expect(freshComponent.textSize).toBe(persisted);
  });

  it('should fall back to the default size when no value is stored', () => {
    fixture.detectChanges();
    expect(component.textSize).toBe('medium');
  });
});
