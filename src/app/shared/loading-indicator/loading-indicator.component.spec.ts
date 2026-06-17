import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingIndicatorComponent } from './loading-indicator.component';

describe('LoadingIndicatorComponent', () => {
  let fixture: ComponentFixture<LoadingIndicatorComponent>;
  let component: LoadingIndicatorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingIndicatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render and show the default loading message', () => {
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('.loading__text') as HTMLElement;
    expect(text.textContent?.trim()).toBe('در حال بارگذاری…');
  });

  it('should render the provided message input', () => {
    component.message = 'لطفاً صبر کنید…';
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('.loading__text') as HTMLElement;
    expect(text.textContent?.trim()).toBe('لطفاً صبر کنید…');
  });
});
