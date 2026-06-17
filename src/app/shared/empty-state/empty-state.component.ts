import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * کامپوننت مشترک حالت خالی.
 *
 * پیام‌های فارسی «موجود نیست/یافت نشد» را نمایش می‌دهد. این حالت خطا نیست،
 * بلکه نبودِ داده (خوانش/ترجمه/نتیجه) را به کاربر اطلاع می‌دهد.
 *
 * Requirements: 3.5, 4.3, 5.4
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty" role="status">
      <p class="empty__message">{{ message }}</p>
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1.75rem 1.5rem;
        text-align: center;
        color: var(--muted, #7a6a55);
        background: rgba(120, 95, 60, 0.04);
        border: 1px dashed var(--line, rgba(120, 95, 60, 0.18));
        border-radius: var(--r, 16px);
        animation: fadeIn var(--t, 200ms) var(--ease) both;
      }

      .empty__message {
        margin: 0;
        font-size: 1rem;
        line-height: 1.7;
      }
    `,
  ],
})
export class EmptyStateComponent {
  /** پیام فارسی «موجود نیست/یافت نشد». */
  @Input() message = 'موردی یافت نشد.';
}
