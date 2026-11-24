/**
 * آزمون smoke واکنش‌گرایی (responsiveness) برای {@link AppShellComponent}.
 *
 * این آزمون سبک و عمل‌گرا است: پوستهٔ برنامه را رندر می‌کند و موارد زیر را
 * به‌صورت غیرشکننده (non-flaky) بررسی می‌کند:
 *  - جهت سراسری راست‌به‌چپ (`dir="rtl"`) و زبان فارسی روی ریشه.
 *  - وجود کانتینرهای واکنش‌گرا (سربرگ، ناوبری، main).
 *  - نبودِ سرریز افقیِ آشکار در breakpointهای موبایل (۳۲۰px) و دسکتاپ
 *    (۱۲۸۰px) — یعنی پهنای محتوا از پهنای کانتینر فراتر نرود.
 *
 * به‌جای اندازه‌گیری دقیق پیکسلی (که محیط‌محور و شکننده است)، بررسی‌ها روی
 * وجود `dir=rtl` و کانتینرهای واکنش‌گرا و یک سنجش مقاومِ سرریز تمرکز دارند.
 *
 * Requirements: 6.1, 7.4
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppShellComponent } from './app-shell.component';

describe('AppShellComponent (responsive smoke test)', () => {
  let fixture: ComponentFixture<AppShellComponent>;
  let host: HTMLElement;
  let wrapper: HTMLDivElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);

    // برای سنجش چیدمان واقعی، عنصر را درون یک کانتینر با عرض مشخص به DOM
    // اضافه می‌کنیم تا layout مرورگر محاسبه شود.
    wrapper = document.createElement('div');
    wrapper.style.boxSizing = 'border-box';
    host = fixture.nativeElement as HTMLElement;
    wrapper.appendChild(host);
    document.body.appendChild(wrapper);

    fixture.detectChanges();
  });

  afterEach(() => {
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  });

  it('جهت سراسری راست‌به‌چپ و زبان فارسی را روی ریشهٔ پوسته اعمال می‌کند', () => {
    const shell = host.querySelector<HTMLElement>('.shell');
    expect(shell).not.toBeNull();
    expect(shell!.getAttribute('dir')).toBe('rtl');
    expect(shell!.getAttribute('lang')).toBe('fa');
  });

  it('کانتینرهای ناوبری و محتوای اصلی را رندر می‌کند', () => {
    expect(host.querySelector('.shell__header')).not.toBeNull();
    expect(host.querySelector('.shell__menu-button')).not.toBeNull();
    expect(host.querySelector('.shell__nav')).not.toBeNull();
    expect(host.querySelector('.shell__main')).not.toBeNull();
  });

  it('منوی همبرگری را باز و بسته می‌کند', () => {
    const button = host.querySelector<HTMLButtonElement>('.shell__menu-button')!;
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.menuOpen).toBeTrue();
    expect(host.querySelector('.shell__nav--open')).not.toBeNull();
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.menuOpen).toBeFalse();
  });

  it('سه مقصد اصلی هدف لمسی حداقل ۴۴ پیکسل دارند', () => {
    wrapper.style.width = '320px';
    fixture.detectChanges();
    const links = Array.from(host.querySelectorAll<HTMLElement>('.shell__nav-link'));
    expect(links.length).toBe(3);
    for (const link of links) {
      const rect = link.getBoundingClientRect();
      expect(rect.height).toBeGreaterThanOrEqual(44);
      expect(rect.width).toBeGreaterThanOrEqual(44);
    }
  });

  it('در breakpoint موبایل (۳۲۰px) سرریز افقی آشکار ایجاد نمی‌کند', () => {
    wrapper.style.width = '320px';
    fixture.detectChanges();

    const shell = host.querySelector<HTMLElement>('.shell')!;
    // اجازهٔ یک حاشیهٔ خطای کوچک (۱px) برای گردکردن‌های زیرپیکسلی مرورگر.
    expect(shell.scrollWidth).toBeLessThanOrEqual(shell.clientWidth + 1);
  });

  it('در breakpoint دسکتاپ (۱۲۸۰px) سرریز افقی آشکار ایجاد نمی‌کند', () => {
    wrapper.style.width = '1280px';
    fixture.detectChanges();

    const shell = host.querySelector<HTMLElement>('.shell')!;
    expect(shell.scrollWidth).toBeLessThanOrEqual(shell.clientWidth + 1);
  });
});
