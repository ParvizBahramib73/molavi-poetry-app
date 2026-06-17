/**
 * آزمون smoke واکنش‌گرایی (responsiveness) برای {@link AppShellComponent}.
 *
 * این آزمون سبک و عمل‌گرا است: پوستهٔ برنامه را رندر می‌کند و موارد زیر را
 * به‌صورت غیرشکننده (non-flaky) بررسی می‌کند:
 *  - جهت سراسری راست‌به‌چپ (`dir="rtl"`) و زبان فارسی روی ریشه.
 *  - وجود کانتینرهای واکنش‌گرا (سربرگ، نوار جست‌وجو، ناوبری، main).
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

  it('کانتینرهای واکنش‌گرای اصلی (سربرگ، جست‌وجو، ناوبری، main) را رندر می‌کند', () => {
    expect(host.querySelector('.shell__header')).not.toBeNull();
    expect(host.querySelector('.shell__search')).not.toBeNull();
    expect(host.querySelector('.shell__nav')).not.toBeNull();
    expect(host.querySelector('.shell__main')).not.toBeNull();
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
