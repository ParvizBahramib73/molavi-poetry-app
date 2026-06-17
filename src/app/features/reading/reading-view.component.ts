import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { GanjoorService } from '../../core/ganjoor.service';
import { GanjoorApiError, Poem, Recitation } from '../../models';
import { AudioPlayerComponent } from '../audio/audio-player.component';
import { RecitationListComponent } from '../audio/recitation-list.component';
import { TranslationPanelComponent } from '../translations/translation-panel.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { LoadingIndicatorComponent } from '../../shared/loading-indicator/loading-indicator.component';
import { PoemTextComponent } from './poem-text.component';

/**
 * نمای مطالعهٔ شعر (Reading_View).
 *
 * شعر را با `getPoem(id)` واکشی می‌کند و عنوان و مسیر سلسله‌مراتبی کامل
 * (`fullTitle`) را نمایش می‌دهد. متن ابیات با {@link PoemTextComponent} رندر
 * می‌شود. این نما عامدانه به سه بخش مفهومی محدود است (R7.2): متن، خوانش صوتی
 * ({@link RecitationListComponent} + {@link AudioPlayerComponent}) و ترجمه
 * ({@link TranslationPanelComponent}). انتخاب یک خوانش، آن را به پخش‌کنندهٔ صوت
 * پاس می‌دهد (R3.2).
 *
 * حالت‌ها: بارگذاری ({@link LoadingIndicatorComponent})، خطا + تلاش مجدد با حفظ
 * محتوای قبلی ({@link ErrorStateComponent})، و خالی/بدون متن
 * ({@link EmptyStateComponent}).
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 7.2, 7.3, 7.5
 */
@Component({
  selector: 'app-reading-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PoemTextComponent,
    LoadingIndicatorComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    RecitationListComponent,
    AudioPlayerComponent,
    TranslationPanelComponent,
    RouterLink,
  ],
  template: `
    <article class="reading" dir="rtl">
      @if (poem) {
        <header class="reading__header">
          <h1 class="reading__title">{{ poem.title }}</h1>
          <span class="reading__divider" aria-hidden="true">
            <span class="reading__divider-dot">۞</span>
          </span>
          @if (poem.fullTitle && poem.fullTitle !== poem.title) {
            <p class="reading__path">{{ poem.fullTitle }}</p>
          }
          <a
            class="reading__listen"
            [routerLink]="['/poem', poem.id, 'listen']"
          >
            <span class="reading__listen-icon" aria-hidden="true">♫</span>
            شنیدن همگام با متن
          </a>
        </header>
      }

      <!-- بخش ۱: متن شعر (R7.2) -->
      <section class="reading__section reading__text" aria-label="متن شعر">
        @if (loading) {
          <app-loading-indicator message="در حال بارگذاری شعر…" />
        } @else if (error) {
          <app-error-state
            [message]="error.messageFa"
            (retry)="reload()"
          />
        } @else if (poem) {
          @if (poem.verses.length > 0) {
            <app-poem-text [verses]="poem.verses" />
          } @else {
            <app-empty-state message="متن این شعر در دسترس نیست." />
          }
        }
      </section>

      <!-- بخش ۲: خوانش صوتی — فهرست خوانش‌ها و پخش‌کنندهٔ صوت (R3، R7.2) -->
      <section
        class="reading__section reading__audio"
        aria-label="خوانش صوتی"
      >
        @if (poem) {
          <app-recitation-list
            [recitations]="poem.recitations"
            [selectedId]="selectedRecitation?.id ?? null"
            (select)="onSelectRecitation($event)"
          />
          @if (selectedRecitation) {
            <app-audio-player [recitation]="selectedRecitation" />
          }
        }
      </section>

      <!-- بخش ۳: ترجمه‌ها — پنل نمایش و انتخاب ترجمه (R4، R7.2) -->
      <section
        class="reading__section reading__translation"
        aria-label="ترجمه"
      >
        @if (poem) {
          <app-translation-panel [translations]="poem.translations" />
        }
      </section>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .reading {
        display: flex;
        flex-direction: column;
        gap: 1.75rem;
        max-width: 48rem;
        margin: 0 auto;
        padding: 1.75rem 1rem;
        animation: fadeSlideIn var(--t, 220ms) var(--ease) both;
      }

      .reading__header {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding-bottom: 0.5rem;
      }

      .reading__title {
        margin: 0 0 0.5rem;
        font-size: 1.85rem;
        font-weight: 800;
        line-height: 1.5;
        background: linear-gradient(135deg, var(--ink, #2a2118), var(--rose, #9c4f3f));
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: var(--ink, #2a2118);
      }

      /* جداکنندهٔ تزئینی زیر عنوان (صرفاً تزئینی) */
      .reading__divider {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        width: 100%;
        max-width: 18rem;
        margin: 0.25rem 0 0.75rem;
        color: var(--gold, #c2982f);
      }

      .reading__divider::before,
      .reading__divider::after {
        content: '';
        height: 1px;
        flex: 1 1 auto;
        background: linear-gradient(
          90deg,
          transparent,
          var(--gold, #c2982f)
        );
      }

      .reading__divider::after {
        background: linear-gradient(
          90deg,
          var(--gold, #c2982f),
          transparent
        );
      }

      .reading__divider-dot {
        font-size: 1.1rem;
        line-height: 1;
        color: var(--gold, #c2982f);
        filter: drop-shadow(0 1px 1px rgba(194, 152, 47, 0.4));
      }

      .reading__path {
        margin: 0;
        color: var(--muted, #7a6a55);
        font-size: 0.92rem;
        line-height: 1.7;
      }

      .reading__section {
        width: 100%;
      }

      .reading__listen {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        margin-top: 0.85rem;
        padding: 0.55rem 1.25rem;
        font-weight: 700;
        font-size: 0.95rem;
        text-decoration: none;
        color: #fff;
        background: linear-gradient(135deg, #1f8c86, #176f6b);
        border-radius: var(--r-pill, 999px);
        box-shadow: 0 6px 16px rgba(23, 111, 107, 0.28);
        transition: transform var(--t-fast, 150ms) var(--ease),
          box-shadow var(--t-fast, 150ms) var(--ease),
          filter var(--t-fast, 150ms) var(--ease);
      }

      .reading__listen:hover {
        transform: translateY(-2px);
        filter: brightness(1.05);
        box-shadow: 0 10px 22px rgba(23, 111, 107, 0.38);
      }

      .reading__listen-icon {
        font-size: 1.05rem;
        line-height: 1;
      }
    `,
  ],
})
export class ReadingViewComponent {
  /** شعر واکشی‌شدهٔ جاری (آخرین محتوای معتبر؛ هنگام خطا حفظ می‌شود — R2.5). */
  poem: Poem | null = null;

