/**
 * ثابت‌های دامنهٔ اپلیکیشن شعر مولوی.
 *
 * این برنامه فقط آثار مولانا را نمایش می‌دهد و تمام داده‌ها مستقیماً از
 * Ganjoor_API دریافت می‌شوند. ثابت‌های زیر برای محدودسازی دامنه به مولوی،
 * نشانی پایهٔ API و مهلت درخواست استفاده می‌شوند.
 *
 * Requirements: 6.1, 6.4
 */

/** شناسهٔ عددی مولوی در گنجور. */
export const MOULAVI_POET_ID = 5 as const;

/** شناسهٔ URL (slug) مولوی در گنجور. */
export const MOULAVI_URL_SLUG = 'moulavi' as const;

/** نشانی پایهٔ Ganjoor_API. */
export const BASE_URL = 'https://api.ganjoor.net' as const;

/** مهلت هر درخواست HTTP بر حسب میلی‌ثانیه (۱۰ ثانیه). */
export const REQUEST_TIMEOUT_MS = 10_000 as const;
