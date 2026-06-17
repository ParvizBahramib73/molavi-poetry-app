import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

/**
 * کامپوننت مشترک حالت خطا.
 *
 * یک پیام خطای فارسی (با مقدار پیش‌فرض) به‌همراه دکمهٔ «تلاش مجدد» نمایش می‌دهد.
 * با کلیک روی دکمه، رویداد retry منتشر می‌شود تا ویوی والد بتواند درخواست را
 * از سر بگیرد.
 *
 * Requirements: 6.6, 1.5, 1.6, 3.5, 4.3, 5.4
 */
@Component({
  selector: 'app-error-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="error" role="alert">
      <p class="error__message">{{ message }}</p>
      @if (showRetry) {
        <button type="button" class="error__retry" (click)="onRetry()">
          {{ retryLabel }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .error {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.85rem;
        padding: 1.75rem 1.5rem;
        text-align: center;
        color: var(--rose, #9c4f3f);
        background: rgba(156, 79, 63, 0.06);
        border: 1px solid rgba(156, 79, 63, 0.18);
        border-radius: var(--r, 16px);
        animation: fadeIn var(--t, 200ms) var(--ease) both;
      }

      .error__message {
        margin: 0;
        font-size: 1rem;
        font-weight: 500;
        line-height: 1.7;
      }

      .error__retry {
        padding: 0.5rem 1.3rem;
        font: inherit;
        font-weight: 700;
        color: #fff;
        background: linear-gradient(135deg, #b25d4b, var(--rose, #9c4f3f));
        border: none;
        border-radius: var(--r-pill, 999px);
        cursor: pointer;
        box-shadow: 0 6px 16px rgba(156, 79, 63, 0.28);
        transition: transform var(--t-fast, 150ms) var(--ease),
          box-shadow var(--t-fast, 150ms) var(--ease), filter var(--t-fast, 150ms) var(--ease);
      }

      .error__retry:hover {
        transform: translateY(-2px);
        filter: brightness(1.05);
        box-shadow: 0 10px 22px rgba(156, 79, 63, 0.38);
      }

      .error__retry:active {
        transform: translateY(0);
      }
    `,
  ],
})
export class ErrorStateComponent {
  /** پیام خطای فارسی قابل نمایش به کاربر. */
  @Input() message = 'خطایی رخ داد. لطفاً دوباره تلاش کنید.';

  /** برچسب دکمهٔ تلاش مجدد. */
  @Input() retryLabel = 'تلاش مجدد';

  /** کنترل نمایش دکمهٔ تلاش مجدد. */
  @Input() showRetry = true;

  /** رویدادی که هنگام کلیک روی دکمهٔ «تلاش مجدد» منتشر می‌شود. */
  @Output() retry = new EventEmitter<void>();

  onRetry(): void {
    this.retry.emit();
  }
}