  /** وضعیت بارگذاری درخواست جاری (R6.3). */
  loading = false;

  /** خطای جاری در صورت شکست واکشی (R2.5). */
  error: GanjoorApiError | null = null;

  /** خوانش صوتی انتخاب‌شدهٔ جاری برای پخش (یا null اگر چیزی انتخاب نشده). */
  selectedRecitation: Recitation | null = null;

  /** شناسهٔ عددی شعرِ جاری برای امکان تلاش مجدد. */
  private currentPoemId: number | null = null;

  constructor(
    private readonly ganjoor: GanjoorService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  /**
   * شناسهٔ شعر از پارامتر مسیر `poem/:id` (با `withComponentInputBinding`).
   * با تغییر شناسه، واکشی شعر آغاز می‌شود.
   */
  @Input()
  set id(value: string | null) {
    const parsed = value !== null ? Number(value) : NaN;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      this.currentPoemId = null;
      return;
    }
    this.currentPoemId = parsed;
    this.fetchPoem(parsed);
  }

  /** تلاش مجدد واکشی شعر جاری (R2.5). */
  reload(): void {
    if (this.currentPoemId !== null) {
      this.fetchPoem(this.currentPoemId);
    }
  }

  /** ذخیرهٔ خوانش انتخاب‌شده تا به پخش‌کنندهٔ صوت پاس داده شود (R3.2). */
  onSelectRecitation(recitation: Recitation): void {
    this.selectedRecitation = recitation;
    this.cdr.markForCheck();
  }

  /** واکشی شعر؛ هنگام خطا، محتوای قبلی (poem) حفظ می‌شود (R2.5). */
  private fetchPoem(poemId: number): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    this.ganjoor.getPoem(poemId).subscribe({
      next: (poem) => {
        this.poem = poem;
        // با بارگذاری شعر جدید، انتخاب خوانش قبلی پاک می‌شود.
        this.selectedRecitation = null;
        this.loading = false;
        this.error = null;
        this.cdr.markForCheck();
      },
      error: (err: GanjoorApiError) => {
        // محتوای قبلی Reading_View بدون تغییر حفظ می‌شود (R2.5).
        this.error = err;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }
}
