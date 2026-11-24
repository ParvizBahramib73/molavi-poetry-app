import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
} from '@angular/core';

import { OnboardingTourService } from '../../core/onboarding-tour.service';

/**
 * A lightweight, Persian, five-step first-run tour.
 * No external overlay library, network request, animation or permissions.
 */
@Component({
  selector: 'app-first-run-tour',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (tour.isOpen()) {
      <div class="tour__backdrop">
        <section
          #dialogPanel
          class="tour__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
          aria-describedby="tour-description"
          tabindex="-1"
          dir="rtl"
          lang="fa"
        >
          <div class="tour__top">
            <span class="tour__eyebrow">آموزش کوتاه برنامه</span>
            <button
              type="button"
              class="tour__close"
              aria-label="بستن آموزش"
              (click)="dismiss()"
            >×</button>
          </div>

          <p class="tour__progress-label">
            مرحله {{ tour.stepIndex() + 1 }} از {{ tour.steps.length }}
          </p>

          <div class="tour__content" aria-live="polite" aria-atomic="true">
            <div class="tour__symbol" aria-hidden="true">{{ tour.currentStep().symbol }}</div>
            <h2 id="tour-title" class="tour__title">{{ tour.currentStep().title }}</h2>
            <p id="tour-description" class="tour__description">
              {{ tour.currentStep().explanation }}
            </p>
            <p class="tour__tip">{{ tour.currentStep().tip }}</p>
          </div>

          <div class="tour__dots" aria-hidden="true">
            @for (step of tour.steps; track $index) {
              <span
                class="tour__dot"
                [class.tour__dot--active]="$index === tour.stepIndex()"
              ></span>
            }
          </div>

          <div class="tour__actions">
            <button
              type="button"
              class="tour__secondary"
              (click)="tour.stepIndex() === 0 ? dismiss() : tour.back()"
            >{{ tour.stepIndex() === 0 ? 'رد کردن آموزش' : 'قبلی' }}</button>
            <button
              type="button"
              class="tour__primary"
              (click)="next()"
            >{{ tour.isLastStep() ? 'شروع استفاده' : 'بعدی' }}</button>
          </div>
        </section>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .tour__backdrop {
      position: absolute;
      inset: 0;
      z-index: 150;
      display: grid;
      place-items: center;
      padding: max(0.8rem, env(safe-area-inset-top))
        0.75rem max(0.8rem, env(safe-area-inset-bottom));
      overflow-y: auto;
      background: rgba(3, 9, 22, 0.92);
    }

    .tour__panel {
      width: min(100%, 370px);
      max-height: 100%;
      min-width: 0;
      padding: 1.15rem;
      border: 1px solid rgba(224, 193, 104, 0.42);
      border-radius: 24px;
      background: #18253d;
      color: #fffaf0;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.38);
      overflow-y: auto;
      overscroll-behavior: contain;
      outline: none;
      font-family: Vazirmatn, Tahoma, system-ui, sans-serif;
      text-align: right;
    }

    .tour__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.6rem;
    }

    .tour__eyebrow {
      color: #f1d786;
      font-size: 0.91rem;
      font-weight: 700;
    }

    .tour__close {
      flex: 0 0 46px;
      display: grid;
      place-items: center;
      width: 46px;
      height: 46px;
      padding: 0;
      border: 1px solid rgba(251, 240, 210, 0.35);
      border-radius: 12px;
      background: #283650;
      color: #fffaf0;
      font: inherit;
      font-size: 1.6rem;
      cursor: pointer;
    }

    .tour__progress-label {
      margin: 0.45rem 0 0;
      color: #f5e1af;
      font-size: 0.86rem;
    }

    .tour__content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.65rem;
      padding: 0.5rem 0;
      text-align: center;
    }

    .tour__symbol {
      display: grid;
      place-items: center;
      width: 78px;
      height: 78px;
      margin: 0.1rem 0;
      border: 2px solid #d6af49;
      border-radius: 24px;
      background: #293754;
      color: #ffe49c;
      font-size: 2.35rem;
      font-weight: 700;
      line-height: 1;
    }

    .tour__title {
      margin: 0;
      color: #ffefb9;
      font-size: 1.3rem;
      font-weight: 800;
      line-height: 1.6;
    }

    .tour__description {
      margin: 0;
      color: #fffaf0;
      font-size: 1rem;
      font-weight: 500;
      line-height: 2;
    }

    .tour__tip {
      width: 100%;
      margin: 0.35rem 0 0;
      padding: 0.65rem 0.8rem;
      border-radius: 12px;
      background: #263b51;
      color: #fff3ca;
      font-size: 0.89rem;
      line-height: 1.85;
    }

    .tour__dots {
      display: flex;
      justify-content: center;
      gap: 0.45rem;
      margin: 0.75rem 0 1rem;
      direction: ltr;
    }

    .tour__dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: #8d9bb3;
    }

    .tour__dot--active {
      width: 25px;
      background: #f1d174;
    }

    .tour__actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.6rem;
    }

    .tour__actions button {
      min-width: 0;
      min-height: 50px;
      padding: 0.55rem 0.45rem;
      border-radius: 13px;
      font: inherit;
      font-size: 0.93rem;
      font-weight: 750;
      line-height: 1.5;
      cursor: pointer;
    }

    .tour__secondary {
      border: 1px solid #c6cfdc;
      background: #283750;
      color: #fffaf0;
    }

    .tour__primary {
      border: 1px solid #e8cc80;
      background: #e4c366;
      color: #27231d;
    }

    .tour__close:focus-visible,
    .tour__actions button:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 2px;
    }

    @media (max-height: 560px) {
      .tour__panel { padding: 0.75rem; }
      .tour__symbol { width: 52px; height: 52px; font-size: 1.7rem; }
      .tour__content { gap: 0.3rem; }
      .tour__tip { margin-top: 0.15rem; }
    }
  `],
})
export class FirstRunTourComponent implements AfterViewChecked {
  @ViewChild('dialogPanel') private panel?: ElementRef<HTMLElement>;

  private focusedPanel = false;
  private previousFocus: HTMLElement | null = null;

  constructor(readonly tour: OnboardingTourService) {}

  ngAfterViewChecked(): void {
    if (!this.tour.isOpen()) {
      this.focusedPanel = false;
      return;
    }

    if (!this.focusedPanel && this.panel) {
      this.previousFocus = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      this.panel.nativeElement.focus({ preventScroll: true });
      this.focusedPanel = true;
    }
  }

  next(): void {
    if (this.tour.isLastStep()) {
      this.dismiss();
    } else {
      this.tour.next();
    }
  }

  dismiss(): void {
    this.tour.dismiss();
    this.focusedPanel = false;
    const previous = this.previousFocus;
    this.previousFocus = null;
    // Return keyboard focus to the replay button, or to the first main route
    // after an automatically opened first-run tour.
    queueMicrotask(() => {
      if (previous?.isConnected && previous !== document.body) {
        previous.focus();
      } else {
        document.querySelector<HTMLElement>('.shell__nav-link')?.focus();
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.tour.isOpen()) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.dismiss();
      return;
    }

    if (event.key !== 'Tab' || !this.panel) return;
    const focusable = Array.from(
      this.panel.nativeElement.querySelectorAll<HTMLButtonElement>('button:not([disabled])'),
    );
    if (!focusable.length) {
      event.preventDefault();
      this.panel.nativeElement.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (!this.panel.nativeElement.contains(active)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
