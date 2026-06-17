import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorStateComponent } from './error-state.component';

describe('ErrorStateComponent', () => {
  let fixture: ComponentFixture<ErrorStateComponent>;
  let component: ErrorStateComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorStateComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the default message when none is provided', () => {
    fixture.detectChanges();
    const message = fixture.nativeElement.querySelector('.error__message') as HTMLElement;
    expect(message.textContent?.trim()).toBe('خطایی رخ داد. لطفاً دوباره تلاش کنید.');
  });

  it('should render the provided message input', () => {
    component.message = 'خطای شبکه رخ داد.';
    fixture.detectChanges();
    const message = fixture.nativeElement.querySelector('.error__message') as HTMLElement;
    expect(message.textContent?.trim()).toBe('خطای شبکه رخ داد.');
  });

  it('should emit the retry event when the retry button is clicked', () => {
    const emitSpy = spyOn(component.retry, 'emit');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.error__retry') as HTMLButtonElement;
    button.click();
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should render the retry button with the provided label when showRetry is true', () => {
    component.showRetry = true;
    component.retryLabel = 'دوباره';
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.error__retry') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.textContent?.trim()).toBe('دوباره');
  });

  it('should not render the retry button when showRetry is false', () => {
    component.showRetry = false;
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.error__retry') as HTMLButtonElement | null;
    expect(button).toBeNull();
  });
});
