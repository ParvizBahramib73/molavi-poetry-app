import fc from 'fast-check';

import {
  computeVerseTimings,
  findCurrentVerseIndex,
  formatTime,
} from './verse-timing';

/** ساخت آرایهٔ بیت‌های آزمونی از روی متن‌ها. */
function verses(texts: string[]): { text: string }[] {
  return texts.map((text) => ({ text }));
}

describe('computeVerseTimings', () => {
  it('should return the same length as the input verses', () => {
    const result = computeVerseTimings(verses(['a', 'bb', 'ccc']), 120);
    expect(result.length).toBe(3);
  });

  it('should always start the first verse at 0', () => {
    const result = computeVerseTimings(verses(['a', 'bb', 'ccc']), 120);
    expect(result[0]).toBe(0);
  });

  it('should produce non-decreasing timings', () => {
    const result = computeVerseTimings(
      verses(['short', 'a much longer verse here', 'mid']),
      300,
    );
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
    }
  });

  it('should keep the last start time strictly below the duration', () => {
    const result = computeVerseTimings(verses(['a', 'bb', 'ccc']), 120);
    expect(result[result.length - 1]).toBeLessThan(120);
  });

  it('should give longer verses proportionally more time', () => {
    // بیت دوم بسیار بلندتر است → فاصلهٔ زمانی پس از آن باید بزرگ‌تر باشد.
    const result = computeVerseTimings(
      verses(['x', 'this is a very long verse with much more text', 'y']),
      100,
    );
    const gap1 = result[1] - result[0];
    const gap2 = result[2] - result[1];
    expect(gap2).toBeGreaterThan(gap1);
  });

  it('should advance even for empty verses (minimum weight of 1)', () => {
    const result = computeVerseTimings(verses(['', '', '']), 90);
    expect(result[0]).toBe(0);
    expect(result[1]).toBeGreaterThan(result[0]);
    expect(result[2]).toBeGreaterThan(result[1]);
  });

  it('should return zeros when duration is zero', () => {
    expect(computeVerseTimings(verses(['a', 'b']), 0)).toEqual([0, 0]);
  });

  it('should return zeros when duration is negative', () => {
    expect(computeVerseTimings(verses(['a', 'b', 'c']), -10)).toEqual([
      0, 0, 0,
    ]);
  });

  it('should return an empty array for no verses', () => {
    expect(computeVerseTimings([], 120)).toEqual([]);
    expect(computeVerseTimings([], 0)).toEqual([]);
  });

  // Feature: molavi-poetry-app, Property: verse timings monotonic
  it('should always be non-decreasing with matching length for arbitrary input', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 60 }),
        fc.double({ min: 0.001, max: 100000, noNaN: true }),
        (texts, duration) => {
          const result = computeVerseTimings(verses(texts), duration);
          // طول خروجی برابر ورودی است.
          expect(result.length).toBe(texts.length);
          // نخستین زمان همواره ۰.
          expect(result[0]).toBe(0);
          // غیرنزولی.
          for (let i = 1; i < result.length; i++) {
            expect(result[i]).toBeGreaterThanOrEqual(result[i - 1]);
          }
          // آخرین زمان شروع کوچک‌تر از مدت‌زمان.
          expect(result[result.length - 1]).toBeLessThan(duration);
        },
      ),
    );
  });
});

describe('findCurrentVerseIndex', () => {
  const timings = [0, 10, 25, 40];

  it('should return -1 for an empty timings array', () => {
    expect(findCurrentVerseIndex([], 5)).toBe(-1);
  });

  it('should return 0 when current time is before the first start', () => {
    expect(findCurrentVerseIndex(timings, -5)).toBe(0);
  });

  it('should return 0 at the very start', () => {
    expect(findCurrentVerseIndex(timings, 0)).toBe(0);
  });

  it('should return the index of the last verse whose start <= current time', () => {
    expect(findCurrentVerseIndex(timings, 10)).toBe(1);
    expect(findCurrentVerseIndex(timings, 24)).toBe(1);
    expect(findCurrentVerseIndex(timings, 25)).toBe(2);
    expect(findCurrentVerseIndex(timings, 39.9)).toBe(2);
  });

  it('should return the last index after the last start', () => {
    expect(findCurrentVerseIndex(timings, 999)).toBe(3);
  });

  it('should handle NaN current time as the start', () => {
    expect(findCurrentVerseIndex(timings, NaN)).toBe(0);
  });
});

describe('formatTime', () => {
  it('should format seconds as mm:ss', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(65)).toBe('1:05');
    expect(formatTime(125)).toBe('2:05');
    expect(formatTime(600)).toBe('10:00');
  });

  it('should floor fractional seconds', () => {
    expect(formatTime(59.9)).toBe('0:59');
  });

  it('should guard NaN and negative values to 0:00', () => {
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(-1)).toBe('0:00');
    expect(formatTime(Infinity)).toBe('0:00');
  });
});
