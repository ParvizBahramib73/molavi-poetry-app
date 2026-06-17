/**
 * تابع محض فیلتر نتایج به دامنهٔ مولوی.
 *
 * این تابع مستقل از Angular و HttpClient است تا مستقیماً قابل آزمون با
 * property-based testing باشد. هدف آن تضمین این است که خروجی هر فهرستی از
 * آیتم‌های دارای `fullUrl` (دسته‌ها، شعرها یا نتایج جست‌وجو) تنها شامل
 * آیتم‌های متعلق به دامنهٔ مولوی باشد و هیچ آیتم خارج از دامنه را برنگرداند.
 *
 * Requirements: 1.4, 5.1
 */

import { MOULAVI_URL_SLUG } from '../models';

/** شکل کمینهٔ آیتمی که می‌تواند به دامنهٔ مولوی محدود شود. */
export interface ScopableItem {
  /** مسیر کامل گنجور، مثل /moulavi/masnavi/daftar2/sh8. */
  fullUrl: string;
}

/**
 * بررسی می‌کند که آیا یک نشانی (fullUrl) به دامنهٔ مولوی تعلق دارد یا نه.
 *
 * یک آیتم متعلق به مولوی است اگر اولین بخشِ مسیرِ `fullUrl` برابر با
 * slug مولوی ("moulavi") باشد؛ مثلاً «/moulavi»، «/moulavi/» یا
 * «/moulavi/masnavi/...». این بررسی نسبت به اسلش‌های ابتدایی/انتهایی و
 * فضای خالی مقاوم است و از تطبیق نادرست با slugهایی که با «moulavi» شروع
 * می‌شوند (مثل «/moulavi-x») جلوگیری می‌کند.
 */
export function belongsToMoulavi(fullUrl: string | null | undefined): boolean {
  if (typeof fullUrl !== 'string') {
    return false;
  }

  // حذف فضای خالی ابتدا/انتها و سپس اسلش‌های ابتدایی.
  const trimmed = fullUrl.trim().replace(/^\/+/, '');
  if (trimmed.length === 0) {
    return false;
  }

  // اولین بخش مسیر (پیش از نخستین اسلش) را استخراج می‌کنیم.
  const firstSegment = trimmed.split('/', 1)[0];

  return firstSegment === MOULAVI_URL_SLUG;
}

/**
 * تنها آیتم‌هایی را بازمی‌گرداند که به دامنهٔ مولوی تعلق دارند.
 *
 * ترتیب نسبی آیتم‌های باقی‌مانده حفظ می‌شود و آرایهٔ ورودی تغییر نمی‌کند.
 *
 * @typeParam T - هر آیتمی که دارای فیلد `fullUrl` رشته‌ای باشد.
 * @param items - فهرست خام آیتم‌ها (که ممکن است شامل آیتم‌های خارج از دامنه باشد).
 * @returns فهرستی تازه شامل تنها آیتم‌های مولوی.
 */
export function scopeResults<T extends ScopableItem>(items: readonly T[]): T[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((item) => belongsToMoulavi(item?.fullUrl));
}
