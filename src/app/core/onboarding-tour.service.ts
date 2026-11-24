import { Injectable, computed, signal } from '@angular/core';

/**
 * One small, optional introduction for the whole app (web/PWA/Capacitor).
 * The choice is stored only on the user's device; no account or API call.
 */
export const ONBOARDING_STORAGE_KEY = 'molavi:onboarding:v1:seen';

export interface OnboardingStep {
  readonly title: string;
  readonly explanation: string;
  readonly tip: string;
  readonly symbol: string;
}

const STEPS: readonly OnboardingStep[] = [
  {
    title: 'به بشنو بخوان خوش آمدی!',
    explanation: 'اینجا می‌توانی شعرهای مولانا را بخوانی و به صدای شعرها گوش بدهی.',
    tip: 'لازم نیست حساب بسازی. فقط شروع کن.',
    symbol: '✦',
  },
  {
    title: 'به شعر گوش بده',
    explanation: 'پایین صفحه «شنیدن» را بزن. برای شروع صدا، دکمه «پخش» را لمس کن.',
    tip: 'برای شنیدن خوانش‌ها اینترنت لازم است.',
    symbol: '♫',
  },
  {
    title: 'شعر را پیدا کن',
    explanation: 'روی «جست‌وجو» بزن و چند کلمه از شعری را که یادت مانده بنویس.',
    tip: 'مثلاً بنویس: «بشنو از نی». لازم نیست بیت کامل باشد.',
    symbol: '⌕',
  },
  {
    title: 'متن شعر را راحت بخوان',
    explanation: 'در صفحه شنیدن، «خواندن متن» را انتخاب کن. اندازه نوشته‌ها را هم می‌توانی بزرگ‌تر کنی.',
    tip: 'با «متن درشت» خواندن راحت‌تر می‌شود.',
    symbol: 'آ+',
  },
  {
    title: 'شعرهای دوست‌داشتنی‌ات را نگه دار',
    explanation: 'دکمه «علاقه‌مندی» را بزن. بعد در «کتابخانه من»، شعرهای ذخیره‌شده و آخرین شنیده‌ها را ببین.',
    tip: 'هر وقت خواستی، از «کتابخانه من» دوباره «راهنمای استفاده» را باز کن.',
    symbol: '★',
  },
];

@Injectable({ providedIn: 'root' })
export class OnboardingTourService {
  readonly steps = STEPS;
  readonly isOpen = signal(false);
  readonly stepIndex = signal(0);
  readonly currentStep = computed(() => this.steps[this.stepIndex()] ?? this.steps[0]);
  readonly isLastStep = computed(() => this.stepIndex() === this.steps.length - 1);

  private promptedThisSession = false;

  /** Element that initiated the guide (for restoring keyboard focus). */
  focusOrigin: HTMLElement | null = null;

  startIfFirstVisit(): void {
    if (this.promptedThisSession || this.hasSeenTour()) {
      return;
    }
    this.promptedThisSession = true;
    this.openAtStart();
  }

  /** Replay is always possible, even if the visitor completed or skipped it. */
  replay(): void {
    this.openAtStart();
  }

  next(): void {
    if (!this.isOpen()) return;
    if (this.isLastStep()) {
      this.dismiss();
      return;
    }
    this.stepIndex.update((value) => Math.min(value + 1, this.steps.length - 1));
  }

  back(): void {
    if (!this.isOpen()) return;
    this.stepIndex.update((value) => Math.max(0, value - 1));
  }

  /** Both "skip" and "finish" respect the visitor's choice not to see it again. */
  dismiss(): void {
    this.isOpen.set(false);
    this.promptedThisSession = true;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'yes');
      }
    } catch {
      // Restricted browsers still allow the tour to be closed and the app used.
    }
  }

  private openAtStart(): void {
    this.focusOrigin = typeof document !== 'undefined' &&
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.stepIndex.set(0);
    this.isOpen.set(true);
  }

  private hasSeenTour(): boolean {
    try {
      return typeof localStorage !== 'undefined' &&
        localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'yes';
    } catch {
      return false;
    }
  }
}
