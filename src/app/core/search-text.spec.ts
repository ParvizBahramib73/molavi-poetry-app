import { Verse } from '../models';
import { findVersePreview, highlightMatch, normalizePersianText } from './search-text';

const verse = (text: string, vOrder: number): Verse => ({
  text,
  vOrder,
  position: 'RIGHT',
});

describe('Persian verse search helpers', () => {
  it('normalises Arabic yeh/kaf, vowel marks, tatweel and ZWNJ', () => {
    expect(normalizePersianText('كِتابِ عاشِقـان و مي‌رود')).toBe(
      'کتاب عاشقان و می رود',
    );
  });

  it('finds a remembered phrase in the middle of a poem, not only its first verse', () => {
    const verses = [
      verse('اولین مصرع شعر', 1),
      verse('مصرع دوم شعر', 2),
      verse('از محبت تلخ ها شیرین شود', 3),
      verse('از محبت مس ها زرین شود', 4),
    ];
    const result = findVersePreview(verses, 'محبت تلخ ها');
    expect(result?.kind).toBe('exact');
    expect(result?.text).toContain('از محبت تلخ');
    expect(result?.text).toContain('زرین شود');
    expect(result?.segments.some((part) => part.highlighted)).toBeTrue();
  });

  it('matches a phrase remembered across adjacent hemistiches', () => {
    const result = findVersePreview([
      verse('بشنو از', 1),
      verse('نی چون حکایت می‌کند', 2),
    ], 'بشنو از نی');
    expect(result?.kind).toBe('exact');
  });

  it('highlights Arabic spelling variations but keeps the original exact characters', () => {
    const segments = highlightMatch('ای كـتابِ عشق و راز', 'کتاب عشق');
    expect(segments.some((part) => part.highlighted)).toBeTrue();
    expect(segments.map((part) => part.text).join('')).toBe('ای كـتابِ عشق و راز');
  });

  it('highlights remembered words without claiming an exact phrase match', () => {
    const result = findVersePreview([
      verse('از محبت تلخ‌ها شیرین شود', 1),
      verse('از محبت مس‌ها زرین شود', 2),
    ], 'محبت این شیرین');
    expect(result?.kind).toBe('sample');
    expect(result?.segments.filter((part) => part.highlighted).length).toBeGreaterThan(0);
  });

  it('returns null safely for poems with empty verses', () => {
    expect(findVersePreview([], 'عشق')).toBeNull();
  });

  it('does not put API text into HTML; segments remain plain text', () => {
    const raw = '<img src=x onerror=alert(1)> عشق';
    const segments = highlightMatch(raw, 'عشق');
    expect(segments.map((part) => part.text).join('')).toBe(raw);
  });
});
