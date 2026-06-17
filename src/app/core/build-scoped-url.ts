/**
 * توابع محض ساخت URL با محدودسازی دامنه به مولوی.
 *
 * این ماژول کاملاً مستقل از Angular/HttpClient است و تنها منطق پاک (pure)
 * ساخت نشانی درخواست را در بر می‌گیرد تا مستقیماً با property-based testing
 * قابل آزمون باشد.
 *
 * قاعدهٔ ثابت دامنه:
 * - برای جست‌وجو، پارامتر `poetId` همواره برابر {@link MOULAVI_POET_ID} (۵)
 *   تنظیم می‌شود تا نتایج به مولوی محدود بمانند.
 * - برای مسیرهای مبتنی بر URL (پارامتر `url`)، نشانی همواره با پیشوند دامنهٔ
 *   مولوی ({@link MOULAVI_URL_SLUG}) ساخته می‌شود.
 *
 * Requirements: 6.4, 5.1
 */

import {
  BASE_URL,
  MOULAVI_POET_ID,
  MOULAVI_URL_SLUG,
} from '../models/domain.constants';

/**
 * تشخیص این‌که آیا درخواست یک جست‌وجو است یا خیر.
 *
 * جست‌وجو زمانی فرض می‌شود که مسیر شامل بخش `search` باشد یا پارامتر `term`
 * (عبارت جست‌وجو) ارسال شده باشد.
 */
function isSearchRequest(
  normalizedPath: string,
  params: Record<string, string | number>,
): boolean {
  return /\/search(\/|$)/.test(normalizedPath) || 'term' in params;
}

/**
 * محدودسازی مقدار پارامتر `url` به دامنهٔ مولوی.
 *
 * مقدار همواره با یک اسلش پیشین و سپس slug مولوی شروع می‌شود؛ اگر مقدار
 * از قبل با `moulavi` آغاز شده باشد، بدون افزودن پیشوند تکراری بازگردانده
 * می‌شود.
 */
function scopeUrlParam(rawValue: string): string {
  const trimmed = rawValue.trim();

  // مقدار خالی → ریشهٔ دامنهٔ مولوی
  if (trimmed === '') {
    return `/${MOULAVI_URL_SLUG}`;
  }

  // اطمینان از اسلش پیشین
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  // اولین بخش معنادار مسیر
  const firstSegment = withLeadingSlash.split('/').filter(Boolean)[0];

  if (firstSegment === MOULAVI_URL_SLUG) {
    return withLeadingSlash;
  }

  return `/${MOULAVI_URL_SLUG}${withLeadingSlash}`;
}

/**
 * ساخت نشانی کامل درخواست با تضمین محدودسازی دامنه به مولوی.
 *
 * @param path مسیر نسبی endpoint (مثلاً `/api/ganjoor/poems/search`).
 *   اگر اسلش پیشین نداشته باشد، اضافه می‌شود.
 * @param params پارامترهای پرس‌وجو (query). برای جست‌وجو، `poetId` همواره
 *   با {@link MOULAVI_POET_ID} بازنویسی می‌شود؛ پارامتر `url` به دامنهٔ مولوی
 *   محدود می‌شود.
 * @returns نشانی مطلق ساخته‌شده بر پایهٔ {@link BASE_URL}.
 *
 * Requirements: 6.4, 5.1
 */
export function buildScopedUrl(
  path: string,
  params: Record<string, string | number> = {},
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const search = isSearchRequest(normalizedPath, params);

  const query = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(params)) {
    // برای جست‌وجو، poetId به‌صورت قطعی پایین‌تر تنظیم می‌شود؛ از تنظیم
    // مقدار ورودی صرف‌نظر می‌کنیم تا دامنه قابل دور زدن نباشد.
    if (key === 'poetId' && search) {
      continue;
    }

    const value = key === 'url' ? scopeUrlParam(String(rawValue)) : String(rawValue);
    query.set(key, value);
  }

  // تضمین محدودسازی جست‌وجو به مولوی.
  if (search) {
    query.set('poetId', String(MOULAVI_POET_ID));
  }

  const queryString = query.toString();
  return queryString
    ? `${BASE_URL}${normalizedPath}?${queryString}`
    : `${BASE_URL}${normalizedPath}`;
}
