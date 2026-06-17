import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * پوستهٔ برنامه (App Shell).
 *
 * چیدمان کلی راست‌به‌چپ (`dir="rtl"`) را فراهم می‌کند و شامل سربرگ با عنوان
 * «اشعار مولوی»، نوار جست‌وجو (ورودی + دکمه که به مسیر جست‌وجو با عبارت ناوبری
 * می‌کند)، ناوبری اصلی (پیوند به صفحهٔ مرور/خانه) و `<router-outlet>` است.
 *
 * Requirements: 7.1 (RTL)، 7.2 (ساختار ناوبری هم‌تراز با URL گنجور)
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="shell" dir="rtl" lang="fa">
      <header class="shell__header">
        <div class="shell__brand">
          <a routerLink="/" class="shell__title-link" aria-label="خانه">
            <h1 class="shell__title">اشعار مولوی</h1>
          </a>
        </div>

        <form class="shell__search" (submit)="onSearch($event)" role="search">
          <input
            class="shell__search-input"
            type="search"
            name="q"
            [(ngModel)]="query"
            [ngModelOptions]="{ standalone: true }"
            placeholder="جست‌وجو در اشعار مولوی…"
            aria-label="عبارت جست‌وجو"
          />
          <button class="shell__search-button" type="submit">جست‌وجو</button>
        </form>

        <nav class="shell__nav" aria-label="ناوبری اصلی">
          <a
            routerLink="/"
            routerLinkActive="shell__nav-link--active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="shell__nav-link"
          >مرور آثار</a>
          <a
            routerLink="/search"
            routerLinkActive="shell__nav-link--active"
            class="shell__nav-link"
          >جست‌وجو</a>
        </nav>
      </header>

      <main class="shell__main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      /* روی نمایشگرهای پهن، دستگاه را وسط صحنهٔ تیره قرار می‌دهیم. */
      @media (min-width: 480px) {
        :host {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          min-height: 100dvh;
          padding: 1rem;
          box-sizing: border-box;
        }
      }

      /* ستون «گوشی»: همیشه محدود به پهنای موبایل، حتی روی دسکتاپ. */
      .shell {
        position: relative;
        width: 100%;
        max-width: 430px;
        min-height: 100vh;
        min-height: 100dvh;
        height: 100vh;
        height: 100dvh;
        margin-inline: auto;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        background: #0f172a;
        color: #f8f5ec;
        font-family: 'Vazirmatn', 'Tahoma', system-ui, sans-serif;
      }

      @media (min-width: 480px) {
        .shell {
          min-height: 0;
          height: min(calc(100dvh - 2rem), 920px);
          border-radius: 36px;
          border: 1px solid rgba(212, 175, 55, 0.16);
          box-shadow: 0 40px 90px rgba(0, 0, 0, 0.65),
            0 0 0 10px rgba(8, 12, 22, 0.6), 0 0 60px rgba(56, 60, 110, 0.25);
        }
      }

      /*
       * سربرگ پوسته صرفاً برای دسترس‌پذیری و آزمون‌ها در DOM می‌ماند
       * (فرم جست‌وجو همچنان کارا است) ولی از دید پنهان است؛ منوی هنری
       * واقعی داخل خود پخش‌کننده زندگی می‌کند.
       */
      .shell__header {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        white-space: nowrap;
        border: 0;
        pointer-events: none;
      }

      .shell__main {
        flex: 1 1 auto;
        width: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
      }
    `,
  ],
})
export class AppShellComponent {
  /** عبارت واردشده در نوار جست‌وجوی پوسته. */
  protected query = '';

  constructor(private readonly router: Router) {}

  /**
   * ثبت فرم جست‌وجو: ناوبری به مسیر `search` با عبارت واردشده به‌صورت پارامتر کوئری.
   * منطق اعتبارسنجی کامل در تسک ۱۰ (SearchComponent) انجام می‌شود.
   */
  protected onSearch(event: Event): void {
    event.preventDefault();
    const term = this.query.trim();
    this.router.navigate(['/search'], term ? { queryParams: { q: term } } : {});
  }
}
