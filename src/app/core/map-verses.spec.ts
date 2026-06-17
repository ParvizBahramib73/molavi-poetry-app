/**
 * آزمون property-based برای تابع محض `mapVerses`.
 *
 * این آزمون «Property 3: حفظ و مرتب‌سازی ترتیب ابیات (Verse ordering invariant)»
 * را از سند طراحی پوشش می‌دهد: برای هر آرایهٔ دلخواه از ابیات با `vOrder` درهم،
 * خروجی باید (الف) همان تعداد بیت ورودی را داشته باشد، (ب) بر اساس `vOrder`
 * صعودی مرتب باشد، (ج) مجموعهٔ (multiset) جفت‌های (vOrder, text) را حفظ کند و
 * (د) برای ابیات با `vOrder` برابر، ترتیب نسبی اولیه (پایداری/stability) را نگه دارد.
 */

import * as fc from 'fast-check';
import { mapVerses, type RawVerse } from './map-verses';

/** کلید سریال‌سازی یک جفت (vOrder, text) برای مقایسهٔ multiset. */
function pairKey(vOrder: number, text: string): string {
  return `${vOrder}::${text}`;
}

/** شمارش رخدادهای هر جفت (vOrder, text) — نمایش multiset. */
function multiset(pairs: ReadonlyArray<{ vOrder: number; text: string }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { vOrder, text } of pairs) {
    const key = pairKey(vOrder, text);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * مولد یک بیت خام تصادفی:
 * - `vOrder`: عدد صحیح در بازه‌ای کوچک تا احتمال تکرار (و در نتیجه آزمون پایداری) بالا برود.
 * - `text`: رشتهٔ دلخواه (شامل رشتهٔ خالی).
 * - `versePosition`: ترکیبی از مقادیر عددی و رشته‌ای معتبر/نامعتبر برای پوشش نگاشت.
 */
const rawVerseArb: fc.Arbitrary<RawVerse> = fc.record({
  vOrder: fc.integer({ min: -5, max: 15 }),
  text: fc.string(),
  versePosition: fc.oneof(
    fc.integer({ min: -2, max: 6 }),
    fc.constantFrom('RIGHT', 'LEFT', 'CENTERED', 'COMMENT', 'Right', 'Left', 'Centered', 'unknown'),
  ),
});

describe('mapVerses — Property 3: حفظ و مرتب‌سازی ترتیب ابیات', () => {
  // Feature: molavi-poetry-app, Property 3: حفظ و مرتب‌سازی ترتیب ابیات (Verse ordering invariant)
  it('ابیات را بدون حذف/افزودن، صعودی و پایدار بر اساس vOrder مرتب می‌کند', () => {
    fc.assert(
      fc.property(fc.array(rawVerseArb, { maxLength: 50 }), (raw) => {
        const result = mapVerses(raw);

        // (الف) هیچ بیتی حذف یا افزوده نشده است.
        expect(result.length).toBe(raw.length);

        // (ب) خروجی بر اساس vOrder صعودی مرتب است.
        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1].vOrder).toBeLessThanOrEqual(result[i].vOrder);
        }

        // (ج) مجموعهٔ (multiset) جفت‌های (vOrder, text) حفظ شده است.
        const inputCounts = multiset(raw);
        const outputCounts = multiset(result);
        expect(outputCounts.size).toBe(inputCounts.size);
        for (const [key, count] of inputCounts) {
          expect(outputCounts.get(key)).toBe(count);
        }

        // (د) پایداری: برای هر vOrder یکسان، ترتیب نسبی textها مانند ورودی است.
        const inputByOrder = new Map<number, string[]>();
        for (const { vOrder, text } of raw) {
          const list = inputByOrder.get(vOrder) ?? [];
          list.push(text);
          inputByOrder.set(vOrder, list);
        }
        const outputByOrder = new Map<number, string[]>();
        for (const { vOrder, text } of result) {
          const list = outputByOrder.get(vOrder) ?? [];
          list.push(text);
          outputByOrder.set(vOrder, list);
        }
        for (const [vOrder, inputTexts] of inputByOrder) {
          expect(outputByOrder.get(vOrder)).toEqual(inputTexts);
        }
      }),
      { numRuns: 100 },
    );
  });
});
