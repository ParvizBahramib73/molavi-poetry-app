import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { OnboardingTourService } from '../core/onboarding-tour.service';
import { FirstRunTourComponent } from '../shared/first-run-tour/first-run-tour.component';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

/**
 * Simple, persistent navigation for first-time and experienced readers alike.
 * Every destination has a visible label and a large touch target.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FirstRunTourComponent],
  template: `
    <div class="shell" dir="rtl" lang="fa">
      <header class="shell__header">
        <img class="shell__brand-icon" src="icons/beshno-bekhan.svg" alt="" width="36" height="36" />
        <div class="shell__brand-text">
          <strong class="shell__brand">بشنو بخوان</strong>
          <span class="shell__brand-subtitle">شعر را بخوان، مثل موسیقی بشنو</span>
        </div>
        <button type="button" class="shell__menu-button" [attr.aria-expanded]="menuOpen"
          aria-controls="main-menu" aria-label="باز کردن منوی اصلی" (click)="toggleMenu()">
          @if (menuOpen) {
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
          } @else {
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          }
        </button>
      </header>
      <button type="button" class="shell__menu-backdrop"
        [class.shell__menu-backdrop--visible]="menuOpen" [attr.aria-hidden]="!menuOpen"
        [attr.tabindex]="menuOpen ? 0 : -1" aria-label="بستن منو" (click)="closeMenu()"></button>

      <nav id="main-menu" class="shell__nav" [class.shell__nav--open]="menuOpen"
        [attr.inert]="(!menuOpen || tour.isOpen()) ? '' : null"
        [attr.aria-hidden]="!menuOpen" aria-label="منوی اصلی">
        <div class="shell__nav-heading"><span>منوی برنامه</span>
          <button type="button" (click)="closeMenu()" aria-label="بستن منو">×</button>
        </div>
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
          <span>شنیدن و پخش شعر</span>
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
          <span>جست‌وجوی شعر</span>
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
        <p class="shell__nav-hint">همه‌چیز برای ادامه شنیدن، همین‌جاست.</p>
      </nav>

      <main class="shell__main" id="main-content"
        [attr.inert]="tour.isOpen() ? '' : null">
        <router-outlet />
      </main>

      @if (!isOnline) {
        <div class="shell__offline" role="status">
          اینترنت قطع است. کتابخانه ذخیره‌شده را می‌توانی ببینی.
        </div>
      }

      <app-first-run-tour />
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

    .shell__header {
      order: 0;
      flex: 0 0 auto;
      min-height: 59px;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.4rem 0.85rem;
      background: #101b32;
      border-bottom: 1px solid rgba(212, 175, 55, 0.18);
    }
    .shell__brand-icon {
      display: block;
      flex: 0 0 36px;
      width: 36px;
      height: 36px;
      border-radius: 10px;
    }
    .shell__brand-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      line-height: 1.35;
    }
    .shell__brand {
      color: #ffebb0;
      font-size: 1.02rem;
      font-weight: 800;
    }
    .shell__brand-subtitle {
      color: #d3d9e4;
      font-size: 0.72rem;
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

    .shell__menu-button { margin-inline-start: auto; display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; color: #f7e4a1; background: rgba(212,175,55,.1); border: 1px solid rgba(212,175,55,.3); border-radius: 13px; cursor: pointer; }
    .shell__menu-button svg { width: 23px; height: 23px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
    .shell__menu-backdrop { position: absolute; inset: 0; z-index: 49; border: 0; background: rgba(2,6,18,.62); opacity: 0; pointer-events: none; transition: opacity 180ms ease; }
    .shell__menu-backdrop--visible { opacity: 1; pointer-events: auto; }
    .shell__nav { position: absolute; z-index: 50; top: 0; bottom: 0; right: 0; width: min(82%, 320px); display: flex; flex-direction: column; gap: .55rem; padding: 1rem .85rem; background: linear-gradient(160deg,#17243e,#0d1629); border-left: 1px solid rgba(212,175,55,.3); box-shadow: -18px 0 48px rgba(0,0,0,.35); transform: translateX(110%); visibility: hidden; transition: transform 200ms ease, visibility 200ms ease; }
    .shell__nav--open { transform: translateX(0); visibility: visible; }
    .shell__nav-heading { display: flex; align-items: center; justify-content: space-between; padding: .25rem .35rem .9rem; color: #f4d77f; font-weight: 800; border-bottom: 1px solid rgba(212,175,55,.18); }
    .shell__nav-heading button { width: 36px; height: 36px; border: 0; border-radius: 10px; background: rgba(255,255,255,.07); color: #fff; font-size: 1.5rem; }
    .shell__nav-hint { margin: auto .4rem .5rem; color: #aab2c4; font-size: .78rem; line-height: 1.8; }
    .shell__menu-button:focus-visible,.shell__nav-link:focus-visible { outline: 2px solid #f4d77f; outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { .shell__nav,.shell__menu-backdrop { transition: none; } }

    .shell__nav-link { display: flex; align-items: center; justify-content: flex-start; flex-direction: row; gap: .8rem; min-height: 54px; padding: .65rem .8rem; border-radius: 13px; border: 1px solid transparent; color: #e1e5ef; font-size: .94rem; font-weight: 700; line-height: 1.5; text-decoration: none; text-align: start; }

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
export class AppShellComponent implements OnInit, OnDestroy {
  isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
  menuOpen = false;
  private nativeBackHandle?: { remove(): Promise<void> };
  private routeSubscription?: { unsubscribe(): void };

  constructor(
    private readonly cdr: ChangeDetectorRef,
    readonly tour: OnboardingTourService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.tour.startIfFirstVisit();
    void this.registerNativeBackButton();
    this.routeSubscription = this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => this.closeMenu());
  }

  ngOnDestroy(): void {
    void this.nativeBackHandle?.remove();
    this.routeSubscription?.unsubscribe();
  }

  toggleMenu(): void { this.menuOpen = !this.menuOpen; this.cdr.markForCheck(); }
  closeMenu(): void { if (!this.menuOpen) return; this.menuOpen = false; this.cdr.markForCheck(); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.closeMenu(); }

  @HostListener('window:online')
  onOnline(): void {
    this.isOnline = true;
    this.cdr.markForCheck();
  }

  @HostListener('window:offline')
  private async registerNativeBackButton(): Promise<void> {
    const bridge = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (!bridge?.isNativePlatform?.()) return;
    try {
      const { App } = await import('@capacitor/app');
      this.nativeBackHandle = await App.addListener('backButton', () => this.handleBack());
    } catch {
      // Web builds and older APKs without the App plugin retain browser navigation.
    }
  }

  private handleBack(): void {
    if (this.menuOpen) { this.closeMenu(); return; }
    const detail = { handled: false };
    window.dispatchEvent(new CustomEvent('beshno:back', { detail }));
    if (detail.handled) { this.cdr.markForCheck(); return; }
    if (this.router.url !== '/') void this.router.navigateByUrl('/');
    // At the player home, stay in the app instead of exiting.
  }

  onOffline(): void {
    this.isOnline = false;
    this.cdr.markForCheck();
  }
}
