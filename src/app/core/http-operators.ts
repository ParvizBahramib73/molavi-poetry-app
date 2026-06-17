/**
 * اپراتورهای مشترک RxJS برای لایهٔ سرویس گنجور.
 *
 * این ماژول یک اپراتور قابل‌استفادهٔ مجدد فراهم می‌کند که روی هر Observable
 * درخواست HTTP اعمال می‌شود و دو مسئولیت دارد:
 *
 * 1. اعمال مهلت {@link REQUEST_TIMEOUT_MS} (۱۰ ثانیه) با اپراتور `timeout`.
 * 2. نگاشت هر خطا با `catchError` به نوع یکپارچهٔ {@link GanjoorApiError}
 *    (با `kind` از نوع timeout/network/http/parse و یک `messageFa` فارسی).
 *
 * پس از انقضای مهلت، `TimeoutError` رخ می‌دهد و به خطای `timeout` نگاشت
 * می‌شود؛ سایر خطاها بر اساس منشأ به network/http/parse نگاشت می‌شوند.
 *
 * Requirements: 6.2, 6.5
 */

import { HttpErrorResponse } from '@angular/common/http';
import { MonoTypeOperatorFunction, Observable, TimeoutError, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

import { REQUEST_TIMEOUT_MS } from '../models/domain.constants';
import { GanjoorApiError } from '../models/errors';

/** پیام فارسی برای خطای انقضای مهلت درخواست. */
const TIMEOUT_MESSAGE_FA = 'زمان درخواست به پایان رسید. لطفاً دوباره تلاش کنید.';

/** پیام فارسی برای خطای ارتباط/شبکه. */
const NETWORK_MESSAGE_FA =
  'خطا در ارتباط با سرور. اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.';

/** پیام فارسی برای پاسخ نامعتبر/غیرقابل‌نگاشت. */
const PARSE_MESSAGE_FA = 'پاسخ دریافتی نامعتبر است. لطفاً دوباره تلاش کنید.';

/**
 * ساخت پیام فارسی برای خطای HTTP بر اساس کد وضعیت.
 */
function httpMessageFa(status: number): string {
  if (status >= 500) {
    return `خطای سرور (کد ${status}). لطفاً بعداً دوباره تلاش کنید.`;
  }
  if (status === 404) {
    return 'محتوای موردنظر یافت نشد (کد ۴۰۴).';
  }
  return `خطا در دریافت اطلاعات از سرور (کد ${status}). لطفاً دوباره تلاش کنید.`;
}

/**
 * نگاشت هر خطای دلخواه به {@link GanjoorApiError} یکپارچه.
 *
 * قواعد نگاشت:
 * - `TimeoutError` از RxJS → `kind: "timeout"`.
 * - `HttpErrorResponse` با `status === 0` (شبکه قطع/خطای CORS) → `kind: "network"`.
 * - `HttpErrorResponse` با `status >= 400` → `kind: "http"` (به‌همراه `status`).
 * - سایر خطاها (از جمله خطاهای نگاشت/parse) → `kind: "parse"`.
 */
export function mapToGanjoorApiError(error: unknown): GanjoorApiError {
  // مهلت درخواست
  if (error instanceof TimeoutError) {
    return { kind: 'timeout', messageFa: TIMEOUT_MESSAGE_FA };
  }

  // خطاهای HttpClient
  if (error instanceof HttpErrorResponse) {
    // status === 0 معمولاً به‌معنای خطای شبکه/CORS و عدم دریافت پاسخ است.
    if (error.status === 0) {
      return { kind: 'network', messageFa: NETWORK_MESSAGE_FA };
    }

    if (error.status >= 400) {
      return {
        kind: 'http',
        status: error.status,
        messageFa: httpMessageFa(error.status),
      };
    }

    // سایر وضعیت‌های غیرمنتظرهٔ HTTP به‌عنوان پاسخ نامعتبر در نظر گرفته می‌شوند.
    return { kind: 'parse', messageFa: PARSE_MESSAGE_FA };
  }

  // هر خطای دیگری (مثلاً شکست در نگاشت پاسخ) → parse
  return { kind: 'parse', messageFa: PARSE_MESSAGE_FA };
}

/**
 * اپراتور مشترک مدیریت خطا برای درخواست‌های گنجور.
 *
 * این اپراتور ابتدا مهلت {@link REQUEST_TIMEOUT_MS} را اعمال می‌کند و سپس هر
 * خطا را با {@link mapToGanjoorApiError} به {@link GanjoorApiError} نگاشت کرده
 * و با `throwError` دوباره پرتاب می‌کند تا مشترکین (subscribers) خطای یکپارچه
 * دریافت کنند.
 *
 * @typeParam T نوع مقدار جریان‌یافته در Observable که بدون تغییر باقی می‌ماند.
 *
 * Requirements: 6.2, 6.5
 */
export function withGanjoorErrorHandling<T>(): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>): Observable<T> =>
    source.pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error: unknown) => throwError(() => mapToGanjoorApiError(error))),
    );
}
