/**
 * آزمون واحد برای {@link GanjoorService.getRecitationSync}:
 * ارسال GET به `/api/audio/verses/{id}` و نگاشت
 * `{ verseOrder, audioStartMilliseconds }` به مدل داخلی `{ verseOrder, audioStartMs }`.
 *
 * Requirements: 3.1, 6.1
 */

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { VerseSync } from '../models';
import { GanjoorService } from './ganjoor.service';

describe('GanjoorService.getRecitationSync', () => {
  let service: GanjoorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        GanjoorService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(GanjoorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('GET را به /api/audio/verses/{id} می‌فرستد و فیلدها را نگاشت می‌کند', () => {
    let result: VerseSync[] | undefined;
    service.getRecitationSync(4646).subscribe((s) => (result = s));

    const req = httpMock.expectOne(
      (r) => r.method === 'GET' && r.url.includes('/api/audio/verses/4646'),
    );
    expect(req.request.url).toContain('https://api.ganjoor.net');

    req.flush([
      { verseOrder: 0, verseText: 'عنوان', audioStartMilliseconds: 0 },
      { verseOrder: 1, verseText: 'بیت اول', audioStartMilliseconds: 14274 },
      { verseOrder: 2, verseText: 'بیت دوم', audioStartMilliseconds: 21924 },
    ]);

    expect(result).toBeDefined();
    expect(result!.length).toBe(3);
    expect(result![0]).toEqual({ verseOrder: 0, audioStartMs: 0 });
    expect(result![1]).toEqual({ verseOrder: 1, audioStartMs: 14274 });
    expect(result![2]).toEqual({ verseOrder: 2, audioStartMs: 21924 });
  });

  it('برای پاسخ خالی، آرایهٔ خالی بازمی‌گرداند', () => {
    let result: VerseSync[] | undefined;
    service.getRecitationSync(1).subscribe((s) => (result = s));

    const req = httpMock.expectOne(
      (r) => r.method === 'GET' && r.url.includes('/api/audio/verses/1'),
    );
    req.flush([]);

    expect(result).toEqual([]);
  });
});
