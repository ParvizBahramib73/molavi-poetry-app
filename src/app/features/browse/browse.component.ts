import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { GanjoorService } from '../../core/ganjoor.service';
import {
  Category,
  CategorySummary,
  GanjoorApiError,
  ViewState,
} from '../../models';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { LoadingIndicatorComponent } from '../../shared/loading-indicator/loading-indicator.component';

/**
 * یک گام در مسیر سلسله‌مراتبی مرور (breadcrumb).
 *
 * `catId === null` به معنای ریشهٔ آثار مولوی است که با {@link GanjoorService.getPoet}
 * بارگذاری می‌شود؛ مقادیر عددی با {@link GanjoorService.getCategory} بارگذاری می‌شوند.
 */
interface Breadcrumb {
  catId: number | null;
  title: string;
}

/**
 * ویوی مرور آثار مولوی (Browse).
 *
 * این کامپوننت ساختار سلسله‌مراتبی آثار مولوی (Work → Category → Poem) را با
 * مدیریت {@link ViewState} نمایش می‌دهد:
 * - در init، آثار سطح‌بالا از {@link GanjoorService.getPoet} (دستهٔ ریشهٔ مولوی)
 *   واکشی می‌شوند (R1.1).
 * - انتخاب یک Work/Category با {@link GanjoorService.getCategory} زیرشاخه‌ها و
 *   شعرهای آن را با حفظ ترتیب دریافتی نمایش می‌دهد (R1.2، R1.3).
 * - انتخاب یک Poem با Angular Router به مسیر `/poem/:id` می‌رود.
 * - وضعیت‌های loading/error(retry)/empty یکپارچه مدیریت می‌شوند و هنگام خطا
 *   محتوای قبلی بدون تغییر حفظ می‌شود (R1.5، R1.6، R6.3).
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.3
 */
@Component({
  selector: 'app-browse',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LoadingIndicatorComponent,
    ErrorStateComponent,
    EmptyStateComponent,
  ],
  template: `
    <section class="browse" aria-label="مرور آثار مولوی">
      <h2 class="browse__title">مرور آثار مولوی</h2>

      @if (breadcrumbs().length) {
        <nav class="breadcrumbs" aria-label="مسیر">
          @for (crumb of breadcrumbs(); track $index; let last = $last) {
            @if (last) {
              <span class="breadcrumbs__current" aria-current="page">{{ crumb.title }}</span>
            } @else {
              <button
                type="button"
                class="breadcrumbs__link"
                (click)="navigateToCrumb(crumb, $index)"
              >
                {{ crumb.title }}
              </button>
              <span class="breadcrumbs__sep" aria-hidden="true">›</span>
            }
          }
        </nav>
      }

      @if (state().loading) {
        <app-loading-indicator />
      }

      @if (state().error; as error) {
        <app-error-state [message]="error.messageFa" (retry)="retry()" />
      }

      @let data = state().data;
      @if (data && (data.children.length || data.poems.length)) {
        <div class="browse__content">
          @if (data.children.length) {
            <ul class="browse__list" aria-label="دسته‌ها">
              @for (child of data.children; track child.id) {
                <li class="browse__item">
                  <button
                    type="button"
                    class="browse__link browse__link--cat"
                    (click)="openCategory(child)"
                  >
                    {{ child.title }}
                  </button>
                </li>
              }
            </ul>
          }

          @if (data.poems.length) {
            <ul class="browse__list" aria-label="شعرها">
              @for (poem of data.poems; track poem.id) {
                <li class="browse__item">
                  <a class="browse__link browse__link--poem" [routerLink]="['/poem', poem.id]">
                    {{ poem.title }}
                  </a>
                </li>
              }
            </ul>
          }
        </div>
      } @else if (data && !state().loading && !state().error) {
        <app-empty-state message="محتوایی برای نمایش وجود ندارد." />
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .browse {
        padding: 1.25rem;
        max-width: 60rem;
        margin: 0 auto;
        animation: fadeSlideIn var(--t, 220ms) var(--ease) both;
      }

      .browse__title {
        position: relative;
        margin: 0 0 1.25rem;
        font-size: 1.6rem;
        font-weight: 800;
        color: var(--ink, #2a2118);
        padding-bottom: 0.5rem;
      }

      .browse__title::after {
        content: '';
        position: absolute;
        inset-inline-start: 0;
        bottom: 0;
        width: 3.5rem;
        height: 3px;
        border-radius: var(--r-pill, 999px);
        background: var(--grad-gold, linear-gradient(135deg, #e3b94a, #c2982f));
      }

      .breadcrumbs {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.35rem;
        margin-bottom: 1.25rem;
        padding: 0.5rem 0.85rem;
        font-size: 0.95rem;
        background: var(--paper-2, #fbf7ee);
        border: 1px solid var(--line, rgba(120, 95, 60, 0.18));
        border-radius: var(--r-pill, 999px);
        box-shadow: var(--shadow-sm);
      }

      .breadcrumbs__link {
        padding: 0.1rem 0.4rem;
        font: inherit;
        color: var(--teal, #176f6b);
        background: none;
        border: none;
        border-radius: var(--r-sm, 10px);
        cursor: pointer;
        transition: color var(--t-fast, 150ms) var(--ease);
      }

      .breadcrumbs__link:hover {
        color: var(--teal-2, #1f8c86);
        text-decoration: underline;
      }

      .breadcrumbs__current {
        color: var(--ink, #2a2118);
        font-weight: 700;
        padding-inline: 0.4rem;
      }

      .breadcrumbs__sep {
        color: var(--gold, #c2982f);
      }

      .browse__content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .browse__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .browse__item {
        margin: 0;
      }

      .browse__link {
        position: relative;
        display: block;
        width: 100%;
        padding: 0.85rem 1.1rem;
        font: inherit;
        text-align: right;
        text-decoration: none;
        color: var(--ink, #2a2118);
        background: var(--paper-2, #fbf7ee);
        border: 1px solid var(--line, rgba(120, 95, 60, 0.18));
        border-radius: var(--r-sm, 10px);
        box-shadow: var(--shadow-sm);
        cursor: pointer;
        overflow: hidden;
        transition: transform var(--t-fast, 150ms) var(--ease),
          box-shadow var(--t-fast, 150ms) var(--ease),
          border-color var(--t-fast, 150ms) var(--ease),
          background var(--t-fast, 150ms) var(--ease);
      }

      /* لبهٔ تذهیب طلایی که با hover ظاهر می‌شود */
      .browse__link::before {
        content: '';
        position: absolute;
        inset-inline-start: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: var(--grad-gold, linear-gradient(135deg, #e3b94a, #c2982f));
        transform: scaleY(0);
        transform-origin: center;
        transition: transform var(--t, 200ms) var(--ease);
      }

      .browse__link:hover {
        transform: translateY(-2px);
        background: #fff;
        border-color: rgba(194, 152, 47, 0.45);
        box-shadow: var(--shadow);
      }

      .browse__link:hover::before {
        transform: scaleY(1);
      }

      .browse__link--cat {
        font-weight: 700;
      }

      .browse__link--poem {
        color: var(--teal, #176f6b);
      }
    `,
  ],
})
export class BrowseComponent implements OnInit {
  private readonly ganjoor = inject(GanjoorService);

