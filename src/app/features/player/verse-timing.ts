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
