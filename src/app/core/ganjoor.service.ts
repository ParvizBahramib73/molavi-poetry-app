/**
 * سرویس متمرکز دسترسی به Ganjoor_API برای اپلیکیشن شعر مولوی.
 *
 * این سرویس injectable انگولار، تنها نقطهٔ تماس برنامه با گنجور است و همهٔ
 * مسئولیت‌های زیر را یک‌جا تضمین می‌کند:
 * - ساخت نشانی درخواست با محدودسازی دامنه به مولوی ({@link buildScopedUrl}).
 * - اعمال مهلت ۱۰ ثانیه و نگاشت خطا به {@link GanjoorApiError}
 *   ({@link withGanjoorErrorHandling}).
 * - نگاشت view modelهای خام گنجور به مدل‌های داخلی برنامه.
 * - فیلتر نتایج فهرستی به دامنهٔ مولوی ({@link scopeResults}) و مرتب‌سازی
 *   ابیات بر اساس vOrder ({@link mapVerses}).
 * - حذف خوانش‌های فاقد `mp3Url`.
 *
 * نکتهٔ MVP دربارهٔ ترجمه‌ها: شکل دقیق فیلد ترجمه در پاسخ کامل شعر گنجور در
 * این نسخه به‌صورت تقریبی نگاشت می‌شود (فرض می‌شود آرایه‌ای با نام `translations`
 * یا `poemTranslations` در مدل کامل شعر وجود دارد). اگر این فیلد موجود نباشد،
 * فهرست ترجمه‌ها خالی بازگردانده می‌شود تا UI پیام «ترجمه‌ای موجود نیست» را
 * نمایش دهد (R4.3). این فرض باید در برابر API زنده تأیید شود.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 3.1, 4.1, 5.1, 6.1, 6.4
 */

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  Category,
  CategorySummary,
  Language,
  MOULAVI_POET_ID,
  MOULAVI_URL_SLUG,
  Poem,
  PoemSummary,
  Poet,
  Recitation,
  SearchResultPage,
  Translation,
  TranslationVerse,
} from '../models';
import { buildScopedUrl } from './build-scoped-url';
import { withGanjoorErrorHandling } from './http-operators';
import { mapVerses, RawVerse } from './map-verses';
import { scopeResults } from './scope-results';

/** بیشینهٔ تعداد نتایج جست‌وجوی محدود به مولوی در هر صفحه (R5). */
const SEARCH_PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// شکل کمینهٔ view modelهای خام گنجور (Ganjoor view models)
// تنها فیلدهای مورد نیاز این برنامه تعریف شده‌اند.
// ---------------------------------------------------------------------------

/** خلاصهٔ خامِ یک دسته یا شعر (دارای fullUrl برای محدودسازی دامنه). */
interface RawSummaryViewModel {
  id: number;
  title?: string;
  fullUrl?: string;
  urlSlug?: string;
}

/** view model خام یک دسته (Category). */
interface RawCatViewModel {
  id: number;
  title?: string;
  fullUrl?: string;
  parentId?: number | null;
  children?: RawSummaryViewModel[] | null;
  poems?: RawSummaryViewModel[] | null;
}

/** view model خام شاعر. */
interface RawPoetViewModel {
  id: number;
  name?: string;
  fullUrl?: string;
}

/** پاسخ کامل شاعر/دسته: شامل poet و cat ریشه. */
interface RawPoetCompleteViewModel {
  poet?: RawPoetViewModel;
  cat?: RawCatViewModel;
}

/** پاسخ دستهٔ تکی: ممکن است cat را در ریشه یا داخل یک پوشش ارائه دهد. */
interface RawCatResponseViewModel {
  cat?: RawCatViewModel;
}

/** view model خام خوانش صوتی. */
interface RawRecitationViewModel {
  id?: number;
  audioId?: number;
  audioTitle?: string;
  audioArtist?: string;
  mp3Url?: string | null;
}

/** view model خام یک بیت ترجمه. */
interface RawTranslationVerseViewModel {
  vOrder?: number;
  text?: string;
}

/** view model خام یک ترجمه (شکل تقریبی برای MVP). */
interface RawTranslationViewModel {
  languageId?: number;
  language?: { id?: number; name?: string } | null;
  languageName?: string;
  contributorName?: string | null;
  verses?: RawTranslationVerseViewModel[] | null;
}

