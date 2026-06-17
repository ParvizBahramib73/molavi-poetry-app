/**
 * آزمون توابع خالصِ همگام‌سازیِ دقیق:
 * - hasUsableSync: تشخیص داده‌ی همگام‌سازیِ قابل‌استفاده.
 * - buildTimingsFromSync: نگاشت verseOrder→vOrder و ساخت زمان‌بندیِ غیرنزولی.
 */

import {
  buildTimingsFromSync,
  hasUsableSync,
  SyncEntry,
} from './verse-timing';

describe('hasUsableSync', () => {
  it('برای آرایهٔ خالی/null/undefined نادرست است', () => {
    expect(hasUsableSync([])).toBeFalse();
    expect(hasUsableSync(null)).toBeFalse();
    expect(hasUsableSync(undefined)).toBeFalse();
  });

  it('اگر همهٔ زمان‌ها صفر باشند نادرست است', () => {
    expect(
      hasUsableSync([
        { verseOrder: 0, audioStartMs: 0 },
        { verseOrder: 1, audioStartMs: 0 },
      ]),
    ).toBeFalse();
  });

  it('اگر دست‌کم یک زمانِ بزرگ‌تر از صفر باشد درست است', () => {
    expect(
      hasUsableSync([
        { verseOrder: 0, audioStartMs: 0 },
        { verseOrder: 1, audioStartMs: 1200 },
      ]),
    ).toBeTrue();
  });
});

describe('buildTimingsFromSync', () => {
  it('vOrder ابیات را به verseOrder داده‌ی sync (به ثانیه) نگاشت می‌کند', () => {
    const verses = [{ vOrder: 1 }, { vOrder: 2 }, { vOrder: 3 }];
    const sync: SyncEntry[] = [
      { verseOrder: 0, audioStartMs: 0 }, // عنوان — نادیده گرفته می‌شود
      { verseOrder: 1, audioStartMs: 14274 },
      { verseOrder: 2, audioStartMs: 21924 },
      { verseOrder: 3, audioStartMs: 31200 },
    ];

    const t = buildTimingsFromSync(verses, sync);

    expect(t.length).toBe(3);
    expect(t[0]).toBeCloseTo(14.274, 3);
    expect(t[1]).toBeCloseTo(21.924, 3);
    expect(t[2]).toBeCloseTo(31.2, 3);
  });

  it('برای بیتِ غایب، زمانِ بیتِ پیشین را حفظ و غیرنزولی می‌ماند', () => {
    const verses = [{ vOrder: 1 }, { vOrder: 2 }, { vOrder: 3 }];
    const sync: SyncEntry[] = [
      { verseOrder: 1, audioStartMs: 10000 },
      // vOrder 2 وجود ندارد
      { verseOrder: 3, audioStartMs: 30000 },
    ];

    const t = buildTimingsFromSync(verses, sync);

    expect(t[0]).toBeCloseTo(10, 3);
    expect(t[1]).toBeCloseTo(10, 3); // حفظ‌شده از بیتِ پیشین
    expect(t[2]).toBeCloseTo(30, 3);
    for (let i = 1; i < t.length; i++) {
      expect(t[i]).toBeGreaterThanOrEqual(t[i - 1]);
    }
  });

  it('خروجی هم‌طول با ابیات است', () => {
    expect(buildTimingsFromSync([{ vOrder: 1 }, { vOrder: 2 }], []).length).toBe(
      2,
    );
  });
});
