import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Recitation } from '../../models';
import { RecitationListComponent } from './recitation-list.component';

/**
 * آزمون واحد برای فهرست خوانش‌های صوتی.
 *
 * Requirements: 3.1, 3.5
 */
describe('RecitationListComponent', () => {
  let fixture: ComponentFixture<RecitationListComponent>;
  let component: RecitationListComponent;

  const recitations: Recitation[] = [
    {
      id: 1,
      audioTitle: 'خوانش نخست',
      audioArtist: 'استاد اول',
      mp3Url: 'https://example.com/1.mp3',
    },
    {
      id: 2,
      audioTitle: 'خوانش دوم',
      audioArtist: 'استاد دوم',
      mp3Url: 'https://example.com/2.mp3',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecitationListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RecitationListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one item per recitation with the artist name', () => {
    component.recitations = recitations;
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.recitations__item') as NodeListOf<HTMLElement>;
    expect(items.length).toBe(2);

    const artists = fixture.nativeElement.querySelectorAll('.recitations__artist') as NodeListOf<HTMLElement>;
    expect(artists[0].textContent?.trim()).toBe('استاد اول');
    expect(artists[1].textContent?.trim()).toBe('استاد دوم');
  });

  it('should fall back to a placeholder artist when audioArtist is empty', () => {
    component.recitations = [{ ...recitations[0], audioArtist: '' }];
    fixture.detectChanges();

    const artist = fixture.nativeElement.querySelector('.recitations__artist') as HTMLElement;
    expect(artist.textContent?.trim()).toBe('دکلمه‌کنندهٔ نامشخص');
  });

  it('should emit the selected recitation when an item is clicked', () => {
    const emitted: Recitation[] = [];
    component.select.subscribe((r) => emitted.push(r));
    component.recitations = recitations;
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.recitations__btn') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual(recitations[1]);
  });

  it('should show the empty-state message when the list is empty', () => {
    component.recitations = [];
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.empty__message') as HTMLElement;
    expect(empty).toBeTruthy();
    expect(empty.textContent?.trim()).toBe('خوانش صوتی برای این شعر موجود نیست');

    const list = fixture.nativeElement.querySelector('.recitations') as HTMLElement | null;
    expect(list).toBeNull();
  });

  it('should mark the active recitation via aria-pressed', () => {
    component.recitations = recitations;
    component.selectedId = 2;
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.recitations__btn') as NodeListOf<HTMLButtonElement>;
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  });
});
