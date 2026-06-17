import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { Translation, TranslationVerse } from '../../models/models';

/**
 * پنل نمایش ترجمه‌های یک شعر.
 *
 * فهرست ترجمه‌ها را با حفظ ترتیب دریافتی از Ganjoor_API به‌صورت موارد مجزا و
 * قابل‌انتخاب نمایش می‌دهد و با انتخاب هر ترجمه، متنِ آن را در کنار متن اصلی شعر
 * (بدون حذف متن شعر) نشان می‌دهد. این پنل بخشی جانبی/زیرینِ Reading_View است و
 * والد (ReadingView) جای‌گذاری آن را در کنار متن شعر انجام می‌دهد.
 *
 * حالت‌ها:
 * - آرایهٔ ترجمه‌ها خالی باشد → «ترجمه‌ای برای این شعر موجود نیست» (R4.3).
 * - ترجمهٔ انتخاب‌شده هیچ بیتی/متنی نداشته باشد → «متن ترجمه در دسترس نیست» (R4.4).
 * - خطا در دریافت → پیام خطای فارسی + دکمهٔ «تلاش مجدد» با حفظ محتوای پیشین (R4.5).
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
@Component({
  selector: 'app-translation-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, ErrorStateComponent],
  template: `
    <section class="translations" dir="rtl" aria-label="ترجمه‌ها">
      <h3 class="translations__heading">ترجمه‌ها</h3>

      @if (error) {
        <!-- خطا در دریافت: محتوای پیشین حفظ می‌شود و گزینهٔ تلاش مجدد ارائه می‌شود (R4.5) -->
        <app-error-state
          [message]="errorMessage"
          (retry)="onRetry()"
        ></app-error-state>
      }

      @if (!translations || translations.length === 0) {
        <!-- نبودِ ترجمه (R4.3) -->
        <app-empty-state message="ترجمه‌ای برای این شعر موجود نیست"></app-empty-state>
      } @else {
        <!-- فهرست ترجمه‌ها با حفظ ترتیب دریافتی و قابلیت انتخاب (R4.1) -->
        <ul class="translations__list" role="listbox" aria-label="فهرست ترجمه‌ها">
          @for (translation of translations; track $index) {
            <li class="translations__item">
              <button
                type="button"
                class="translations__option"
                role="option"
                [class.translations__option--active]="$index === selectedIndex"
                [attr.aria-selected]="$index === selectedIndex"
                (click)="select($index)"
              >
                <span class="translations__lang">{{ translation.languageName }}</span>
                @if (translation.contributorName) {
                  <span class="translations__contributor"
                    >— {{ translation.contributorName }}</span
                  >
                }
              </button>
            </li>
          }
        </ul>

        <!-- متن ترجمهٔ انتخاب‌شده در کنار متن اصلی شعر نمایش داده می‌شود (R4.2) -->
        @if (selectedTranslation) {
          <div class="translations__text" aria-live="polite">
            @if (hasText(selectedTranslation)) {
              @for (verse of selectedTranslation.verses; track verse.vOrder) {
                <p class="translations__verse">{{ verse.text }}</p>
              }
            } @else {
              <!-- متن ترجمهٔ انتخاب‌شده خالی است (R4.4) -->
              <app-empty-state message="متن ترجمه در دسترس نیست"></app-empty-state>
            }
          </div>
        }
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .translations {
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        padding: 1.25rem;
        border: 1px solid var(--line, rgba(120, 95, 60, 0.18));
        border-radius: var(--r, 16px);
        background: linear-gradient(135deg, var(--paper-2, #fbf7ee), #f6efe0);
        box-shadow: var(--shadow);
      }

      .translations__heading {
        position: relative;
        margin: 0;
        padding-bottom: 0.4rem;
        font-size: 1.15rem;
        font-weight: 800;
        color: var(--ink, #2a2118);
      }

      .translations__heading::after {
        content: '';
        position: absolute;
        inset-inline-start: 0;
        bottom: 0;
        width: 2.5rem;
        height: 2px;
        border-radius: var(--r-pill, 999px);
        background: var(--grad-gold, linear-gradient(135deg, #e3b94a, #c2982f));
      }

      .translations__list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .translations__item {
        margin: 0;
      }

      .translations__option {
        display: inline-flex;
        align-items: baseline;
        gap: 0.35rem;
        padding: 0.4rem 0.95rem;
        font: inherit;
        color: var(--teal, #176f6b);
        background: #fff;
        border: 1px solid var(--line, rgba(120, 95, 60, 0.18));
        border-radius: var(--r-pill, 999px);
        cursor: pointer;
        box-shadow: var(--shadow-sm);
        transition: transform var(--t-fast, 150ms) var(--ease),
          box-shadow var(--t-fast, 150ms) var(--ease),
          background var(--t-fast, 150ms) var(--ease),
          color var(--t-fast, 150ms) var(--ease);
      }

      .translations__option:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow);
      }

      .translations__option--active {
        color: #3a2c14;
        background: var(--grad-gold, linear-gradient(135deg, #e3b94a, #c2982f));
        border-color: transparent;
        font-weight: 700;
        box-shadow: var(--shadow-gold, 0 6px 18px rgba(194, 152, 47, 0.28));
      }

      .translations__lang {
        font-weight: 600;
      }

      .translations__contributor {
        font-size: 0.85rem;
        opacity: 0.85;
      }

      .translations__text {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        padding: 0.85rem 1rem;
        margin-top: 0.25rem;
        line-height: 2;
        background: rgba(255, 255, 255, 0.55);
        border: 1px solid var(--line, rgba(120, 95, 60, 0.18));
        border-radius: var(--r-sm, 10px);
        border-inline-start: 3px solid var(--gold, #c2982f);
      }

      .translations__verse {
        margin: 0;
        color: var(--ink, #2a2118);
      }
    `,
  ],
})
export class TranslationPanelComponent {
  /** فهرست ترجمه‌های شعر؛ ترتیب دریافتی از Ganjoor_API حفظ می‌شود (R4.1). */
  @Input() translations: Translation[] = [];

  /** پیام خطای فارسی در صورت ناموفق‌بودن دریافت ترجمه‌ها/متن ترجمه (R4.5). */
  @Input() error: GanjoorApiErrorLike | null = null;

  /** رویداد تلاش مجدد برای والد تا دریافت ترجمه‌ها را از سر بگیرد (R4.5). */
  @Output() retry = new EventEmitter<void>();

  /** رویداد تغییر انتخاب ترجمه (نمایهٔ ترجمهٔ انتخاب‌شده). */
  @Output() selectionChange = new EventEmitter<number>();

  /** نمایهٔ ترجمهٔ انتخاب‌شده درون آرایهٔ ورودی. */
  selectedIndex = 0;

  /** پیام خطای فارسی قابل نمایش. */
  get errorMessage(): string {
    return this.error?.messageFa ?? 'دریافت ترجمه‌ها ناموفق بود. لطفاً دوباره تلاش کنید.';
  }

  /** ترجمهٔ انتخاب‌شدهٔ جاری (یا null اگر فهرست خالی/نمایه نامعتبر باشد). */
  get selectedTranslation(): Translation | null {
    if (!this.translations || this.translations.length === 0) {
      return null;
    }
    const index = Math.min(Math.max(this.selectedIndex, 0), this.translations.length - 1);
    return this.translations[index] ?? null;
  }

  /** انتخاب یک ترجمه بر اساس نمایه؛ متن آن در کنار متن شعر نمایش داده می‌شود (R4.2). */
  select(index: number): void {
    if (index < 0 || index >= this.translations.length) {
      return;
    }
    this.selectedIndex = index;
    this.selectionChange.emit(index);
  }

  /** انتشار رویداد تلاش مجدد بدون حذف محتوای پیشین (R4.5). */
  onRetry(): void {
    this.retry.emit();
  }

  /** بررسی این‌که ترجمه دست‌کم یک بیت با متنِ ناتهی دارد (R4.4). */
  hasText(translation: Translation): boolean {
    return (
      Array.isArray(translation.verses) &&
      translation.verses.some(
        (verse: TranslationVerse) => !!verse?.text && verse.text.trim().length > 0,
      )
    );
  }
}

/**
 * شکل سبکِ خطای سرویس برای ورودی پنل (هم‌راستا با GanjoorApiError).
 * تنها فیلد موردنیاز برای نمایش پیام فارسی است.
 */
export interface GanjoorApiErrorLike {
  messageFa: string;
}
