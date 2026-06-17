import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';

import { Verse } from '../../models';

/** اندازه‌های از پیش‌تعریف‌شدهٔ متن شعر (حداقل سه اندازه — R7.3). */
export type TextSize = 'small' | 'medium' | 'large';

/** کلید ذخیره‌سازی اندازهٔ متن در localStorage (حفظ در بازدیدهای بعدی — R7.5). */
const TEXT_SIZE_STORAGE_KEY = 'molavi.reading.textSize';

/** اندازهٔ پیش‌فرض در صورت نبودِ مقدار ذخیره‌شده. */
const DEFAULT_TEXT_SIZE: TextSize = 'medium';

/** اندازه‌های مجاز همراه با برچسب فارسی برای کنترل انتخاب اندازه. */
const TEXT_SIZE_OPTIONS: ReadonlyArray<{ value: TextSize; label: string }> = [
  { value: 'small', label: 'کوچک' },
  { value: 'medium', label: 'متوسط' },
  { value: 'large', label: 'بزرگ' },
];

/**
 * کامپوننت نمایش متن شعر (PoemTextComponent).
 *
 * هر بیت را به‌صورت یک سطر مجزا و با حفظ ترتیب دریافتی رندر می‌کند (R2.1، R2.3).
 * یک کنترل اندازهٔ متن با دست‌کم سه اندازه (کوچک/متوسط/بزرگ) فراهم می‌کند که از
 * طریق کلاس CSS اعمال می‌شود؛ اندازهٔ انتخاب‌شده در localStorage ذخیره و هنگام
 * مقداردهی اولیه بازیابی می‌شود (R7.3، R7.5).
 *
 * Requirements: 2.1, 2.3, 7.3, 7.5
 */
@Component({
  selector: 'app-poem-text',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="poem-text" dir="rtl">
      <div
        class="poem-text__controls"
        role="group"
        aria-label="اندازهٔ متن"
      >
        <span class="poem-text__controls-label">اندازهٔ متن:</span>
        @for (option of sizeOptions; track option.value) {
          <button
            type="button"
            class="poem-text__size-btn"
            [class.poem-text__size-btn--active]="textSize === option.value"
            [attr.aria-pressed]="textSize === option.value"
            (click)="setTextSize(option.value)"
          >
            {{ option.label }}
          </button>
        }
      </div>

      <div class="poem-text__verses" [class]="'poem-text__verses--' + textSize">
        @for (verse of verses; track $index) {
          <p
            class="poem-text__verse"
            [class]="'poem-text__verse--' + verse.position.toLowerCase()"
          >
            {{ verse.text }}
          </p>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .poem-text {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .poem-text__controls {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: var(--paper-2, #fbf7ee);
        border: 1px solid var(--line, rgba(120, 95, 60, 0.18));
        border-radius: var(--r-pill, 999px);
        box-shadow: var(--shadow-sm);
      }

      .poem-text__controls-label {
        color: var(--muted, #7a6a55);
        font-size: 0.9rem;
        margin-inline-end: 0.25rem;
        font-weight: 600;
      }

      .poem-text__size-btn {
        padding: 0.3rem 0.95rem;
        font: inherit;
        color: var(--muted, #7a6a55);
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--r-pill, 999px);
        cursor: pointer;
        transition: color var(--t-fast, 150ms) var(--ease),
          background var(--t-fast, 150ms) var(--ease),
          box-shadow var(--t-fast, 150ms) var(--ease);
      }

      .poem-text__size-btn:hover {
        color: var(--ink, #2a2118);
        background: rgba(194, 152, 47, 0.12);
      }

      .poem-text__size-btn--active {
        color: #3a2c14;
        background: var(--grad-gold, linear-gradient(135deg, #e3b94a, #c2982f));
        border-color: transparent;
        font-weight: 700;
        box-shadow: var(--shadow-gold, 0 6px 18px rgba(194, 152, 47, 0.28));
      }

      .poem-text__verses {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        padding: 1.5rem 1.25rem;
        text-align: center;
        line-height: 2.1;
        background: var(--paper-2, #fbf7ee);
        border: 1px solid var(--line, rgba(120, 95, 60, 0.18));
        border-radius: var(--r, 16px);
        box-shadow: var(--shadow);
      }

      /* سه اندازهٔ متن (R7.3) */
      .poem-text__verses--small {
        font-size: 1.05rem;
      }
      .poem-text__verses--medium {
        font-size: 1.3rem;
      }
      .poem-text__verses--large {
        font-size: 1.65rem;
      }

      .poem-text__verse {
        margin: 0;
        padding: 0.45rem 0.75rem;
        border-radius: var(--r-sm, 10px);
        color: var(--ink, #2a2118);
        transition: background var(--t-fast, 150ms) var(--ease);
      }

      /* رنگ‌آمیزی ظریف و متناوب ابیات (couplet) برای خوانایی ادبی */
      .poem-text__verse:nth-child(4n + 1),
      .poem-text__verse:nth-child(4n + 2) {
        background: rgba(194, 152, 47, 0.05);
      }

      .poem-text__verse:hover {
        background: rgba(23, 111, 107, 0.06);
      }

      .poem-text__verse--right {
        text-align: right;
      }
      .poem-text__verse--left {
        text-align: left;
      }
      .poem-text__verse--centered {
        text-align: center;
      }
      .poem-text__verse--comment {
        text-align: center;
        color: var(--muted, #7a6a55);
        font-size: 0.85em;
        font-style: italic;
        background: transparent;
      }
    `,
  ],
})
export class PoemTextComponent implements OnInit {
  /** ابیات شعر؛ به همان ترتیب دریافتی رندر می‌شوند (R2.1، R2.3). */
  @Input() verses: Verse[] = [];

  /** اندازهٔ متن انتخاب‌شدهٔ جاری. */
  textSize: TextSize = DEFAULT_TEXT_SIZE;

  /** گزینه‌های اندازهٔ متن برای رندر دکمه‌های کنترل. */
  readonly sizeOptions = TEXT_SIZE_OPTIONS;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.textSize = this.readStoredSize();
  }

  /** تغییر اندازهٔ متن و ذخیرهٔ آن برای بازدیدهای بعدی (R7.3، R7.5). */
  setTextSize(size: TextSize): void {
    this.textSize = size;
    this.persistSize(size);
    this.cdr.markForCheck();
  }

  /** بازیابی اندازهٔ ذخیره‌شده از localStorage (با fallback به پیش‌فرض). */
  private readStoredSize(): TextSize {
    try {
      const stored = localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
      if (stored === 'small' || stored === 'medium' || stored === 'large') {
        return stored;
      }
    } catch {
      // دسترسی به localStorage ممکن است در دسترس نباشد؛ از پیش‌فرض استفاده می‌شود.
    }
    return DEFAULT_TEXT_SIZE;
  }

  /** ذخیرهٔ اندازهٔ انتخاب‌شده در localStorage. */
  private persistSize(size: TextSize): void {
    try {
      localStorage.setItem(TEXT_SIZE_STORAGE_KEY, size);
    } catch {
      // اگر ذخیره‌سازی ممکن نباشد، بی‌صدا صرف‌نظر می‌شود.
    }
  }
}
