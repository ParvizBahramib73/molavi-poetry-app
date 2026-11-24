import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ONBOARDING_STORAGE_KEY, OnboardingTourService } from '../../core/onboarding-tour.service';
import { FirstRunTourComponent } from './first-run-tour.component';

describe('FirstRunTourComponent (Persian first-use guide)', () => {
  let fixture: ComponentFixture<FirstRunTourComponent>;
  let tour: OnboardingTourService;
  let wrapper: HTMLElement;

  beforeEach(async () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [FirstRunTourComponent],
    }).compileComponents();

    tour = TestBed.inject(OnboardingTourService);
    fixture = TestBed.createComponent(FirstRunTourComponent);
    wrapper = document.createElement('div');
    wrapper.appendChild(fixture.nativeElement);
    document.body.appendChild(wrapper);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    wrapper.remove();
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  });

  it('starts hidden and displays a Persian accessible dialog when first opened', () => {
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();

    tour.startIfFirstVisit();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('lang')).toBe('fa');
    expect(dialog.getAttribute('dir')).toBe('rtl');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('مرحله 1 از 5');
    expect(dialog.textContent).toContain('به مولوی خوش آمدی');
  });

  it('explains the actual listen/search/reading/favorites workflows in five steps', () => {
    tour.replay();
    fixture.detectChanges();

    const expected = [
      'به مولوی خوش آمدی',
      'به شعر گوش بده',
      'شعر را پیدا کن',
      'متن شعر را راحت بخوان',
      'شعرهای دوست‌داشتنی‌ات را نگه دار',
    ];

    for (let i = 0; i < expected.length; i += 1) {
      const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
      expect(dialog.textContent).toContain(expected[i]);
      if (i !== expected.length - 1) {
        const next = dialog.querySelector('.tour__primary') as HTMLButtonElement;
        next.click();
        fixture.detectChanges();
      }
    }
    expect(fixture.nativeElement.textContent).toContain('شروع استفاده');
    (fixture.nativeElement.querySelector('.tour__primary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(tour.isOpen()).toBeFalse();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('yes');
  });

  it('allows skipping immediately and remembers the choice', () => {
    tour.replay();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.tour__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(tour.isOpen()).toBeFalse();
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('yes');
  });

  it('supports going back and pressing Escape without blocking the app', () => {
    tour.replay();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.tour__primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.tour__secondary') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(tour.stepIndex()).toBe(0);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(tour.isOpen()).toBeFalse();
  });

  it('keeps keyboard focus inside the modal and restores it on closing', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'راهنمای استفاده';
    wrapper.appendChild(trigger);
    trigger.focus();

    tour.replay();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(document.activeElement).toBe(dialog);

    const buttons = dialog.querySelectorAll<HTMLButtonElement>('button');
    const last = buttons[buttons.length - 1];
    last.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);

    (dialog.querySelector('.tour__close') as HTMLButtonElement).click();
    fixture.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(document.activeElement).toBe(trigger);
  });

  it('provides large enough next/skip targets on a narrow phone', () => {
    wrapper.style.width = '320px';
    tour.replay();
    fixture.detectChanges();

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.tour__actions button');
    expect(buttons.length).toBe(2);
    for (const button of buttons) {
      expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  });
});
