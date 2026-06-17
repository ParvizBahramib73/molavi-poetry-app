/**
 * منطق ناب و خالص همگام‌سازی ابیات با صوت (بدون وابستگی به Angular).
 *
 * این توابع برای محاسبهٔ زمان‌بندی شروع هر بیت بر اساس مدت‌زمان کل خوانش و
 * طول متن هر بیت استفاده می‌شوند تا بتوان بیت فعال را در هر لحظه تعیین کرد.
 * نگه‌داشتن این منطق به‌صورت خالص، آزمون واحد و آزمون مبتنی بر ویژگی
 * (property-based) را ساده می‌کند.
 *
 * Feature: molavi-poetry-app
 */

/** کمینهٔ ساختار یک بیت قابل پخش برای محاسبهٔ زمان‌بندی. */
export interface PlayableVerse {
  vOrder: number;
  text: string;
}

/**
 * محاسبهٔ زمان شروع (ثانیه) هر بیت، وزن‌دهی‌شده بر اساس طول متن بیت.
 *
 * قواعد:
 * - اگر مدت‌زمان <= 0 باشد یا بیتی وجود نداشته باشد → آرایه‌ای از صفرها با همان
 *   طول بازگردانده می‌شود.
 * - زمان شروع نخستین بیت همواره 0 است.
 * - زمان‌بندی‌ها صعودی (غیرنزولی) هستند.
 * - زمان شروع آخرین بیت همواره کوچک‌تر از مدت‌زمان کل است.
 * - برای هر بیت کمینه وزن ۱ در نظر گرفته می‌شود تا بیت‌های خالی نیز پیش بروند.
 */
export function computeVerseTimings(
  verses: { text: string }[],
  durationSeconds: number,
): number[] {
  const count = verses.length;

  // بدون بیت → آرایهٔ خالی؛ مدت‌زمان نامعتبر → آرایه‌ای از صفرها.
  if (count === 0) {
    return [];
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return new Array<number>(count).fill(0);
  }

  // وزن هر بیت: طول متن بدون فاصله، با کمینهٔ ۱.
  const weights = verses.map((v) => {
    const len = (v?.text ?? '').trim().length;
    return Math.max(1, len);
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // زمان شروع هر بیت = جمع تجمعی سهم زمانی بیت‌های پیشین.
  const timings = new Array<number>(count);
  let cumulativeWeight = 0;
  for (let i = 0; i < count; i++) {
    timings[i] = (cumulativeWeight / totalWeight) * durationSeconds;
    cumulativeWeight += weights[i];
  }

  return timings;
}

/**
 * یافتن اندیس آخرین بیتی که زمان شروع آن <= زمان جاری است.
 *
 * - اگر زمان جاری کوچک‌تر از زمان شروع نخستین بیت باشد → 0.
 * - برای آرایهٔ خالی → -1.
 */
export function findCurrentVerseIndex(
  timings: number[],
  currentTimeSeconds: number,
): number {
  if (!timings || timings.length === 0) {
    return -1;
  }

  const t = Number.isFinite(currentTimeSeconds)
    ? Math.max(0, currentTimeSeconds)
    : 0;

  // پیش از نخستین بیت → بیت نخست.
  if (t < timings[0]) {
    return 0;
  }

  let index = 0;
  for (let i = 0; i < timings.length; i++) {
    if (timings[i] <= t) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}

/** قالب‌بندی زمان به‌صورت mm:ss؛ مقادیر NaN/منفی → '0:00'. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** یک ردیف از داده‌ی همگام‌سازیِ دقیقِ گنجور (زمان شروع هر بیت). */
export interface SyncEntry {
  /** شمارهٔ بیت؛ با vOrder ابیات هم‌تراز است (۰ = عنوان شعر). */
  verseOrder: number;
  /** زمان شروع بیت در فایل صوتی، برحسب میلی‌ثانیه. */
  audioStartMs: number;
}

/**
 * آیا داده‌ی همگام‌سازی قابل‌استفاده (دقیق) است؟
 *
 * تنها در صورتی «دقیق» تلقی می‌شود که دست‌کم یک ردیف وجود داشته باشد و
 * حداقل یک زمانِ شروعِ بزرگ‌تر از صفر داشته باشیم (تا خوانش‌های فاقد همگام‌سازی
 * واقعی به‌اشتباه دقیق در نظر گرفته نشوند).
 */
export function hasUsableSync(sync: SyncEntry[] | null | undefined): boolean {
  if (!sync || sync.length === 0) {
    return false;
  }
  return sync.some(
    (s) => Number.isFinite(s?.audioStartMs) && s.audioStartMs > 0,
  );
}

/**
 * ساخت زمان‌بندیِ دقیقِ ابیات (ثانیه) از روی داده‌ی همگام‌سازیِ گنجور.
 *
 * هر بیت با `vOrder` به ردیفِ متناظر در `sync` (با `verseOrder === vOrder`)
 * نگاشت می‌شود. اگر بیتی در داده‌ی sync نباشد، زمانِ بیتِ پیشین حفظ می‌شود تا
 * خروجی همواره غیرنزولی بماند. خروجی هم‌طول با `verses` است.
 *
 * این تابع خالص است و به Angular وابسته نیست.
 */
export function buildTimingsFromSync(
  verses: { vOrder: number }[],
  sync: SyncEntry[],
): number[] {
  const map = new Map<number, number>();
  for (const s of sync ?? []) {
    if (
      typeof s?.verseOrder === 'number' &&
      Number.isFinite(s?.audioStartMs)
    ) {
      map.set(s.verseOrder, Math.max(0, s.audioStartMs / 1000));
    }
  }

  const timings: number[] = [];
  let prev = 0;
  for (let i = 0; i < verses.length; i++) {
    const v = verses[i]?.vOrder;
    let t = map.has(v) ? (map.get(v) as number) : prev;
    if (!Number.isFinite(t) || t < prev) {
      t = prev;
    }
    timings.push(t);
    prev = t;
  }
  return timings;
}
