import { Verse } from '../models';

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

export interface VersePreview {
  text: string;
  segments: HighlightSegment[];
  kind: 'exact' | 'words' | 'sample';
  verseOrder: number;
}

/**
 * Normalises common Persian/Arabic spelling differences and vocalisation marks.
 * The mapped indexes let us highlight the ORIGINAL, unmodified poem text safely.
 */
function withIndexMap(value: string): { normalized: string; positions: number[] } {
  const chars: string[] = [];
  const positions: number[] = [];
  const source = value ?? '';

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/u.test(char)) {
      continue;
    }

    let normalized = char
      .replace(/[يى]/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/[أإٱ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .toLowerCase();

    if (/[\u200c\u200d\s،؛؟!.,:«»"'()[\]{}\-–—]/u.test(normalized)) {
      normalized = ' ';
    }

    if (normalized === ' ') {
      if (chars.length === 0 || chars[chars.length - 1] === ' ') {
        continue;
      }
    }

    for (const character of normalized) {
      chars.push(character);
      positions.push(index);
    }
  }

  if (chars[chars.length - 1] === ' ') {
    chars.pop();
    positions.pop();
  }

  return { normalized: chars.join(''), positions };
}

export function normalizePersianText(value: string): string {
  return withIndexMap(value).normalized;
}

export function highlightMatch(text: string, term: string): HighlightSegment[] {
  const raw = text ?? '';
  const query = normalizePersianText(term);
  if (!query || !raw) {
    return [{ text: raw, highlighted: false }];
  }

  const { normalized, positions } = withIndexMap(raw);
  const exactStart = normalized.indexOf(query);
  if (exactStart !== -1) {
    const from = positions[exactStart];
    const to = positions[exactStart + query.length - 1] + 1;
    return [
      { text: raw.slice(0, from), highlighted: false },
      { text: raw.slice(from, to), highlighted: true },
      { text: raw.slice(to), highlighted: false },
    ].filter((item) => item.text.length > 0);
  }

  // For a remembered fragment with missing words, gently highlight individual
  // words without claiming the complete phrase was found.
  const words = Array.from(new Set(query.split(' ').filter((word) => word.length >= 2)));
  const matches: Array<{ from: number; to: number }> = [];
  for (const word of words) {
    let startAt = 0;
    while (startAt < normalized.length) {
      const found = normalized.indexOf(word, startAt);
      if (found < 0) break;
      matches.push({
        from: positions[found],
        to: positions[found + word.length - 1] + 1,
      });
      startAt = found + word.length;
    }
  }
  matches.sort((a, b) => a.from - b.from || b.to - a.to);

  const output: HighlightSegment[] = [];
  let position = 0;
  for (const match of matches) {
    if (match.from < position) continue;
    if (match.from > position) {
      output.push({ text: raw.slice(position, match.from), highlighted: false });
    }
    output.push({ text: raw.slice(match.from, match.to), highlighted: true });
    position = match.to;
  }
  if (position < raw.length) {
    output.push({ text: raw.slice(position), highlighted: false });
  }
  return output.length ? output : [{ text: raw, highlighted: false }];
}

/** Find the most useful two-hemistich excerpt, even when the phrase is mid-poem. */
export function findVersePreview(verses: readonly Verse[], query: string): VersePreview | null {
  const valid = verses.filter((verse) => typeof verse?.text === 'string' && verse.text.trim());
  if (!valid.length) return null;

  const normalizedQuery = normalizePersianText(query);
  const words = normalizedQuery.split(' ').filter((word) => word.length >= 2);
  let best = { score: -1, index: 0, kind: 'sample' as VersePreview['kind'] };

  for (let i = 0; i < valid.length; i += 1) {
    const pair = [valid[i].text, valid[i + 1]?.text].filter(Boolean).join('  ·  ');
    const text = normalizePersianText(pair);
    const exact = !!normalizedQuery && text.includes(normalizedQuery);
    const foundWords = words.filter((word) => text.includes(word)).length;
    const hasAllWords = words.length > 1 && foundWords === words.length;
    const score = exact ? 1000 - i : hasAllWords ? 500 - i : foundWords * 25 - i;

    if (score > best.score) {
      best = {
        score,
        index: i,
        kind: exact ? 'exact' : hasAllWords ? 'words' : 'sample',
      };
    }
  }

  const snippet = [valid[best.index].text, valid[best.index + 1]?.text]
    .filter(Boolean)
    .join('  ·  ')
    .slice(0, 280);

  return {
    text: snippet,
    segments: highlightMatch(snippet, query),
    kind: best.kind,
    verseOrder: valid[best.index].vOrder,
  };
}
