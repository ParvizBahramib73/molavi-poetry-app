import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { Recitation } from '../../models';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';

/**
 * فهرست خوانش‌های صوتی یک شعر.
 *
 * هر خوانش را با نام دکلمه‌کننده (audioArtist) و عنوان آن نمایش می‌دهد و در
 * صورت انتخاب، رویداد {@link select} را با خوانش انتخاب‌شده منتشر می‌کند. اگر
 * فهرست خالی باشد، پیام فارسی «خوانش صوتی برای این شعر موجود نیست» از طریق
 * {@link EmptyStateComponent} نمایش داده می‌شود.
 *
 * نکتهٔ MVP دربارهٔ مدت‌زمان: مدل داخلی {@link Recitation} فیلد مدت‌زمان ندارد؛
 * بنابراین مدت‌زمان در صورت ارائه از طریق ورودی {@link durations} (برحسب ثانیه و
 * بر اساس شناسهٔ خوانش) نمایش داده می‌شود و در غیر این صورت «—» نشان داده می‌شود.
 * این مقدار معمولاً پس از بارگذاری متادیتای صوت توسط پخش‌کننده تأمین می‌شود.
 *
 * Requirements: 3.1, 3.5
 */
@Component({
  selector: 'app-recitation-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    @if (recitations.length === 0) {
      <app-empty-state
        message="خوانش صوتی برای این شعر موجود نیست"
      ></app-empty-state>
    } @else {
      <ul class="recitations" role="list">
        @for (recitation of recitations; track recitation.id) {
          <li class="recitations__item">
            <button
              type="button"
              class="recitations__btn"
              [class.recitations__btn--active]="
                selectedId !== null && selectedId === recitation.id
              "
              [attr.aria-pressed]="
                selectedId !== null && selectedId === recitation.id
              "
              (click)="onSelect(recitation)"
            >
              <span class="recitations__artist">{{
                recitation.audioArtist || 'دکلمه‌کنندهٔ نامشخص'
              }}</span>
              @if (recitation.audioTitle) {
                <span class="recitations__title">{{
                  recitation.audioTitle
                }}</span>
              }
              <span class="recitations__duration">{{
                formatDuration(recitation.id)
              }}</span>
            </button>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .recitations {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .recitations__item {
        margin: 0;
      }

      .recitations__btn {
        position: relative;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.7rem 1rem;
        font: inherit;
        text-align: right;
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

      .recitations__btn::before {
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

      .recitations__btn:hover {
        transform: translateY(-2px);
        background: #fff;
        box-shadow: var(--shadow);
      }

      .recitations__btn--active {
        background: linear-gradient(135deg, #fff, rgba(227, 185, 74, 0.14));
        border-color: rgba(194, 152, 47, 0.5);
        font-weight: 700;
      }

      .recitations__btn--active::before {
        transform: scaleY(1);
      }

      .recitations__artist {
        flex: 0 0 auto;
        font-weight: 600;
      }

      .recitations__title {
        flex: 1 1 auto;
        color: var(--muted, #7a6a55);
        font-size: 0.9rem;
      }

      .recitations__duration {
        flex: 0 0 auto;
        margin-inline-start: auto;
        color: var(--gold, #c2982f);
        font-size: 0.85rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class RecitationListComponent {
  /** فهرست خوانش‌های صوتی قابل نمایش. */
  @Input() recitations: Recitation[] = [];

  /** شناسهٔ خوانش انتخاب‌شدهٔ جاری (برای برجسته‌سازی). */
  @Input() selectedId: number | null = null;

  /**
   * نگاشت اختیاری شناسهٔ خوانش به مدت‌زمان (ثانیه) برای نمایش مدت‌زمان.
   * در صورت نبودِ مقدار، «—» نمایش داده می‌شود.
   */
  @Input() durations: Record<number, number> = {};

  /** رویدادی که هنگام انتخاب یک خوانش منتشر می‌شود. */
  @Output() select = new EventEmitter<Recitation>();

  onSelect(recitation: Recitation): void {
    this.select.emit(recitation);
  }

  /** قالب‌بندی مدت‌زمان یک خوانش به‌صورت mm:ss یا «—» در صورت نامشخص بودن. */
  formatDuration(recitationId: number): string {
    const seconds = this.durations[recitationId];
    if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
      return '—';
    }
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
