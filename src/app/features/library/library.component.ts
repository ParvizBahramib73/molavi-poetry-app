import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PoetryLibraryService, ListeningHistoryEntry } from '../../core/poetry-library.service';
import { PwaInstallService } from '../../core/pwa-install.service';
import { OnboardingTourService } from '../../core/onboarding-tour.service';

@Component({
  selector: 'app-library',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="library" dir="rtl" lang="fa">
      <header class="library__header">
        <a class="library__back" routerLink="/">بازگشت به پخش</a>
        <div>
          <p class="library__eyebrow">کتابخانه شخصی</p>
          <h1>اشعار من</h1>
          <p class="library__intro">علاقه‌مندی‌ها و آخرین شنیده‌های تو، فقط روی همین دستگاه</p>
        </div>
        <div class="library__header-actions">
          <button type="button" class="library__help" (click)="showTour()">
            ؟ راهنمای استفاده
          </button>
          <a routerLink="/search" class="library__text-link">جست‌وجوی شعر</a>
          @if (pwaInstall.canInstall()) {
            <button type="button" class="library__install" (click)="installApp()">نصب برنامه</button>
          }
        </div>
      </header>

      <section class="library__section" aria-labelledby="history-title">
        <div class="library__section-heading">
          <div>
            <p class="library__eyebrow">ادامه از جایی که بودی</p>
            <h2 id="history-title">آخرین شنیده‌ها</h2>
          </div>
          @if (library.history().length > 0) {
            <button type="button" class="library__quiet-action" (click)="askToClearHistory()">پاک کردن تاریخچه</button>
          }
        </div>

        @if (confirmClearHistory) {
          <div class="library__confirm" role="group" aria-label="تأیید پاک کردن تاریخچه">
            <p>همه آخرین شنیده‌ها پاک شوند؟ این کار برنمی‌گردد.</p>
            <div class="library__confirm-actions">
              <button type="button" class="library__danger" (click)="clearHistory()">بله، پاک شوند</button>
              <button type="button" class="library__cancel" (click)="cancelClearHistory()">انصراف</button>
            </div>
          </div>
        }

        @if (library.history().length === 0) {
          <div class="library__empty">
            <span aria-hidden="true">♫</span>
            <strong>هنوز شعری نشنیده‌ای</strong>
            <p>اولین شعر را پخش کن تا اینجا برای ادامه در دسترس باشد.</p>
            <a routerLink="/" class="library__primary-link">شروع شنیدن</a>
          </div>
        } @else {
          <div class="library__list">
            @for (item of library.history(); track item.id) {
              <article class="library__item">
                <div class="library__item-copy">
                  <strong>{{ item.title }}</strong>
                  <span>آخرین موقعیت: {{ formatTime(item.positionSeconds) }}</span>
                </div>
                <div class="library__item-actions">
                  <a
                    [routerLink]="['/poem', item.id, 'listen']"
                    [queryParams]="{ rec: item.recitationIndex, t: resumePosition(item) }"
                    class="library__primary-link"
                  >ادامه شنیدن</a>
                  <a [routerLink]="['/poem', item.id]" class="library__text-link">متن شعر</a>
                </div>
              </article>
            }
          </div>
        }
      </section>

      <section class="library__section" aria-labelledby="favorites-title">
        <div class="library__section-heading">
          <div>
            <p class="library__eyebrow">برای روزهای بعد</p>
            <h2 id="favorites-title">اشعار محبوب من</h2>
          </div>
          <span class="library__count">{{ library.favorites().length }} شعر</span>
        </div>

        @if (library.favorites().length === 0) {
          <div class="library__empty library__empty--compact">
            <strong>هنوز شعری ذخیره نکرده‌ای</strong>
            <p>در صفحه شنیدن، دکمه نشانک را بزن تا شعر به این فهرست اضافه شود.</p>
          </div>
        } @else {
          <div class="library__list">
            @for (item of library.favorites(); track item.id) {
              <article class="library__item">
                <div class="library__item-copy">
                  <strong>{{ item.title }}</strong>
                  <span>ذخیره‌شده در علاقه‌مندی‌ها</span>
                </div>
                <div class="library__item-actions">
                  <a [routerLink]="['/poem', item.id, 'listen']" class="library__primary-link">شنیدن</a>
                  <a [routerLink]="['/poem', item.id]" class="library__text-link">مطالعه</a>
                  <button type="button" class="library__quiet-action" (click)="removeFavorite(item.id)">حذف</button>
                </div>
              </article>
            }
          </div>
        }
      </section>

      @if (notice) {
        <p class="library__notice" role="status">{{ notice }}</p>
      }

      <footer class="library__footer">
        داده‌های کتابخانه روی دستگاه ذخیره می‌شوند و برای استفاده از آن‌ها نیازی به ساخت حساب کاربری نیست.
      </footer>
    </section>
  `,
  styles: [`
    :host { display: block; min-height: 100%; }
    .library {
      min-height: 100%;
      box-sizing: border-box;
      padding: 1.25rem 1rem 2rem;
      color: #f8f5ec;
      background:
        radial-gradient(70% 35% at 50% 0%, rgba(212,175,55,.12), transparent 75%),
        #0f172a;
      font-family: Vazirmatn, Tahoma, sans-serif;
    }
    .library__header, .library__section { width: 100%; max-width: 38rem; margin-inline: auto; }
    .library__header { display: grid; grid-template-columns: 1fr auto; gap: 1rem; align-items: start; }
    .library__back, .library__text-link { color: #f0d57e; text-decoration: underline; text-underline-offset: 3px; font-size: .9rem; }
    .library__back { display: inline-flex; align-items: center; min-height: 44px; }
    .library__back { grid-column: 1 / -1; justify-self: start; }
    .library__eyebrow { margin: 0 0 .35rem; color: #d4af37; font-size: .75rem; }
    h1 { margin: 0; font-size: 1.65rem; }
    h2 { margin: 0; font-size: 1.15rem; }
    .library__intro { margin: .35rem 0 0; color: rgba(248,245,236,.68); font-size: .8rem; line-height: 1.8; }
    .library__header-actions { display: flex; flex-direction: column; align-items: flex-end; gap: .55rem; }
    .library__install, .library__primary-link {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: 46px; padding: .5rem .85rem; border-radius: 999px;
      border: 1px solid rgba(212,175,55,.35); background: rgba(212,175,55,.13);
      color: #fff7dd; font: inherit; font-size: .9rem; text-decoration: none; cursor: pointer;
    }
    .library__section { margin-top: 2rem; }
    .library__section-heading { display: flex; justify-content: space-between; align-items: end; gap: .75rem; margin-bottom: .85rem; }
    .library__count { color: rgba(248,245,236,.6); font-size: .75rem; }
    .library__list { display: flex; flex-direction: column; gap: .65rem; }
    .library__item, .library__empty {
      padding: .95rem; border: 1px solid rgba(212,175,55,.17); border-radius: 16px;
      background: rgba(248,245,236,.045);
    }
    .library__item { display: flex; flex-direction: column; gap: .8rem; }
    .library__item-copy { display: flex; flex-direction: column; gap: .25rem; min-width: 0; }
    .library__item-copy strong { font-size: .95rem; }
    .library__item-copy span, .library__empty p { color: rgba(248,245,236,.82); font-size: .91rem; }
    .library__item-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .65rem; }
    .library__quiet-action { min-height: 44px; padding: .45rem .5rem; color: #e8d4a4; background: transparent; border: 1px solid rgba(212,175,55,.25); border-radius: 10px; font: inherit; font-size: .85rem; cursor: pointer; }
    .library__empty { display: flex; flex-direction: column; align-items: center; gap: .5rem; text-align: center; padding: 1.6rem 1rem; }
    .library__empty > span { color: #d4af37; font-size: 1.6rem; }
    .library__empty p { margin: 0; line-height: 1.8; }
    .library__empty--compact { padding: 1.1rem; }
    .library__help {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      min-height: 46px;
      padding: 0.4rem 0.8rem;
      border: 1px solid rgba(228, 195, 102, .55);
      border-radius: 12px;
      background: #293b55;
      color: #fff3c7;
      font: inherit;
      font-size: .86rem;
      font-weight: 700;
      line-height: 1.5;
      cursor: pointer;
    }
    .library__footer { max-width: 38rem; margin: 2rem auto 0; color: rgba(248,245,236,.8); font-size: .82rem; line-height: 1.8; text-align: center; }

    .library__confirm {
      margin: 0 0 1rem;
      padding: 1rem;
      border-radius: 14px;
      border: 1px solid rgba(239, 198, 113, .45);
      background: #283047;
    }
    .library__confirm p { margin: 0 0 .75rem; line-height: 1.75; font-size: .94rem; }
    .library__confirm-actions { display: flex; flex-wrap: wrap; gap: .6rem; }
    .library__danger, .library__cancel {
      min-height: 46px;
      padding: .5rem 1rem;
      border-radius: 12px;
      border: 1px solid #d1b46d;
      background: #3a2430;
      color: #fff3dd;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .library__cancel { background: #203956; }
    .library__notice {
      max-width: 38rem;
      margin: 1.2rem auto;
      padding: .65rem .85rem;
      border: 1px solid rgba(212,175,55,.28);
      border-radius: 12px;
      color: #fff1b1;
      font-size: .9rem;
      line-height: 1.6;
    }
    @media (min-width: 480px) {
      .library { padding: 1.5rem 1.25rem 2rem; }
      .library__item { flex-direction: row; align-items: center; justify-content: space-between; }
      .library__item-actions { justify-content: flex-end; }
    }
  `],
})
export class LibraryComponent {
  confirmClearHistory = false;
  notice = '';

  constructor(
    readonly library: PoetryLibraryService,
    readonly pwaInstall: PwaInstallService,
    readonly tour: OnboardingTourService,
  ) {}

  installApp(): void {
    void this.pwaInstall.promptInstall();
  }

  showTour(): void {
    this.tour.replay();
  }

  removeFavorite(poemId: number): void {
    this.library.removeFavorite(poemId);
    this.notice = 'شعر از علاقه‌مندی‌ها حذف شد.';
  }

  askToClearHistory(): void {
    this.confirmClearHistory = true;
    this.notice = '';
  }

  cancelClearHistory(): void {
    this.confirmClearHistory = false;
  }

  clearHistory(): void {
    if (!this.confirmClearHistory) {
      return;
    }
    this.library.clearHistory();
    this.confirmClearHistory = false;
    this.notice = 'تاریخچه شنیدن پاک شد.';
  }

  resumePosition(item: ListeningHistoryEntry): number {
    if (item.durationSeconds > 0 && item.positionSeconds >= item.durationSeconds - 2) {
      return 0;
    }
    return item.positionSeconds;
  }

  formatTime(seconds: number): string {
    const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    const minutes = Math.floor(safe / 60);
    const remaining = safe % 60;
    return `${minutes}:${remaining.toString().padStart(2, '0')}`;
  }
}
