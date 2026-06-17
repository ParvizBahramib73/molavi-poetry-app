import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

import { Recitation } from '../../models';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';
import { LoadingIndicatorComponent } from '../../shared/loading-indicator/loading-indicator.component';

/** بیشینهٔ تعداد تلاش‌های مجدد متوالی برای بارگذاری/پخش یک خوانش (R3.7). */
const MAX_CONSECUTIVE_RETRIES = 3;

/**
 * پخش‌کنندهٔ خوانش صوتی مبتنی بر عنصر `<audio>` HTML5.
 *
 * مسئولیت‌ها:
 * - پخش/توقف خوانش انتخاب‌شده و آغاز پخش از ثانیهٔ صفر هنگام تغییر خوانش (R3.2).
 * - نمایش نشانگر بارگذاری در حین بافر شدن صوت با
 *   {@link LoadingIndicatorComponent} (R3.3).
 * - کنترل‌های play/pause و نوار جابه‌جایی (seek) با محدودسازی مقدار در بازهٔ
 *   صفر تا مدت‌زمان کل (R3.4).
 * - مدیریت خطای بارگذاری/پخش با نمایش {@link ErrorStateComponent} و تلاش مجدد
 *   تا حداکثر سه بار متوالی پیش از تسلیم (R3.6, R3.7).
 *
 * Requirements: 3.2, 3.3, 3.4, 3.6, 3.7
 */
