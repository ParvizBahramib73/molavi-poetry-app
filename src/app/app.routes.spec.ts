/**
 * آزمون واحد برای پیکربندی مسیریابی برنامه ({@link routes}) و ناوبری پوسته.
 *
 * این آزمون مکمل آزمون smoke واکنش‌گرایی است و به‌جای تکرار بررسی چیدمان،
 * روی موارد زیر تمرکز دارد:
 *  - تعریف مسیرهای اصلی هم‌تراز با ساختار URL گنجور:
 *      `''` (مرور/خانه)، `poem/:id` (مطالعه) و `search` (جست‌وجو).
 *  - lazy بودن هر مسیر (وجود `loadComponent`) و داشتن `title`.
 *  - وجود مسیر wildcard (`**`) با هدایت (redirect) به خانه.
 *  - اعمال جهت سراسری راست‌به‌چپ (`dir="rtl"`) روی ریشهٔ پوسته.
 *  - ناوبری نوار جست‌وجوی پوسته به مسیر `/search`.
 *
 * Requirements: 7.1 (RTL + مسیرهای اصلی فعال)
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Route, provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AppShellComponent } from './app-shell/app-shell.component';
import { OnboardingTourService } from './core/onboarding-tour.service';

/** کمک‌کنندهٔ یافتن یک مسیر بر اساس `path`. */
function findRoute(path: string): Route | undefined {
  return routes.find((r) => r.path === path);
}

describe('app routes (پیکربندی مسیریابی)', () => {
  it('مسیر خانه/مرور (`\'\'`) را به‌صورت lazy با عنوان و تطبیق کامل تعریف می‌کند', () => {
    const home = findRoute('');
    expect(home).toBeDefined();
    expect(home!.pathMatch).toBe('full');
    expect(typeof home!.loadComponent).toBe('function');
    expect(home!.title).toBeTruthy();
  });

  it('مسیر مطالعهٔ شعر (`poem/:id`) را به‌صورت lazy با عنوان تعریف می‌کند', () => {
    const reading = findRoute('poem/:id');
    expect(reading).toBeDefined();
    expect(typeof reading!.loadComponent).toBe('function');
    expect(reading!.title).toBeTruthy();
  });

  it('مسیر جست‌وجو (`search`) را به‌صورت lazy با عنوان تعریف می‌کند', () => {
    const search = findRoute('search');
    expect(search).toBeDefined();
    expect(typeof search!.loadComponent).toBe('function');
    expect(search!.title).toBeTruthy();
  });

  it('مسیر wildcard (`**`) با هدایت به خانه را تعریف می‌کند', () => {
    const wildcard = findRoute('**');
    expect(wildcard).toBeDefined();
    expect(wildcard!.redirectTo).toBe('');
  });

  it('مسیرهای اصلی برنامه را دقیقاً یک‌بار تعریف می‌کند', () => {
    const mainPaths = ['', 'poem/:id', 'search'];
    for (const p of mainPaths) {
      expect(routes.filter((r) => r.path === p).length).toBe(1);
    }
  });
});

describe('AppShellComponent (پوسته و ناوبری مسیرها)', () => {
  let fixture: ComponentFixture<AppShellComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    host = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('جهت سراسری راست‌به‌چپ (`dir="rtl"`) را روی ریشهٔ پوسته اعمال می‌کند', () => {
    const shell = host.querySelector<HTMLElement>('.shell');
    expect(shell).not.toBeNull();
    expect(shell!.getAttribute('dir')).toBe('rtl');
  });

  it('نام برند و نشان برنامه را در سربرگ نمایش می‌دهد', () => {
    const brand = host.querySelector<HTMLElement>('.shell__brand');
    const icon = host.querySelector<HTMLImageElement>('.shell__brand-icon');
    expect(brand?.textContent?.trim()).toBe('بشنو بخوان');
    expect(icon?.getAttribute('src')).toBe('icons/beshno-bekhan.svg');
  });

  it('سه مسیر اصلی را با برچسب‌های قابل فهم نشان می‌دهد', () => {
    const links = Array.from(host.querySelectorAll<HTMLAnchorElement>('.shell__nav-link'));
    expect(links.length).toBe(3);
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'شنیدن',
      'جست‌وجو',
      'کتابخانه من',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/search',
      '/library',
    ]);
  });

  it('ناوبری اصلی بعد از بستن تور با صفحه‌کلید قابل فوکوس است', () => {
    TestBed.inject(OnboardingTourService).dismiss();
    fixture.detectChanges();
    const firstLink = host.querySelector<HTMLAnchorElement>('.shell__nav-link')!;
    firstLink.focus();
    expect(document.activeElement).toBe(firstLink);
    expect(firstLink.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('در زمان تور آموزشی، ناوبری زمینه غیرفعال است و بعد دوباره فعال می‌شود', () => {
    const tour = TestBed.inject(OnboardingTourService);
    tour.replay();
    fixture.detectChanges();

    const nav = host.querySelector<HTMLElement>('.shell__nav')!;
    const main = host.querySelector<HTMLElement>('.shell__main')!;
    expect(nav.hasAttribute('inert')).toBeTrue();
    expect(main.hasAttribute('inert')).toBeTrue();

    tour.dismiss();
    fixture.detectChanges();
    expect(nav.hasAttribute('inert')).toBeFalse();
    expect(main.hasAttribute('inert')).toBeFalse();
  });

  it('هنگام قطع اتصال، راهنمای فارسی قابل دسترس نمایش می‌دهد', () => {
    const component = fixture.componentInstance;
    component.onOffline();
    fixture.detectChanges();
    const status = host.querySelector<HTMLElement>('[role="status"]');
    expect(status?.textContent).toContain('اینترنت قطع است');

    component.onOnline();
    fixture.detectChanges();
    expect(host.querySelector('[role="status"]')).toBeNull();
  });
});