  /** وضعیت بارگذاری/خطا/دادهٔ دستهٔ جاری در حال نمایش. */
  readonly state = signal<ViewState<Category>>({
    loading: false,
    error: null,
    data: null,
  });

  /** مسیر سلسله‌مراتبی جاری (از ریشه تا دستهٔ فعلی). */
  readonly breadcrumbs = signal<Breadcrumb[]>([]);

  /** آخرین عملیات واکشی، برای اجرای دوباره هنگام «تلاش مجدد» (R1.6). */
  private lastLoad: (() => void) | null = null;

  ngOnInit(): void {
    this.loadRoot();
  }

  /**
   * بارگذاری آثار سطح‌بالای مولوی از طریق دستهٔ ریشهٔ شاعر (R1.1).
   */
  loadRoot(): void {
    this.lastLoad = () => this.loadRoot();
    this.load(
      this.ganjoor.getPoet().pipe(map((poet) => poet.rootCategory)),
      (cat) => [{ catId: null, title: cat.title || 'آثار مولوی' }],
    );
  }

  /**
   * پیمایش به یک Work/Category انتخاب‌شده از فهرست جاری (R1.2، R1.3).
   */
  openCategory(summary: CategorySummary): void {
    this.loadCategory(summary.id, summary.title, this.breadcrumbs());
  }

  /**
   * پیمایش به یکی از گام‌های مسیر سلسله‌مراتبی (breadcrumb).
   */
  navigateToCrumb(crumb: Breadcrumb, index: number): void {
    if (crumb.catId === null) {
      this.loadRoot();
      return;
    }
    this.loadCategory(crumb.catId, crumb.title, this.breadcrumbs().slice(0, index));
  }

  /**
   * تلاش مجدد آخرین واکشی ناموفق (R1.6).
   */
  retry(): void {
    this.lastLoad?.();
  }

  /**
   * بارگذاری یک دسته و افزودن آن به انتهای مسیر `parentTrail`.
   */
  private loadCategory(
    catId: number,
    title: string,
    parentTrail: Breadcrumb[],
  ): void {
    this.lastLoad = () => this.loadCategory(catId, title, parentTrail);
    this.load(this.ganjoor.getCategory(catId), () => [
      ...parentTrail,
      { catId, title },
    ]);
  }

  /**
   * اجراکنندهٔ مشترک واکشی: نشانگر بارگذاری را فعال می‌کند، دادهٔ قبلی را حفظ
   * می‌کند، و در موفقیت/خطا وضعیت را به‌روزرسانی می‌کند. هنگام خطا محتوای قبلی
   * بدون تغییر باقی می‌ماند (R1.6، R6.3).
   */
  private load(
    source$: Observable<Category>,
    buildTrail: (cat: Category) => Breadcrumb[],
  ): void {
    // حفظ دادهٔ قبلی حین بارگذاری/خطا (preserve prior content).
    this.state.update((s) => ({ loading: true, error: null, data: s.data }));

    source$.subscribe({
      next: (cat) => {
        this.state.set({ loading: false, error: null, data: cat });
        this.breadcrumbs.set(buildTrail(cat));
      },
      error: (err: GanjoorApiError) => {
        this.state.update((s) => ({ loading: false, error: err, data: s.data }));
      },
    });
  }
}