/** view model خام شعر مجاور (پیشین/بعدی) در پاسخ کامل شعر. */
interface RawAdjacentViewModel {
  id?: number;
  title?: string;
}

/** view model خام کامل یک شعر. */
interface RawPoemCompleteViewModel {
  id: number;
  title?: string;
  fullTitle?: string;
  fullUrl?: string;
  verses?: RawVerse[] | null;
  recitations?: RawRecitationViewModel[] | null;
  translations?: RawTranslationViewModel[] | null;
  poemTranslations?: RawTranslationViewModel[] | null;
  /** شعر پیشین در همان دسته. */
  previous?: RawAdjacentViewModel | null;
  /** شعر بعدی در همان دسته. */
  next?: RawAdjacentViewModel | null;
}

/**
 * سرویس متمرکز گنجور با محدودسازی دامنه به مولوی، timeout و نگاشت خطا.
 */
@Injectable({ providedIn: 'root' })
export class GanjoorService {
  constructor(private readonly http: HttpClient) {}

  /**
   * دریافت شاعر (مولوی) و دستهٔ ریشهٔ آثار سطح‌بالا.
   *
   * Endpoint: `GET /api/ganjoor/poet/5`
   * Requirements: 1.1, 6.1, 6.4
   */
  getPoet(): Observable<Poet> {
    const url = buildScopedUrl(`/api/ganjoor/poet/${MOULAVI_POET_ID}`);

    return this.http.get<RawPoetCompleteViewModel>(url).pipe(
      map((raw) => this.mapPoet(raw)),
      withGanjoorErrorHandling(),
    );
  }

  /**
   * دریافت یک دسته به‌همراه زیردسته‌ها و شعرهای آن (محدود به مولوی).
   *
   * Endpoint: `GET /api/ganjoor/cat/{catId}?poems=true`
   * Requirements: 1.2, 1.3, 1.4, 6.1
   */
  getCategory(catId: number): Observable<Category> {
    const url = buildScopedUrl(`/api/ganjoor/cat/${catId}`, { poems: 'true' });

    return this.http.get<RawCatResponseViewModel | RawCatViewModel>(url).pipe(
      map((raw) => this.mapCategory(raw)),
      withGanjoorErrorHandling(),
    );
  }

  /**
   * دریافت متن کامل یک شعر شامل ابیات، خوانش‌ها و ترجمه‌ها.
   *
   * Endpoint: `GET /api/ganjoor/poem/{poemId}?...`
   * Requirements: 2.1, 3.1, 4.1, 6.1
   */
  getPoem(poemId: number): Observable<Poem> {
    const url = buildScopedUrl(`/api/ganjoor/poem/${poemId}`, {
      catInfo: 'true',
      catPoems: 'false',
      rhymes: 'false',
      recitations: 'true',
      images: 'false',
      songs: 'false',
      comments: 'false',
      verseDetails: 'true',
      navigation: 'true',
    });

    return this.http.get<RawPoemCompleteViewModel>(url).pipe(
      map((raw) => this.mapPoem(raw)),
      withGanjoorErrorHandling(),
    );
  }

  /**
   * دریافت متن کامل یک شعر بر اساس مسیر URL گنجور (به‌جای شناسهٔ عددی).
   *
   * برای بارگذاری «شعر پیش‌فرض» صفحهٔ خانه (پخش‌کننده) به‌کار می‌رود؛ مثلاً
   * «بشنو از نی» با مسیر `/moulavi/masnavi/daftar1/sh1`. مقدار `url` همواره به
   * دامنهٔ مولوی محدود می‌شود ({@link buildScopedUrl}) و از همان خط نگاشت
   * {@link getPoem} استفاده می‌کند.
   *
   * Endpoint: `GET /api/ganjoor/poem?url={url}`
   * Requirements: 2.1, 3.1, 4.1, 6.1
   */
  getPoemByUrl(url: string): Observable<Poem> {
    const fullUrl = buildScopedUrl('/api/ganjoor/poem', { url });

    return this.http.get<RawPoemCompleteViewModel>(fullUrl).pipe(
      map((raw) => this.mapPoem(raw)),
      withGanjoorErrorHandling(),
    );
  }