@Component({
  selector: 'app-audio-player',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingIndicatorComponent, ErrorStateComponent],
  template: `
    @if (recitation) {
      <section class="player" aria-label="پخش‌کنندهٔ خوانش صوتی">
        <audio
          #audio
          [src]="recitation.mp3Url"
          preload="auto"
          (loadstart)="onLoadStart()"
          (waiting)="onWaiting()"
          (canplay)="onCanPlay()"
          (playing)="onPlaying()"
          (play)="onPlay()"
          (pause)="onPause()"
          (loadedmetadata)="onLoadedMetadata()"
          (timeupdate)="onTimeUpdate()"
          (ended)="onEnded()"
          (error)="onError()"
        ></audio>

        @if (hasError) {
          <app-error-state
            message="پخش این خوانش صوتی ناموفق بود."
            retryLabel="تلاش مجدد"
            (retry)="onManualRetry()"
          ></app-error-state>
        } @else {
          <div class="player__controls">
            <button
              type="button"
              class="player__toggle"
              [disabled]="loading"
              [attr.aria-label]="isPlaying ? 'توقف' : 'پخش'"
              (click)="togglePlay()"
            >
              {{ isPlaying ? '⏸ توقف' : '▶ پخش' }}
            </button>

            <span class="player__time" aria-hidden="true">{{
              formatTime(currentTime)
            }}</span>

            <input
              type="range"
              class="player__seek"
              min="0"
              [max]="duration"
              step="0.1"
              [value]="currentTime"
              [disabled]="duration <= 0"
              aria-label="جابه‌جایی در زمان"
              (input)="onSeek($event)"
            />

            <span class="player__time" aria-hidden="true">{{
              formatTime(duration)
            }}</span>
          </div>

          @if (loading) {
            <app-loading-indicator
              message="در حال بارگذاری خوانش…"
            ></app-loading-indicator>
          }
        }
      </section>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .player {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        padding: 1rem 1.1rem;
        background: linear-gradient(135deg, var(--paper-2, #fbf7ee), #f3ead7);
        border: 1px solid var(--line, rgba(120, 95, 60, 0.18));
        border-radius: var(--r, 16px);
        box-shadow: var(--shadow);
      }

      .player__controls {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }

      .player__toggle {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.5rem 1.1rem;
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

      .player__toggle:not(:disabled):hover {
        transform: translateY(-2px);
        filter: brightness(1.05);
        box-shadow: 0 10px 22px rgba(23, 111, 107, 0.38);
      }

      .player__toggle:not(:disabled):active {
        transform: translateY(0);
      }

      .player__toggle:disabled {
        opacity: 0.55;
        cursor: default;
        box-shadow: none;
      }

      .player__seek {
        flex: 1 1 auto;
        min-width: 0;
        direction: ltr;
        -webkit-appearance: none;
        appearance: none;
        height: 6px;
        background: transparent;
        cursor: pointer;
      }

      /* مسیر (track) — WebKit */
      .player__seek::-webkit-slider-runnable-track {
        height: 6px;
        border-radius: var(--r-pill, 999px);
        background: linear-gradient(
          90deg,
          var(--gold, #c2982f),
          var(--gold-2, #e3b94a)
        );
      }

      /* دستگیره (thumb) — WebKit */
      .player__seek::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        margin-top: -5px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid var(--gold, #c2982f);
        box-shadow: 0 1px 4px rgba(42, 33, 24, 0.3);
        transition: transform var(--t-fast, 150ms) var(--ease);
      }

      .player__seek:hover::-webkit-slider-thumb {
        transform: scale(1.15);
      }

      /* مسیر (track) — Firefox */
      .player__seek::-moz-range-track {
        height: 6px;
        border-radius: var(--r-pill, 999px);
        background: rgba(120, 95, 60, 0.25);
      }

      .player__seek::-moz-range-progress {
        height: 6px;
        border-radius: var(--r-pill, 999px);
        background: linear-gradient(
          90deg,
          var(--gold, #c2982f),
          var(--gold-2, #e3b94a)
        );
      }

      /* دستگیره (thumb) — Firefox */
      .player__seek::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid var(--gold, #c2982f);
        box-shadow: 0 1px 4px rgba(42, 33, 24, 0.3);
      }

      .player__seek:disabled {
        opacity: 0.5;
        cursor: default;
      }

      .player__time {
        flex: 0 0 auto;
        color: var(--muted, #7a6a55);
        font-size: 0.85rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class AudioPlayerComponent implements OnChanges {
  /** خوانش انتخاب‌شدهٔ جاری برای پخش (یا null اگر چیزی انتخاب نشده). */
  @Input() recitation: Recitation | null = null;

  @ViewChild('audio') audioRef?: ElementRef<HTMLAudioElement>;

  /** آیا صوت در حال بارگذاری/بافر شدن است (R3.3). */
  loading = false;

  /** آیا صوت در حال پخش است. */
  isPlaying = false;

  /** آیا خطای بارگذاری/پخش رخ داده و تلاش‌های مجدد تمام شده‌اند (R3.6). */
  hasError = false;

  /** زمان جاری پخش (ثانیه). */
  currentTime = 0;

  /** مدت‌زمان کل خوانش (ثانیه). */
  duration = 0;

  /** شمارندهٔ تلاش‌های مجدد متوالی پس از بروز خطا (R3.7). */
  private consecutiveRetries = 0;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recitation']) {
      // با تغییر خوانش، وضعیت بازنشانی و پخش از ثانیهٔ صفر آغاز می‌شود (R3.2).
      this.resetState();
      // در صورت در دسترس بودن عنصر <audio>، بارگذاری/پخش را آغاز کن.
      queueMicrotask(() => this.startPlayback());
    }
  }

  // -------------------------------------------------------------------------
  // رویدادهای عنصر <audio>
  // -------------------------------------------------------------------------

  onLoadStart(): void {
    this.loading = true;
    this.cdr.markForCheck();
  }

  onWaiting(): void {
    this.loading = true;
    this.cdr.markForCheck();
  }

  onCanPlay(): void {
    this.loading = false;
    // بارگذاری موفق بود؛ شمارندهٔ تلاش مجدد بازنشانی می‌شود.
    this.consecutiveRetries = 0;
    this.cdr.markForCheck();
  }

  onPlaying(): void {
    this.loading = false;
    this.isPlaying = true;
    this.consecutiveRetries = 0;
    this.cdr.markForCheck();
  }

  onPlay(): void {
    this.isPlaying = true;
    this.cdr.markForCheck();
  }

  onPause(): void {
    this.isPlaying = false;
    this.cdr.markForCheck();
  }

  onLoadedMetadata(): void {
    const el = this.audioRef?.nativeElement;
    this.duration = el && Number.isFinite(el.duration) ? el.duration : 0;
    this.cdr.markForCheck();
  }

  onTimeUpdate(): void {
    const el = this.audioRef?.nativeElement;
    if (el) {
      this.currentTime = el.currentTime;
      this.cdr.markForCheck();
    }
  }

  onEnded(): void {
    this.isPlaying = false;
    this.cdr.markForCheck();
  }

  onError(): void {
    // توقف پخش و تلاش مجدد تا حداکثر سه بار متوالی پیش از نمایش خطا (R3.6, R3.7).
    this.isPlaying = false;
    this.loading = false;

    if (this.consecutiveRetries < MAX_CONSECUTIVE_RETRIES) {
      this.consecutiveRetries += 1;
      this.reload();
    } else {
      this.hasError = true;
    }
    this.cdr.markForCheck();
  }

  // -------------------------------------------------------------------------
  // کنترل‌های کاربر
  // -------------------------------------------------------------------------

  togglePlay(): void {
    const el = this.audioRef?.nativeElement;
    if (!el) {
      return;
    }
    if (el.paused) {
      void el.play().catch(() => this.onError());
    } else {
      el.pause();
    }
  }

  /** اعمال جابه‌جایی در زمان با محدودسازی مقدار به بازهٔ [0, duration] (R3.4). */
  onSeek(event: Event): void {
    const el = this.audioRef?.nativeElement;
    if (!el) {
      return;
    }
    const raw = Number((event.target as HTMLInputElement).value);
    const max = this.duration > 0 ? this.duration : 0;
    const clamped = Math.min(Math.max(raw, 0), max);
    el.currentTime = clamped;
    this.currentTime = clamped;
    this.cdr.markForCheck();
  }

  /** تلاش مجدد دستی پس از تسلیم؛ شمارنده را بازنشانی و دوباره تلاش می‌کند (R3.7). */
  onManualRetry(): void {
    this.hasError = false;
    this.consecutiveRetries = 0;
    this.startPlayback();
    this.cdr.markForCheck();
  }

  // -------------------------------------------------------------------------
  // کمکی‌ها
  // -------------------------------------------------------------------------

  /** قالب‌بندی زمان به‌صورت mm:ss. */
  formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    const total = Math.floor(seconds);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private resetState(): void {
    this.loading = false;
    this.isPlaying = false;
    this.hasError = false;
    this.currentTime = 0;
    this.duration = 0;
    this.consecutiveRetries = 0;
  }

  /** آغاز بارگذاری و پخش خوانش جاری از ثانیهٔ صفر. */
  private startPlayback(): void {
    const el = this.audioRef?.nativeElement;
    if (!el || !this.recitation) {
      return;
    }
    el.currentTime = 0;
    this.currentTime = 0;
    el.load();
    void el.play().catch(() => this.onError());
  }

  /** بارگذاری دوبارهٔ صوت پس از خطا (تلاش مجدد خودکار). */
  private reload(): void {
    const el = this.audioRef?.nativeElement;
    if (!el || !this.recitation) {
      return;
    }
    this.loading = true;
    el.load();
    void el.play().catch(() => {
      // اگر این تلاش نیز ناموفق بود، رویداد error دوباره چرخهٔ تلاش را پیش می‌برد.
    });
  }
}
