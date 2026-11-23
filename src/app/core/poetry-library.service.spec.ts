import { TestBed } from '@angular/core/testing';
import { PoetryLibraryService } from './poetry-library.service';

describe('PoetryLibraryService', () => {
  let service: PoetryLibraryService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PoetryLibraryService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('adds a poem to favorites and persists it', () => {
    const added = service.toggleFavorite({
      id: 42,
      title: 'بشنو از نی',
      fullUrl: '/moulavi/masnavi/daftar1/sh1',
    });

    expect(added).toBeTrue();
    expect(service.isFavorite(42)).toBeTrue();
    expect(JSON.parse(localStorage.getItem('molavi:favorites:v1') ?? '[]').length).toBe(1);
  });

  it('removes an existing favorite when toggled again', () => {
    service.toggleFavorite({ id: 42, title: 'بشنو از نی' });

    const added = service.toggleFavorite({ id: 42, title: 'بشنو از نی' });

    expect(added).toBeFalse();
    expect(service.isFavorite(42)).toBeFalse();
    expect(service.favorites()).toEqual([]);
  });

  it('updates a poem history entry instead of creating duplicates', () => {
    service.recordListening({
      id: 42,
      title: 'بشنو از نی',
      fullUrl: '/moulavi/masnavi/daftar1/sh1',
      recitationIndex: 1,
      positionSeconds: 12,
      durationSeconds: 120,
    });
    service.recordListening({
      id: 42,
      title: 'بشنو از نی',
      fullUrl: '/moulavi/masnavi/daftar1/sh1',
      recitationIndex: 2,
      positionSeconds: 35,
      durationSeconds: 120,
    });

    expect(service.history().length).toBe(1);
    expect(service.history()[0].recitationIndex).toBe(2);
    expect(service.history()[0].positionSeconds).toBe(35);
  });

  it('keeps the most recent 30 poems in listening history', () => {
    for (let id = 1; id <= 35; id += 1) {
      service.recordListening({
        id,
        title: `شعر ${id}`,
        fullUrl: '',
        recitationIndex: 0,
        positionSeconds: 0,
        durationSeconds: 0,
      });
    }

    expect(service.history().length).toBe(30);
    expect(service.history()[0].id).toBe(35);
    expect(service.history()[29].id).toBe(6);
  });

  it('ignores invalid poem identifiers and tolerates malformed stored data', () => {
    expect(service.toggleFavorite({ id: 0, title: 'نامعتبر' })).toBeFalse();
    service.clearHistory();
    localStorage.setItem('molavi:favorites:v1', '{bad json');

    const fresh = new PoetryLibraryService();
    expect(fresh.favorites()).toEqual([]);
    expect(fresh.history()).toEqual([]);
  });

  it('clears listening history and persists the empty list', () => {
    service.recordListening({
      id: 7,
      title: 'غزل',
      fullUrl: '',
      recitationIndex: 0,
      positionSeconds: 18,
      durationSeconds: 90,
    });

    service.clearHistory();

    expect(service.history()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('molavi:history:v1') ?? 'null')).toEqual([]);
  });
});