  /**
   * دریافت فهرست خوانش‌های صوتی یک شعر (با حذف موارد فاقد mp3Url).
   *
   * Endpoint: `GET /api/ganjoor/poem/{poemId}/recitations`
   * Requirements: 3.1, 6.1
   */
  getRecitations(poemId: number): Observable<Recitation[]> {
    const url = buildScopedUrl(`/api/ganjoor/poem/${poemId}/recitations`);

    return this.http.get<RawRecitationViewModel[]>(url).pipe(
      map((raw) => this.mapRecitations(raw)),
      withGanjoorErrorHandling(),
    );
  }

  /**
   * جست‌وجوی اشعار محدود به مولوی (همواره poetId=5).
   *
   * Endpoint: `GET /api/ganjoor/poems/search?term={term}&poetId=5&PageNumber={page}&PageSize=50`
   * نکتهٔ MVP: بدنهٔ پاسخ به‌صورت آرایه‌ای از خلاصهٔ شعرها فرض می‌شود؛ وجود نتایج
   * بیشتر (hasMore) از پر بودن صفحه (تعداد نتایج برابر PageSize) استنتاج می‌شود.
   *
   * Requirements: 5.1, 1.4, 6.4
   */
  searchPoems(term: string, page: number): Observable<SearchResultPage> {
    // buildScopedUrl وجود پارامتر term را به‌عنوان جست‌وجو تشخیص می‌دهد و
    // به‌صورت قطعی poetId=5 را تنظیم می‌کند (دامنه قابل دور زدن نیست).
    const url = buildScopedUrl('/api/ganjoor/poems/search', {
      term,
      catId: 0,
      PageNumber: page,
      PageSize: SEARCH_PAGE_SIZE,
    });

    return this.http.get<RawSummaryViewModel[]>(url).pipe(
      map((raw) => this.mapSearchResults(raw, term, page)),
      withGanjoorErrorHandling(),
    );
  }

  /**
   * دریافت فهرست زبان‌های ترجمهٔ موجود.
   *
   * Endpoint: `GET /api/translations/languages`
   * Requirements: 4.1, 6.1
   */
  getTranslationLanguages(): Observable<Language[]> {
    const url = buildScopedUrl('/api/translations/languages');

    return this.http
      .get<Array<{ id?: number; name?: string; code?: string }>>(url)
      .pipe(
        map((raw) =>
          (raw ?? []).map((lang) => ({
            id: lang.id ?? 0,
            name: lang.name ?? '',
            code: lang.code ?? '',
          })),
        ),
        withGanjoorErrorHandling(),
      );
  }

  // -------------------------------------------------------------------------
  // نگاشت‌های خصوصی از view model خام به مدل داخلی
  // -------------------------------------------------------------------------

  private mapPoet(raw: RawPoetCompleteViewModel): Poet {
    const cat = raw?.cat;
    return {
      id: raw?.poet?.id ?? MOULAVI_POET_ID,
      name: raw?.poet?.name ?? 'مولوی',
      urlSlug: MOULAVI_URL_SLUG,
      rootCategory: this.mapRawCat(cat),
    };
  }

  private mapCategory(raw: RawCatResponseViewModel | RawCatViewModel): Category {
    // پاسخ ممکن است cat را در ریشه یا داخل پوشش { cat } قرار دهد.
    const cat: RawCatViewModel | undefined =
      (raw as RawCatResponseViewModel)?.cat ?? (raw as RawCatViewModel);
    return this.mapRawCat(cat);
  }

  private mapRawCat(cat: RawCatViewModel | undefined): Category {
    const parentUrl = cat?.fullUrl ?? '';
    const children: CategorySummary[] = scopeResults(
      (cat?.children ?? []).map((child) => this.mapSummary(child, parentUrl)),
    );
    const poems: PoemSummary[] = scopeResults(
      (cat?.poems ?? []).map((poem) => this.mapSummary(poem, parentUrl)),
    );

    return {
      id: cat?.id ?? 0,
      title: cat?.title ?? '',
      fullUrl: parentUrl,
      parentId: cat?.parentId ?? null,
      children,
      poems,
    };
  }

