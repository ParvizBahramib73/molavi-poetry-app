import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * نشانگر بارگذاری مشترک.
 *
 * یک اسپینر ساده به‌همراه متن فارسی «در حال بارگذاری…» نمایش می‌دهد.
 *
 * Requirements: 6.3
 */
@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loading" role="status" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <span class="loading__text">{{ message }}</span>
    </div>
  `,
  styles: [
    `
      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.65rem;
        padding: 1.75rem;
        color: var(--muted, #7a6a55);
        font-size: 1rem;
        animation: fadeIn var(--t, 200ms) var(--ease) both;
      }

      .spinner {
        width: 1.4rem;
        height: 1.4rem;
        border: 0.2rem solid rgba(194, 152, 47, 0.22);
        border-top-color: var(--gold, #c2982f);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      .loading__text {
        font-weight: 500;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class LoadingIndicatorComponent {
  /** متن قابل نمایش کنار اسپینر. */
  @Input() message = 'در حال بارگذاری…';
}
