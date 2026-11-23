import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Simple, persistent navigation for first-time and experienced readers alike.
 * Every destination has a visible label and a large touch target.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell" dir="rtl" lang="fa">
      <header class="shell__header">
        <span class="shell__brand">مولوی؛ بخوان و بشنو</span>
      </header>

      <nav class="shell__nav" aria-label="بخش‌های اصلی برنامه">
        <a
          routerLink="/"
          routerLinkActive="shell__nav-link--active"
          [routerLinkActiveOptions]="{ exact: true }"
          ariaCurrentWhenActive="page"
          class="shell__nav-link"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M8 5.5 19 12 8 18.5V5.5Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M4 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>شنیدن</span>
        </a>
        <a
          routerLink="/search"
          routerLinkActive="shell__nav-link--active"
          ariaCurrentWhenActive="page"
          class="shell__nav-link"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" stroke-width="2"/>
            <path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>جست‌وجو</span>
        </a>
        <a
          routerLink="/library"
          routerLinkActive="shell__nav-link--active"
          ariaCurrentWhenActive="page"
          class="shell__nav-link"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v13H7.5A2.5 2.5 0 0 1 5 17.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H19M9 8h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          <span>کتابخانه من</span>
        </a>
      </nav>

      <main class="shell__main" id="main-content">
        <router-outlet />
      </main>

      @if (!isOnline) {
        <div class="shell__offline" role="status">
          اینترنت قطع است. کتابخانه ذخیره‌شده را می‌توانی ببینی.
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    @media (min-width: 480px) {
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        min-height: 100dvh;
        padding: 1rem;
      }
    }

    .shell {
      position: relative;
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 430px;
      height: 100vh;
      height: 100dvh;
      margin-inline: auto;
      overflow: hidden;
      background: #0f172a;
      color: #f8f5ec;
      font-family: Vazirmatn, Tahoma, system-ui, sans-serif;
    }

    @media (min-width: 480px) {
      .shell {
        height: min(calc(100dvh - 2rem), 920px);
        border-radius: 32px;
        border: 1px solid rgba(212, 175, 55, 0.24);
        box-shadow: 0 35px 90px rgba(0, 0, 0, 0.55);
      }
    }

    /* Heading exists for assistive technology without taking up player space. */
    .shell__header {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }

    .shell__main {
      order: 1;
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }

    .shell__nav {
      order: 3;
      z-index: 40;
      flex: 0 0 auto;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.3rem;
      padding: 0.35rem 0.5rem calc(0.35rem + env(safe-area-inset-bottom));
      background: #101b32;
      border-top: 1px solid rgba(212, 175, 55, 0.3);
    }

    .shell__nav-link {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 0.2rem;
      min-height: 55px;
      border-radius: 12px;
      border: 1px solid transparent;
      color: #e1e5ef;
      font-size: 0.86rem;
      font-weight: 700;
      line-height: 1.3;
      text-decoration: none;
      text-align: center;
    }

    .shell__nav-link svg {
      width: 23px;
      height: 23px;
      flex: 0 0 auto;
    }

    .shell__nav-link--active {
      color: #fff1b1;
      background: rgba(212, 175, 55, 0.15);
      border-color: rgba(212, 175, 55, 0.34);
    }

    .shell__nav-link:hover,
    .shell__nav-link:focus-visible {
      color: #fff5cd;
      background: rgba(212, 175, 55, 0.14);
    }

    .shell__offline {
      order: 2;
      z-index: 5;
      padding: 0.5rem 0.8rem;
      color: #fff2b8;
      background: #47371d;
      font-size: 0.86rem;
      line-height: 1.6;
      text-align: center;
    }
  `],
})
export class AppShellComponent {
  isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  @HostListener('window:online')
  onOnline(): void {
    this.isOnline = true;
    this.cdr.markForCheck();
  }

  @HostListener('window:offline')
  onOffline(): void {
    this.isOnline = false;
    this.cdr.markForCheck();
  }
}