  /**
   * نگاشت خلاصهٔ خام دسته/شعر به مدل داخلی.
   *
   * نکتهٔ مهم: پاسخ گنجور برای خلاصهٔ شعرهای درون یک دسته فیلد `fullUrl` را
   * ندارد (تنها `urlSlug` را دارد). در این حالت `fullUrl` از `fullUrl` دستهٔ
   * والد به‌علاوهٔ `urlSlug` ساخته می‌شود تا محدودسازی دامنه (scopeResults)
   * به‌درستی کار کند و آیتم‌های معتبر مولوی حذف نشوند.
   */
  private mapSummary(
    item: RawSummaryViewModel,
    parentUrl = '',
  ): CategorySummary & PoemSummary {
    let fullUrl = item?.fullUrl ?? '';
    if (!fullUrl && item?.urlSlug && parentUrl) {
      const base = parentUrl.replace(/\/+$/, '');
      const slug = String(item.urlSlug).replace(/^\/+/, '');
      fullUrl = `${base}/${slug}`;
    }
    return {
      id: item?.id ?? 0,
      title: item?.title ?? '',
      fullUrl,
    };
  }

  private mapPoem(raw: RawPoemCompleteViewModel): Poem {
    return {
      id: raw?.id ?? 0,
      title: raw?.title ?? '',
      fullTitle: raw?.fullTitle ?? raw?.title ?? '',
      fullUrl: raw?.fullUrl ?? '',
      verses: mapVerses(raw?.verses ?? []),
      recitations: this.mapRecitations(raw?.recitations ?? []),
      translations: this.mapTranslations(
        raw?.translations ?? raw?.poemTranslations ?? [],
      ),
      prevPoem: this.mapAdjacent(raw?.previous),
      nextPoem: this.mapAdjacent(raw?.next),
    };
  }

  /**
   * نگاشت شعر مجاور (پیشین/بعدی). در صورت نبودِ شناسه یا شناسهٔ نامعتبر
   * (صفر/منفی/غایب) مقدار null بازگردانده می‌شود تا UI سوایپ را غیرفعال کند.
   */
  private mapAdjacent(
    raw: RawAdjacentViewModel | null | undefined,
  ): { id: number; title: string } | null {
    const id = raw?.id ?? 0;
    if (!Number.isFinite(id) || id <= 0) {
      return null;
    }
    return { id, title: raw?.title ?? '' };
  }

  private mapRecitations(
    raw: RawRecitationViewModel[] | null | undefined,
  ): Recitation[] {
    return (raw ?? [])
      // حذف خوانش‌های فاقد mp3Url (R3.1).
      .filter(
        (item): item is RawRecitationViewModel & { mp3Url: string } =>
          typeof item?.mp3Url === 'string' && item.mp3Url.trim().length > 0,
      )
      .map((item) => ({
        id: item.id ?? item.audioId ?? 0,
        audioTitle: item.audioTitle ?? '',
        audioArtist: item.audioArtist ?? '',
        mp3Url: item.mp3Url,
      }));
  }

  private mapTranslations(
    raw: RawTranslationViewModel[] | null | undefined,
  ): Translation[] {
    return (raw ?? []).map((item) => {
      const verses: TranslationVerse[] = (item?.verses ?? []).map((v) => ({
        vOrder: v?.vOrder ?? 0,
        text: v?.text ?? '',
      }));

      return {
        languageId: item?.languageId ?? item?.language?.id ?? 0,
        languageName: item?.languageName ?? item?.language?.name ?? '',
        contributorName: item?.contributorName ?? null,
        verses,
      };
    });
  }

  private mapSearchResults(
    raw: RawSummaryViewModel[] | null | undefined,
    term: string,
    page: number,
  ): SearchResultPage {
    const items = raw ?? [];
    // تضمین مضاعف محدودسازی به مولوی علاوه بر poetId=5.
    const scoped = scopeResults(items.map((item) => this.mapSummary(item)));
    const results: PoemSummary[] = scoped.slice(0, SEARCH_PAGE_SIZE);

    return {
      term,
      results,
      pageNumber: page,
      // اگر صفحهٔ خام پر باشد، احتمال وجود نتایج بیشتر هست.
      hasMore: items.length >= SEARCH_PAGE_SIZE,
    };
  }
}
