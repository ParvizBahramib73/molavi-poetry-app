/**
 * آزمون property-based برای {@link buildScopedUrl}.
 *
 * Property 1 (محدودسازی هر درخواست به مولوی / Request scoping): برای هر مجموعهٔ
 * پارامتر دلخواه، نشانی ساخته‌شده باید همواره دامنه را به مولوی محدود کند —
 * برای جست‌وجو `poetId=5` و برای مسیرهای مبتنی بر URL پیشوند دامنهٔ `moulavi`.
 *
 * Validates: Requirements 6.4, 5.1
 */

import fc from 'fast-check';

import { MOULAVI_POET_ID, MOULAVI_URL_SLUG } from '../models/domain.constants';
import { buildScopedUrl } from './build-scoped-url';

const NUM_RUNS = 100;

describe('buildScopedUrl — Property 1: محدودسازی هر درخواست به مولوی (Request scoping)', () => {
  // Feature: molavi-poetry-app, Property 1
  it('برای هر درخواست جست‌وجو همواره poetId=5 می‌سازد، حتی اگر poetId دیگری داده شود', () => {
    fc.assert(
      fc.property(
        // poetId دلخواه که عمداً ممکن است غیر از ۵ باشد
        fc.integer(),
        // عبارت جست‌وجوی اختیاری
        fc.option(fc.string(), { nil: undefined }),
        // شمارهٔ صفحه
        fc.nat({ max: 10_000 }),
        // آیا مسیر شامل /search باشد
        fc.boolean(),
        (suppliedPoetId, term, page, useSearchPath) => {
          // تضمین این‌که درخواست واقعاً یک جست‌وجوست (یا term دارد یا مسیر /search)
          const isSearchPath = useSearchPath || term === undefined;
          const path = isSearchPath
            ? '/api/ganjoor/poems/search'
            : '/api/ganjoor/poems';

          const params: Record<string, string | number> = {
            poetId: suppliedPoetId,
            page,
          };
          if (term !== undefined) {
            params['term'] = term;
          }

          const built = buildScopedUrl(path, params);
          const parsed = new URL(built);

          // poetId خروجی همواره باید ۵ باشد، صرف‌نظر از مقدار ورودی
          expect(parsed.searchParams.get('poetId')).toBe(String(MOULAVI_POET_ID));
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  // Feature: molavi-poetry-app, Property 1
  it('برای هر درخواست دارای پارامتر url، مقدار را زیر slug مولوی محدود می‌کند', () => {
    fc.assert(
      fc.property(
        // مقدار url خام و دلخواه
        fc.string(),
        // یک پارامتر همراه دلخواه (مثل شناسهٔ دسته)
        fc.nat({ max: 10_000 }),
        (rawUrl, catId) => {
          const built = buildScopedUrl('/api/ganjoor/poem', {
            url: rawUrl,
            catId,
          });
          const parsed = new URL(built);

          const scoped = parsed.searchParams.get('url');
          expect(scoped).not.toBeNull();

          // مقدار همواره با پیشوند دامنهٔ مولوی شروع می‌شود
          expect(scoped!.startsWith(`/${MOULAVI_URL_SLUG}`)).toBeTrue();

          // اولین بخش معنادار مسیر دقیقاً برابر slug مولوی است
          const firstSegment = scoped!.split('/').filter((s) => s.length > 0)[0];
          expect(firstSegment).toBe(MOULAVI_URL_SLUG);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
