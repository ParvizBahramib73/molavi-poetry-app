/**
 * آزمون property-based برای تابع محض `scopeResults`.
 *
 * Property 2 از سند طراحی: «محدود بودن همهٔ نتایج به مولوی» (Result scoping).
 * با تولید فهرست‌های تصادفی شامل آیتم‌های داخل و خارج دامنه، بررسی می‌کنیم که
 * خروجی تنها شامل آیتم‌های مولوی باشد، هیچ آیتم خارج از دامنه نشت نکند، و ترتیب
 * نسبی آیتم‌های باقی‌مانده حفظ شود.
 *
 * Validates: Requirements 1.4, 5.1
 */

import fc from 'fast-check';
import { MOULAVI_URL_SLUG } from '../models';
import { belongsToMoulavi, scopeResults, type ScopableItem } from './scope-results';

/** آیتمی که علاوه بر fullUrl، شناسه‌ای برای ردیابی هویت/ترتیب دارد. */
interface TaggedItem extends ScopableItem {
  id: number;
}

/** نشانی‌های داخل دامنهٔ مولوی (که باید بمانند). */
const inDomainUrl: fc.Arbitrary<string> = fc.oneof(
  fc.constant(`/${MOULAVI_URL_SLUG}`),
  fc.constant(`/${MOULAVI_URL_SLUG}/`),
  fc.constant(`${MOULAVI_URL_SLUG}/masnavi/daftar2/sh8`),
  fc
    .array(fc.constantFrom('masnavi', 'divan', 'ghazal', 'daftar2', 'sh8', 'robaiyat'), {
      minLength: 0,
      maxLength: 4,
    })
    .map((segments) => `/${MOULAVI_URL_SLUG}/${segments.join('/')}`),
);

/** نشانی‌های خارج دامنه (که باید حذف شوند) — شامل شاعران دیگر و slugهای فریبنده. */
const outOfDomainUrl: fc.Arbitrary<string> = fc.oneof(
  fc.constantFrom(
    '/hafez/ghazal/sh1',
    '/saadi/golestan/bab1',
    '/moulavi-x/masnavi', // پیشوند مشابه ولی نه دقیقاً moulavi
    '/xmoulavi/divan',
    '/ferdousi/shahname',
    '/', // فقط اسلش
    '', // رشتهٔ خالی
    '   ', // فقط فضای خالی
  ),
  fc
    .array(fc.constantFrom('hafez', 'saadi', 'nezami', 'attar', 'sh1', 'bab2'), {
      minLength: 1,
      maxLength: 4,
    })
    .map((segments) => `/${segments.join('/')}`),
);

describe('scopeResults (Property 2: Result scoping)', () => {
  // Feature: molavi-poetry-app, Property 2
  it('returns only moulavi items, leaks no out-of-domain items, and preserves relative order', () => {
    const taggedArb = (
      urlArb: fc.Arbitrary<string>,
      inDomain: boolean,
    ): fc.Arbitrary<{ inDomain: boolean; url: string }> =>
      urlArb.map((url) => ({ inDomain, url }));

    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(taggedArb(inDomainUrl, true), taggedArb(outOfDomainUrl, false)),
          { minLength: 0, maxLength: 50 },
        ),
        (specs) => {
          // ساخت آیتم‌ها با شناسهٔ یکتا برای بررسی حفظ ترتیب و هویت.
          const items: TaggedItem[] = specs.map((spec, index) => ({
            id: index,
            fullUrl: spec.url,
          }));

          const original = items.slice();
          const result = scopeResults(items);

          // 1) هر آیتم بازگشتی واقعاً به مولوی تعلق دارد.
          for (const item of result) {
            expect(belongsToMoulavi(item.fullUrl)).toBeTrue();
          }

          // 2) هیچ آیتم خارج از دامنه‌ای در خروجی نشت نکرده است.
          const leaked = result.filter((item) => !belongsToMoulavi(item.fullUrl));
          expect(leaked.length).toBe(0);

          // 3) تعداد خروجی دقیقاً برابر تعداد آیتم‌های داخل دامنه در ورودی است.
          const expectedInDomain = items.filter((item) => belongsToMoulavi(item.fullUrl));
          expect(result.length).toBe(expectedInDomain.length);

          // 4) ترتیب نسبی آیتم‌های باقی‌مانده حفظ شده است (مقایسهٔ دنبالهٔ شناسه‌ها).
          const resultIds = result.map((item) => item.id);
          const filteredIds = expectedInDomain.map((item) => item.id);
          expect(resultIds).toEqual(filteredIds);

          // 5) آرایهٔ ورودی تغییر نکرده است (تابع محض است).
          expect(items).toEqual(original);
        },
      ),
      { numRuns: 100 },
    );
  });
});
