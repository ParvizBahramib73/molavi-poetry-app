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
import { Router, Route, provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AppShellComponent } from './app-shell/app-shell.component';

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

  it('هر سه مسیر اصلی را دقیقاً یک‌بار تعریف می‌کند', () => {
    const mainPaths = ['', 'poem/:id', 'search'];
    for (const p of mainPaths) {
      expect(routes.filter((r) => r.path === p).length).toBe(1);
    }
  });
});

describe('AppShellComponent (پوسته و ناوبری مسیرها)', () => {
  let fixture: ComponentFixture<AppShellComponent>;
  let host: HTMLElement;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    host = fixture.nativeElement as HTMLElement;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('جهت سراسری راست‌به‌چپ (`dir="rtl"`) را روی ریشهٔ پوسته اعمال می‌کند', () => {
    const shell = host.querySelector<HTMLElement>('.shell');
    expect(shell).not.toBeNull();
    expect(shell!.getAttribute('dir')).toBe('rtl');
  });

  it('ثبت فرم نوار جست‌وجو به مسیر `/search` ناوبری می‌کند', () => {
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    const form = host.querySelector<HTMLFormElement>('.shell__search')!;
    const input = host.querySelector<HTMLInputElement>('.shell__search-input')!;
    input.value = 'مولوی';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    form.dispatchEvent(new Event('submit'));

    expect(navigateSpy).toHaveBeenCalled();
    expect(navigateSpy.calls.mostRecent().args[0]).toEqual(['/search']);
  });
});
