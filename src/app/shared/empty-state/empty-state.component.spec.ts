import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;
  let component: EmptyStateComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the default message when none is provided', () => {
    fixture.detectChanges();
    const message = fixture.nativeElement.querySelector('.empty__message') as HTMLElement;
    expect(message.textContent?.trim()).toBe('موردی یافت نشد.');
  });

  it('should render the provided message input', () => {
    component.message = 'خوانش صوتی موجود نیست.';
    fixture.detectChanges();
    const message = fixture.nativeElement.querySelector('.empty__message') as HTMLElement;
    expect(message.textContent?.trim()).toBe('خوانش صوتی موجود نیست.');
  });
});
