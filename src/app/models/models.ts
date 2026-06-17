/**
 * مدل‌های داخلی دادهٔ اپلیکیشن شعر مولوی.
 *
 * این اینترفیس‌ها نمایندهٔ شکل دادهٔ نگاشت‌شده از view modelهای Ganjoor_API
 * هستند و در سراسر لایه‌های سرویس و UI استفاده می‌شوند.
 *
 * Requirements: 6.1, 6.4
 */

/** جایگاه یک بیت در نمایش (راست/چپ/وسط/توضیح ...). */
export type VersePosition = 'RIGHT' | 'LEFT' | 'CENTERED' | 'COMMENT';

/** شاعر (همیشه مولوی) به‌همراه دستهٔ ریشه. */
export interface Poet {
  /** همیشه برابر ۵ (شناسهٔ مولوی). */
  id: number;
  /** نام شاعر، «مولوی». */
  name: string;
  /** شناسهٔ URL، "moulavi". */
  urlSlug: string;
  /** دستهٔ ریشهٔ آثار مولوی. */
  rootCategory: Category;
}

/** یک دسته (Work/دفتر) شامل زیردسته‌ها و شعرها. */
export interface Category {
  id: number;
  title: string;
  /** مسیر کامل گنجور، مثل /moulavi/masnavi/daftar2. */
  fullUrl: string;
  parentId: number | null;
  /** زیردسته‌ها (Workها/دفترها). */
  children: CategorySummary[];
  poems: PoemSummary[];
}

/** خلاصهٔ یک دسته برای فهرست‌ها. */
export interface CategorySummary {
  id: number;
  title: string;
  fullUrl: string;
}

/** خلاصهٔ یک شعر برای فهرست‌ها و نتایج جست‌وجو. */
export interface PoemSummary {
  id: number;
  title: string;
  fullUrl: string;
}

/** خلاصهٔ شعر مجاور (پیشین/بعدی) در همان دسته، برای ناوبری استوری‌وار. */
export interface PoemAdjacent {
  id: number;
  title: string;
}

/** متن کامل یک شعر به‌همراه خوانش‌ها و ترجمه‌ها. */
export interface Poem {
  id: number;
  title: string;
  /** مسیر سلسله‌مراتبی کامل (Work/Category/Poem). */
  fullTitle: string;
  /** مسیر کامل گنجور، مثل /moulavi/masnavi/daftar2/sh8. */
  fullUrl: string;
  /** ابیات مرتب‌شده بر اساس vOrder صعودی. */
  verses: Verse[];
  recitations: Recitation[];
  translations: Translation[];
  /** شعر پیشین در همان دسته (برای سوایپ استوری‌وار)، یا null اگر نباشد. */
  prevPoem?: PoemAdjacent | null;
  /** شعر بعدی در همان دسته (برای سوایپ استوری‌وار)، یا null اگر نباشد. */
  nextPoem?: PoemAdjacent | null;
}

/** یک بیت از شعر. */
export interface Verse {
  /** کلید ترتیب نمایش (صعودی). */
  vOrder: number;
  text: string;
  position: VersePosition;
}

/** یک خوانش صوتی از شعر. */
export interface Recitation {
  id: number;
  audioTitle: string;
  audioArtist: string;
  mp3Url: string;
}

/** یک ترجمهٔ شعر به یک زبان. */
export interface Translation {
  languageId: number;
  /** نام زبان، مثلاً «انگلیسی». */
  languageName: string;
  contributorName: string | null;
  verses: TranslationVerse[];
}

/** یک بیت ترجمه‌شده. */
export interface TranslationVerse {
  vOrder: number;
  text: string;
}

/** یک زبان ترجمه. */
export interface Language {
  id: number;
  name: string;
  code: string;
}

/**
 * یک ردیف از داده‌ی همگام‌سازیِ دقیقِ گنجور برای یک خوانش.
 * `verseOrder` با `vOrder` ابیات هم‌تراز است (و `verseOrder = 0` عنوان شعر است).
 */
export interface VerseSync {
  verseOrder: number;
  /** زمان شروع این بیت در فایل صوتی، برحسب میلی‌ثانیه. */
  audioStartMs: number;
}

/** یک صفحه از نتایج جست‌وجو (همگی در دامنهٔ مولوی). */
export interface SearchResultPage {
  term: string;
  results: PoemSummary[];
  pageNumber: number;
  hasMore: boolean;
}
