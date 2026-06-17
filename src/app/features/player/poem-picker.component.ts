import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { Router } from '@angular/router';

import { GanjoorService } from '../../core/ganjoor.service';
import {
  Category,
  CategorySummary,
  GanjoorApiError,
  PoemSummary,
} from '../../models';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { LoadingIndicatorComponent } from '../../shared/loading-indicator/loading-indicator.component';

/** یک سطح ناوبری در شیت انتخاب شعر (برای دکمهٔ بازگشت). */
interface PickerLevel {
  title: string;
  categories: CategorySummary[];
  poems: PoemSummary[];
}

/**
 * شیت پایین‌کشِ «انتخاب شعر» (Poem_Picker).
 *
 * از پایین صفحه بالا می‌آید و به کاربر اجازه می‌دهد آثار مولانا را به‌صورت
 * سلسله‌مراتبی مرور کند: آثار ← دسته ← شعرها. با استفادهٔ مجدد از
 * {@link GanjoorService.getPoet} (سطح ریشه) و {@link GanjoorService.getCategory}
 * (ورود به هر دسته) و حفظ ترتیب اصلی. انتخاب یک شعر به مسیر
 * `/poem/{id}/listen` ناوبری می‌کند و شیت را می‌بندد.
 *
 * سبک: تیره، مینیمال، طلایی-عاجی، هماهنگ با پخش‌کننده.
 */
@Component({
  selector: 'app-poem-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingIndicatorComponent, ErrorStateComponent],
  template: `
    @if (open) {
      <div class="picker" dir="rtl">
        <button
          type="button"
          class="picker__backdrop"
          aria-label="بستن"
          (click)="close()"
        ></button>

        <div
          class="picker__sheet"
          role="dialog"
          aria-modal="true"
          aria-label="انتخاب شعر"
        >
          <div class="picker__grabber" aria-hidden="true"></div>

          <header class="picker__head">
            @if (canGoBack) {
              <button
                type="button"
                class="picker__back"
                aria-label="بازگشت"
                (click)="goBack()"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 5l7 7-7 7"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            } @else {
              <span class="picker__back picker__back--spacer" aria-hidden="true"></span>
            }
            <h2 class="picker__title">{{ heading }}</h2>
            <button
              type="button"
              class="picker__close"
              aria-label="بستن"
              (click)="close()"
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </header>

          <div class="picker__body">
            @if (loading) {
              <app-loading-indicator message="در حال بارگذاری…" />
            } @else if (error) {
              <app-error-state
                [message]="error.messageFa"
                (retry)="reloadCurrent()"
              />
            } @else {
              <ul class="picker__list">
                @for (cat of categories; track cat.id) {
                  <li class="picker__item">
                    <button
                      type="button"
                      class="picker__row picker__row--cat"
                      (click)="openCategory(cat)"
                    >
                      <span class="picker__row-text">{{ cat.title }}</span>
                      <span class="picker__chev" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path
                            d="M15 5l-7 7 7 7"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </span>
                    </button>
                  </li>
                }
                @for (poem of poems; track poem.id) {
                  <li class="picker__item">
                    <button
                      type="button"
                      class="picker__row picker__row--poem"
                      (click)="pick(poem.id)"
                    >
                      <span class="picker__row-text">{{ poem.title }}</span>
                      <span class="picker__play" aria-hidden="true">▶</span>
                    </button>
                  </li>
                } @empty {
                  @if (categories.length === 0) {
                    <li class="picker__empty">موردی برای نمایش نیست.</li>
                  }
                }
              </ul>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .picker {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        font-family: Vazirmatn, system-ui, sans-serif;
      }

      .picker__backdrop {
        position: absolute;
        inset: 0;
        border: 0;
        padding: 0;
        background: rgba(5, 7, 15, 0.66);
        backdrop-filter: blur(3px);
        cursor: pointer;
        animation: pickerFade 200ms ease both;
      }

      .picker__sheet {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 430px;
        margin-inline: auto;
        max-height: 78%;
        display: flex;
        flex-direction: column;
        background: linear-gradient(180deg, #131c33, #0f172a);
        color: #f8f5ec;
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        border-top: 1px solid rgba(212, 175, 55, 0.3);
        box-shadow: 0 -18px 50px rgba(0, 0, 0, 0.55);
        animation: pickerSlide 260ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
      }

      .picker__grabber {
        width: 42px;
        height: 4px;
        margin: 0.6rem auto 0.2rem;
        border-radius: 999px;
        background: rgba(248, 245, 236, 0.3);
      }

      .picker__head {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 0.9rem 0.7rem;
        border-bottom: 1px solid rgba(212, 175, 55, 0.16);
      }

      .picker__title {
        flex: 1 1 auto;
        margin: 0;
        text-align: center;
        font-size: 1rem;
        font-weight: 700;
        color: #d4af37;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .picker__back,
      .picker__close {
        flex: 0 0 auto;
        width: 2.2rem;
        height: 2.2rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        line-height: 1;
        color: #f8f5ec;
        background: rgba(248, 245, 236, 0.06);
        border: 1px solid rgba(212, 175, 55, 0.25);
        border-radius: 999px;
        cursor: pointer;
      }

      .picker__back--spacer {
        background: transparent;
        border-color: transparent;
        cursor: default;
      }

      .picker__body {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 0.5rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom));
        -webkit-overflow-scrolling: touch;
      }

      .picker__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .picker__row {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.8rem 0.9rem;
        font: inherit;
        text-align: start;
        color: #f8f5ec;
        background: rgba(248, 245, 236, 0.04);
        border: 1px solid rgba(212, 175, 55, 0.14);
        border-radius: 14px;
        cursor: pointer;
        transition: background 150ms ease, border-color 150ms ease,
          transform 150ms ease;
      }

      .picker__row:hover {
        background: rgba(212, 175, 55, 0.12);
        border-color: rgba(212, 175, 55, 0.4);
        transform: translateY(-1px);
      }

      .picker__row-text {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .picker__chev,
      .picker__play {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: rgba(212, 175, 55, 0.85);
        font-size: 0.85rem;
      }

      .picker__back svg,
      .picker__close svg {
        width: 1.05rem;
        height: 1.05rem;
        display: block;
      }

      .picker__chev svg {
        width: 0.95rem;
        height: 0.95rem;
        display: block;
      }

      .picker__empty {
        list-style: none;
        text-align: center;
        padding: 1.5rem 1rem;
        color: rgba(248, 245, 236, 0.6);
      }

      @keyframes pickerSlide {
        from {
          transform: translateY(100%);
          opacity: 0.6;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      @keyframes pickerFade {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .picker__sheet,
        .picker__backdrop {
          animation: none !important;
        }
        .picker__row {
          transition: none !important;
        }
      }
    `,
  ],
})
export class PoemPickerComponent {
  /** آیا شیت باز است. با باز شدن نخستین‌بار، سطح ریشه بارگذاری می‌شود. */
  @Input()
  set open(value: boolean) {
    const next = !!value;
    const wasOpen = this._open;
    this._open = next;
    if (next && !wasOpen && !this.rootLoaded) {
      this.loadRoot();
    }
  }
  get open(): boolean {
    return this._open;
  }
  private _open = false;

