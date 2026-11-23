import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PoetryLibraryService } from '../../core/poetry-library.service';
import { LibraryComponent } from './library.component';

describe('LibraryComponent', () => {
  let fixture: ComponentFixture<LibraryComponent>;
  let library: PoetryLibraryService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LibraryComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    library = TestBed.inject(PoetryLibraryService);
    fixture = TestBed.createComponent(LibraryComponent);
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('shows helpful empty states when the personal library is empty', () => {
    expect(fixture.nativeElement.textContent).toContain('هنوز شعری نشنیده‌ای');
    expect(fixture.nativeElement.textContent).toContain('هنوز شعری ذخیره نکرده‌ای');
  });


  it('asks before deleting listening history and preserves it on cancel', () => {
    library.recordListening({
      id: 17,
      title: 'غزل',
      fullUrl: '/moulavi/shams/gh1',
      recitationIndex: 0,
      positionSeconds: 19,
      durationSeconds: 100,
    });
    fixture.detectChanges();

    const clear = fixture.nativeElement.querySelector('.library__quiet-action') as HTMLButtonElement;
    clear.click();
    fixture.detectChanges();

    expect(library.history().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('همه آخرین شنیده‌ها پاک شوند؟');

    const cancel = fixture.nativeElement.querySelector('.library__cancel') as HTMLButtonElement;
    cancel.click();
    fixture.detectChanges();

    expect(library.history().length).toBe(1);
    expect(fixture.nativeElement.querySelector('.library__confirm')).toBeNull();
  });

  it('clears history only after the user confirms', () => {
    library.recordListening({
      id: 18,
      title: 'مثنوی',
      fullUrl: '/moulavi/masnavi/daftar1/sh1',
      recitationIndex: 0,
      positionSeconds: 30,
      durationSeconds: 90,
    });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.library__quiet-action').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.library__danger').click();
    fixture.detectChanges();

    expect(library.history().length).toBe(0);
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('تاریخچه شنیدن پاک شد.');
  });

  it('renders a favorite poem added to the local library', () => {
    library.toggleFavorite({ id: 10, title: 'غزل عاشقانه', fullUrl: '/moulavi/shams/gh1' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('غزل عاشقانه');
    expect(fixture.nativeElement.textContent).toContain('اشعار محبوب من');
  });

  it('renders the continue-listening action for recent playback', () => {
    library.recordListening({
      id: 11,
      title: 'مثنوی معنوی',
      fullUrl: '/moulavi/masnavi/daftar1/sh1',
      recitationIndex: 0,
      positionSeconds: 42,
      durationSeconds: 180,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('مثنوی معنوی');
    expect(fixture.nativeElement.textContent).toContain('ادامه شنیدن');
    expect(fixture.nativeElement.textContent).toContain('0:42');
  });
});
