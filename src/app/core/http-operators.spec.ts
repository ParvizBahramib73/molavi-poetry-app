/**
 * آزمون‌های واحد برای منطق timeout و نگاشت خطا در لایهٔ سرویس گنجور.
 *
 * این آزمون‌ها دو رفتار اصلی ماژول http-operators را پوشش می‌دهند:
 *  - نگاشت انواع خطا (timeout/network/http/parse) به GanjoorApiError با messageFa فارسی.
 *  - اعمال مهلت REQUEST_TIMEOUT_MS و نگاشت انقضای آن به kind === "timeout".
 *
 * Requirements: 6.2, 6.5
 */

import { HttpErrorResponse } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { TimeoutError, timer } from 'rxjs';

import { REQUEST_TIMEOUT_MS } from '../models/domain.constants';
import { GanjoorApiError } from '../models/errors';
import { mapToGanjoorApiError, withGanjoorErrorHandling } from './http-operators';

describe('mapToGanjoorApiError', () => {
  it('نگاشت TimeoutError به kind "timeout" با پیام فارسی', () => {
    const result = mapToGanjoorApiError(new TimeoutError());

    expect(result.kind).toBe('timeout');
    expect(result.messageFa).toBeTruthy();
    expect(result.messageFa.length).toBeGreaterThan(0);
  });

  it('نگاشت HttpErrorResponse با status 0 به kind "network" با پیام فارسی', () => {
    const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });

    const result = mapToGanjoorApiError(error);

    expect(result.kind).toBe('network');
    expect(result.messageFa).toBeTruthy();
    expect(result.messageFa.length).toBeGreaterThan(0);
  });

  it('نگاشت HttpErrorResponse با status 404 به kind "http" و حفظ status', () => {
    const error = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });

    const result = mapToGanjoorApiError(error);

    expect(result.kind).toBe('http');
    expect(result.status).toBe(404);
    expect(result.messageFa).toBeTruthy();
    expect(result.messageFa.length).toBeGreaterThan(0);
  });

  it('نگاشت HttpErrorResponse با status 500 به kind "http" و حفظ status', () => {
    const error = new HttpErrorResponse({ status: 500, statusText: 'Server Error' });

    const result = mapToGanjoorApiError(error);

    expect(result.kind).toBe('http');
    expect(result.status).toBe(500);
    expect(result.messageFa).toBeTruthy();
    expect(result.messageFa.length).toBeGreaterThan(0);
  });

  it('نگاشت خطای عمومی (غیر HTTP/timeout) به kind "parse" با پیام فارسی', () => {
    const result = mapToGanjoorApiError(new Error('نگاشت پاسخ شکست خورد'));

    expect(result.kind).toBe('parse');
    expect(result.messageFa).toBeTruthy();
    expect(result.messageFa.length).toBeGreaterThan(0);
  });
});

describe('withGanjoorErrorHandling - رفتار timeout', () => {
  it('پس از انقضای REQUEST_TIMEOUT_MS خطای GanjoorApiError با kind "timeout" پرتاب می‌کند', fakeAsync(() => {
    // منبعی که دیرتر از مهلت مقدار تولید می‌کند تا timeout فعال شود.
    const source$ = timer(REQUEST_TIMEOUT_MS + 1000).pipe(withGanjoorErrorHandling<number>());

    let received: GanjoorApiError | undefined;
    let nextEmitted = false;

    source$.subscribe({
      next: () => {
        nextEmitted = true;
      },
      error: (err: GanjoorApiError) => {
        received = err;
      },
    });

    // پیش از انقضای مهلت هنوز خطایی دریافت نشده است.
    tick(REQUEST_TIMEOUT_MS - 1);
    expect(received).toBeUndefined();
    expect(nextEmitted).toBeFalse();

    // عبور از مهلت → باید خطای timeout دریافت شود.
    tick(2);

    expect(nextEmitted).toBeFalse();
    expect(received).toBeDefined();
    expect(received!.kind).toBe('timeout');
    expect(received!.messageFa).toBeTruthy();
    expect(received!.messageFa.length).toBeGreaterThan(0);
  }));
});
