/**
 * تابع محض نگاشت و مرتب‌سازی ابیات.
 *
 * این ماژول مستقل از Angular و HttpClient است و تنها منطق پاک (pure) نگاشت
 * ابیات خامِ دریافتی از Ganjoor_API به مدل داخلی `Verse` و مرتب‌سازی صعودی
 * بر اساس `vOrder` را فراهم می‌کند. این تابع هیچ بیتی را حذف یا اضافه نمی‌کند
 * (مجموعهٔ ابیات — تعداد و محتوا — حفظ می‌شود) و مرتب‌سازی پایدار (stable) است.
 *
 * Requirements: 2.3
 */

import type { Verse, VersePosition } from '../models';

/**
 * شکل خامِ یک بیت آن‌گونه که از Ganjoor_API دریافت می‌شود.
 *
 * گنجور `versePosition` را معمولاً به‌صورت یک عدد (enum) ارائه می‌دهد، اما برای
 * انعطاف‌پذیری مقدار رشته‌ای (نام جایگاه) نیز پذیرفته می‌شود.
 */
export interface RawVerse {
  vOrder: number;
  text: string;
  versePosition: VersePosition | number | string;
}

/**
 * نگاشت مقدار خامِ `versePosition` به نوع داخلی `VersePosition`.
 *
 * نگاشت عددی بر اساس enum گنجور (`VersePosition`):
 * 0 = Right، 1 = Left، 2/3 = Centered، 4 = Comment.
 * مقادیر ناشناخته به `RIGHT` (پیش‌فرض معقول برای متن RTL) نگاشت می‌شوند.
 */
function normalizePosition(raw: VersePosition | number | string): VersePosition {
  if (typeof raw === 'number') {
    switch (raw) {
      case 0:
        return 'RIGHT';
      case 1:
        return 'LEFT';
      case 2:
      case 3:
        return 'CENTERED';
      case 4:
        return 'COMMENT';
      default:
        return 'RIGHT';
    }
  }

  switch (raw) {
    case 'RIGHT':
    case 'LEFT':
    case 'CENTERED':
    case 'COMMENT':
      return raw;
    case 'Right':
      return 'RIGHT';
    case 'Left':
      return 'LEFT';
    case 'Centered':
    case 'Centered1':
    case 'Centered2':
      return 'CENTERED';
    case 'Comment':
      return 'COMMENT';
    default:
      return 'RIGHT';
  }
}

/**
 * ابیات خام را به مدل داخلی `Verse` نگاشت و بر اساس `vOrder` صعودی مرتب می‌کند.
 *
 * تضمین‌ها:
 * - هیچ بیتی حذف یا افزوده نمی‌شود؛ خروجی دقیقاً همان تعداد ابیات ورودی را دارد
 *   و محتوای آن‌ها حفظ می‌شود (نگهداری multiset).
 * - مرتب‌سازی صعودی بر اساس `vOrder` است.
 * - مرتب‌سازی پایدار (stable) است؛ ابیات با `vOrder` برابر، ترتیب نسبی اولیهٔ
 *   خود را حفظ می‌کنند.
 *
 * @param raw آرایهٔ ابیات خام دریافتی از Ganjoor_API.
 * @returns آرایهٔ ابیات نگاشت‌شده و مرتب‌شده.
 */
export function mapVerses(raw: RawVerse[]): Verse[] {
  return raw
    // حفظ اندیس اولیه برای تضمین پایداری مرتب‌سازی فارغ از موتور اجرا.
    .map((rawVerse, index) => ({ index, rawVerse }))
    .sort((a, b) => {
      const byOrder = a.rawVerse.vOrder - b.rawVerse.vOrder;
      return byOrder !== 0 ? byOrder : a.index - b.index;
    })
    .map(({ rawVerse }) => ({
      vOrder: rawVerse.vOrder,
      text: rawVerse.text,
      position: normalizePosition(rawVerse.versePosition),
    }));
}