  /** رویداد بسته‌شدن شیت (برای هماهنگی وضعیت در والد). */
  @Output() closed = new EventEmitter<void>();

  /** عنوان سطح جاری. */
  heading = 'آثار مولانا';

  /** دسته‌های (آثار/زیردسته‌های) سطح جاری. */
  categories: CategorySummary[] = [];

  /** شعرهای سطح جاری. */
  poems: PoemSummary[] = [];

  /** وضعیت بارگذاری. */
  loading = false;

  /** خطای جاری. */
  error: GanjoorApiError | null = null;

  /** پشتهٔ سطوح پیشین برای دکمهٔ بازگشت. */
  private history: PickerLevel[] = [];

  /** آیا سطح ریشه یک‌بار بارگذاری شده است. */
  private rootLoaded = false;

  /** آخرین اقدام بارگذاری برای تلاش مجدد. */
  private lastLoad: () => void = () => this.loadRoot();

  constructor(
    private readonly ganjoor: GanjoorService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /** آیا امکان بازگشت به سطح پیشین هست. */
  get canGoBack(): boolean {
    return this.history.length > 0;
  }

  /** بستن شیت. */
  close(): void {
    this._open = false;
    this.closed.emit();
  }

  /** تلاش مجدد بارگذاری سطح جاری. */
  reloadCurrent(): void {
    this.lastLoad();
  }

  /** بارگذاری سطح ریشه: آثار سطح‌بالای مولانا. */
  private loadRoot(): void {
    this.lastLoad = () => this.loadRoot();
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.ganjoor.getPoet().subscribe({
      next: (poet) => {
        this.rootLoaded = true;
        this.history = [];
        this.heading = poet.rootCategory?.title || 'آثار مولانا';
        this.categories = poet.rootCategory?.children ?? [];
        this.poems = poet.rootCategory?.poems ?? [];
        this.loading = false;
        this.error = null;
        this.cdr.markForCheck();
      },
      error: (err: GanjoorApiError) => {
        this.error = err;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** ورود به یک دسته و نمایش زیردسته‌ها/شعرهای آن. */
  openCategory(cat: CategorySummary): void {
    this.lastLoad = () => this.openCategory(cat);
    const snapshot: PickerLevel = {
      title: this.heading,
      categories: this.categories,
      poems: this.poems,
    };
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.ganjoor.getCategory(cat.id).subscribe({
      next: (category: Category) => {
        this.history = [...this.history, snapshot];
        this.heading = category.title || cat.title;
        this.categories = category.children ?? [];
        this.poems = category.poems ?? [];
        this.loading = false;
        this.error = null;
        this.cdr.markForCheck();
      },
      error: (err: GanjoorApiError) => {
        this.error = err;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** بازگشت به سطح پیشین. */
  goBack(): void {
    const previous = this.history.pop();
    if (!previous) {
      return;
    }
    this.history = [...this.history];
    this.heading = previous.title;
    this.categories = previous.categories;
    this.poems = previous.poems;
    this.error = null;
    this.lastLoad = () => this.loadRoot();
    this.cdr.markForCheck();
  }

  /** انتخاب یک شعر: ناوبری به پخش‌کننده و بستن شیت. */
  pick(poemId: number): void {
    void this.router.navigate(['/poem', poemId, 'listen']);
    this.close();
  }
}
