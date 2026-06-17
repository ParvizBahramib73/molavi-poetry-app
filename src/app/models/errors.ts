/**
 * نوع‌های خطای یکپارچهٔ اپلیکیشن شعر مولوی.
 *
 * همهٔ خطاهای لایهٔ سرویس به نوع یکپارچهٔ GanjoorApiError با پیام فارسی
 * (messageFa) نگاشت می‌شوند تا UI رفتار یکنواختی داشته باشد.
 *
 * Requirements: 6.4
 */

/** دستهٔ خطا در لایهٔ سرویس. */
export type GanjoorApiErrorKind = 'timeout' | 'network' | 'http' | 'parse';

/** خطای یکپارچهٔ لایهٔ سرویس با پیام فارسی. */
export interface GanjoorApiError {
  kind: GanjoorApiErrorKind;
  /** کد وضعیت HTTP در صورت وجود (برای kind === "http"). */
  status?: number;
  /** پیام خطای فارسی قابل نمایش به کاربر. */
  messageFa: string;
}
