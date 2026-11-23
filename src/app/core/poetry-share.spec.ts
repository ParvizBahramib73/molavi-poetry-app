import { wrapTextByMeasure } from './poetry-share';

describe('wrapTextByMeasure', () => {
  const measure = (value: string): number => value.length * 10;

  it('keeps a short verse on one line', () => {
    expect(wrapTextByMeasure('ای عاشقان ای عاشقان', 240, measure)).toEqual([
      'ای عاشقان ای عاشقان',
    ]);
  });

  it('wraps words without losing or reordering them', () => {
    const text = 'از محبت تلخ‌ها شیرین شود';
    const lines = wrapTextByMeasure(text, 120, measure);

    expect(lines.join(' ')).toBe(text);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => measure(line) <= 120)).toBeTrue();
  });

  it('splits a single long token to fit the available width', () => {
    expect(wrapTextByMeasure('abcdefgh', 30, measure)).toEqual([
      'abc',
      'def',
      'gh',
    ]);
  });

  it('returns an empty array for blank text', () => {
    expect(wrapTextByMeasure('   ', 100, measure)).toEqual([]);
  });
});
