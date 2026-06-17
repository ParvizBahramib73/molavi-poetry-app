import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { GanjoorService } from '../../core/ganjoor.service';
import { GanjoorApiError, PoemSummary } from '../../models';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { LoadingIndicatorComponent } from '../../shared/loading-indicator/loading-indicator.component';

/** کمینهٔ طول عبارت جست‌وجوی معتبر (R5.2). */
const MIN_TERM_LENGTH = 2;
/** بیشینهٔ طول عبارت جست‌وجو (R5.1). */
const MAX_TERM_LENGTH = 100;
/** پیام راهنمای فارسی برای ورودی نامعتبر (R5.2). */
const GUIDANCE_MESSAGE = 'عبارت جست‌وجو باید حداقل ۲ نویسه باشد.';

/**
 * ویوی جست‌وجوی اشعار مولوی (Search).
 *
 * این کامپوننت یک ورودی متن و فهرست نتایج را فراهم می‌کند و رفتارهای زیر را
 * تضمین می‌کند:
 * - اعتبارسنجی عبارت: عبارت خالی/تنها فاصله یا کوتاه‌تر از ۲ نویسه باعث نمایش
 *   پیام راهنمای فارسی می‌شود و هیچ درخواستی به API ارسال نمی‌شود (R5.2).
 *   همچنین عبارت پیش از ارسال تا حداکثر ۱۰۰ نویسه کوتاه می‌شود (R5.1).
 * - واکشی حداکثر ۵۰ نتیجهٔ محدود به مولوی از طریق
 *   {@link GanjoorService.searchPoems} (دامنه در سرویس به poetId=5 محدود می‌شود)
 *   و نمایش آن‌ها (R5.1).
 * - ناوبری به Reading_View هر نتیجه از مسیر `/poem/:id` با `routerLink` (R5.3).
 * - حالت «نتیجه‌ای یافت نشد» با {@link EmptyStateComponent} (R5.4).
 * - حالت خطا با {@link ErrorStateComponent} و دکمهٔ «تلاش مجدد» که همان عبارت
 *   واردشده را دوباره جست‌وجو می‌کند و عبارت واردشده حفظ می‌شود (R5.5).
 *
 * مسیر این کامپوننت `search` است و مقدار اولیهٔ عبارت می‌تواند از پارامتر
 * کوئری `?q=` (با `withComponentInputBinding`) خوانده شود.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
@Component({
  selector: 'app-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    LoadingIndicatorComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  template: `
    <section class="search" aria-label="جست‌وجوی اشعار مولوی">
      <h2 class="search__title">جست‌وجوی اشعار مولوی</h2>

      <form class="search__form" (ngSubmit)="onSubmit()">
        <input
          type="search"
          class="search__input"
          name="term"
          [(ngModel)]="term"
          [maxlength]="maxLength"
          placeholder="عبارت جست‌وجو را وارد کنید…"
          aria-label="عبارت جست‌وجو"
          autocomplete="off"
        />
        <button type="submit" class="search__submit">جست‌وجو</button>
      </form>

      @if (guidanceMessage) {
        <p class="search__guidance" role="status">{{ guidanceMessage }}</p>
      }

      @if (loading) {
        <app-loading-indicator
          message="در حال جست‌وجو…"
        ></app-loading-indicator>
      } @else if (error) {
        <app-error-state
          [message]="error.messageFa"
          (retry)="onRetry()"
        ></app-error-state>
      } @else if (searched && results.length === 0) {
        <app-empty-state message="نتیجه‌ای یافت نشد."></app-empty-state>
      } @else if (results.length > 0) {
        <ul class="search__results" aria-label="نتایج جست‌وجو">
          @for (item of results; track item.id) {
            <li class="search__result">
              <a class="search__result-link" [routerLink]="['/poem', item.id]">
                {{ item.title }}
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .search {
        padding: 1.5rem;
        max-width: 48rem;
        margin: 0 auto;
        animation: fadeSlideIn var(--t, 220ms) var(--ease) both;
      }

      .search__title {
        position: relative;
        margin: 0 0 1.25rem;
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--ink, #2a2118);
        padding-bottom: 0.5rem;
      }

      .search__title::after {
        content: '';
        position: absolute;
        inset-inline-start: 0;
        bottom: 0;
        width: 3.5rem;
        height: 3px;
        border-radius: var(--r-pill, 999px);
        background: var(--grad-gold, linear-gradient(135deg, #e3b94a, #c2982f));
      }

      .search__form {
        display: flex;
        gap: 0.6rem;
      }

      .search__input {
        flex: 1;
        padding: 0.65rem 1rem;
        font: inherit;
        color: var(--ink, #2a2118);
        background: var(--paper-2, #fbf7ee);
        border: 1px solid var(--line, rgba(120, 95, 60, 0.18));
        border-radius: var(--r-pill, 999px);
        box-shadow: var(--shadow-sm);
        transition: border-color var(--t, 200ms) var(--ease),
          box-shadow var(--t, 200ms) var(--ease);
      }

      .search__input:focus {
        outline: none;
        border-color: var(--gold, #c2982f);
        box-shadow: 0 0 0 3px rgba(227, 185, 74, 0.28);
      }

      .search__submit {
        padding: 0.65rem 1.5rem;
        font: inherit;
        font-weight: 700;
        color: #fff;
        background: var(--grad-teal, linear-gradient(135deg, #1f8c86, #176f6b));
        border: none;
        border-radius: var(--r-pill, 999px);
        cursor: pointer;
        box-shadow: 0 6px 16px rgba(23, 111, 107, 0.28);
        transition: transform var(--t-fast, 150ms) var(--ease),
          box-shadow var(--t-fast, 150ms) var(--ease), filter var(--t-fast, 150ms) var(--ease);
      }

      .search__submit:hover {
        transform: translateY(-2px);
        filter: brightness(1.05);
        box-shadow: 0 10px 22px rgba(23, 111, 107, 0.38);
      }

      .search__submit:active {
        transform: translateY(0);
      }

      .search__guidance {
        margin: 0.85rem 0 0;
        padding: 0.6rem 0.9rem;
        color: var(--rose, #9c4f3f);
        font-size: 0.95rem;
        background: rgba(156, 79, 63, 0.08);
        border-radius: var(--r-sm, 10px);
        border-inline-start: 3px solid var(--rose, #9c4f3f);
      }

      .search__results {
        list-style: none;
        margin: 1.5rem 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .search__result {
        margin: 0;
      }

      .search__result-link {
        position: relative;
        display: block;
        padding: 0.85rem 1.1rem;
        color: var(--ink, #2a2118);
        text-decoration: none;
        background: var(--paper-2, #fbf7ee);
        border: 1px solid var(--line, rgba(120, 95, 60, 0.18));
        border-radius: var(--r-sm, 10px);
        box-shadow: var(--shadow-sm);
        overflow: hidden;
        transition: transform var(--t-fast, 150ms) var(--ease),
          box-shadow var(--t-fast, 150ms) var(--ease),
          border-color var(--t-fast, 150ms) var(--ease),
          background var(--t-fast, 150ms) var(--ease);
      }

      .search__result-link::before {
        content: '';
        position: absolute;
        inset-inline-start: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: var(--grad-gold, linear-gradient(135deg, #e3b94a, #c2982f));
        transform: scaleY(0);
        transition: transform var(--t, 200ms) var(--ease);
      }

      .search__result-link:hover {
        transform: translateY(-2px);
        background: #fff;
        border-color: rgba(194, 152, 47, 0.45);
        box-shadow: var(--shadow);
        text-decoration: none;
      }

      .search__result-link:hover::before {
        transform: scaleY(1);
      }
    `,
  ],
})
export class SearchComponent implements OnInit {
  /** عبارت جست‌وجو از پارامتر کوئری `?q=` (با `withComponentInputBinding`). */
  @Input()
  set q(value: string) {
    this.term = value ?? '';
  }

  /** عبارت واردشده در ورودی (با دو طرفه‌بودن `ngModel`). حفظ می‌شود (R5.5). */
  term = '';

  /** بیشینهٔ طول مجاز ورودی (R5.1). */
  readonly maxLength = MAX_TERM_LENGTH;

  /** نتایج جست‌وجوی محدود به مولوی (حداکثر ۵۰، R5.1). */
  results: PoemSummary[] = [];

  /** نشانگر در حال بارگذاری بودن درخواست جست‌وجو (R6.3). */
  loading = false;

  /** خطای جست‌وجو در صورت ناموفق بودن درخواست (R5.5). */
  error: GanjoorApiError | null = null;

  /** پیام راهنمای فارسی هنگام ورودی نامعتبر (R5.2). */
  guidanceMessage = '';

  /** آیا حداقل یک جست‌وجوی معتبر انجام شده است (برای تمایز حالت خالی). */
  searched = false;

  /** عبارتِ آخرین جست‌وجوی معتبر؛ مبنای «تلاش مجدد» (R5.5). */
  private lastSearchedTerm = '';

  private subscription: Subscription | null = null;

  constructor(
    private readonly ganjoor: GanjoorService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /** اگر مقدار اولیه از `?q=` معتبر باشد، جست‌وجوی اولیه انجام می‌شود. */
  ngOnInit(): void {
    if (this.term && this.term.trim().length >= MIN_TERM_LENGTH) {
      this.onSubmit();
    }
  }

  /** اعتبارسنجی و آغاز جست‌وجو هنگام ثبت فرم (R5.1, R5.2). */
  onSubmit(): void {
    const trimmed = this.term.trim();

    // اعتبارسنجی: خالی/تنها فاصله یا کوتاه‌تر از ۲ نویسه (R5.2).
    if (trimmed.length < MIN_TERM_LENGTH) {
      this.guidanceMessage = GUIDANCE_MESSAGE;
      this.results = [];
      this.error = null;
      this.searched = false;
      return;
    }

    // محدودسازی طول به حداکثر ۱۰۰ نویسه پیش از ارسال (R5.1).
    const term = trimmed.slice(0, MAX_TERM_LENGTH);
    this.guidanceMessage = '';
    this.runSearch(term);
  }

  /** تلاش مجدد با همان عبارت آخرین جست‌وجو؛ عبارت واردشده حفظ می‌شود (R5.5). */
  onRetry(): void {
    if (this.lastSearchedTerm) {
      this.runSearch(this.lastSearchedTerm);
    }
  }

  /** اجرای واقعی جست‌وجو محدود به مولوی (poetId=5 در سرویس تضمین می‌شود). */
  private runSearch(term: string): void {
    this.lastSearchedTerm = term;
    this.loading = true;
    this.error = null;
    this.searched = true;

    this.subscription?.unsubscribe();
    // صفحهٔ ۱؛ سرویس دامنه را به مولوی محدود و نتایج را به ۵۰ مورد محدود می‌کند.
    this.subscription = this.ganjoor.searchPoems(term, 1).subscribe({
      next: (page) => {
        this.results = page.results;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err: GanjoorApiError) => {
        this.error = err;
        this.results = [];
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
