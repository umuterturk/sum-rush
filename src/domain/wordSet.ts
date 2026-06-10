import wordListData from './wordList.json';

const wordArray = wordListData as string[];

/** Full filtered word list, used for stream generation. */
export const WORD_LIST: readonly string[] = wordArray;

/** O(1) lookup set of valid Turkish words (3–8 chars, lowercase). */
const WORD_SET = new Set<string>(wordArray);

/** Normalized letter frequencies derived from the word list (sum ≈ 1). */
export const LETTER_FREQUENCIES: Readonly<Record<string, number>> = (() => {
  const counts: Record<string, number> = {};
  for (const word of wordArray) {
    for (const ch of word) {
      counts[ch] = (counts[ch] ?? 0) + 1;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const freq: Record<string, number> = {};
  for (const [ch, n] of Object.entries(counts)) {
    freq[ch] = n / total;
  }
  return freq;
})();

function turkishLower(str: string): string {
  return str.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

/**
 * Returns true if the given string is a valid Turkish word (3–8 chars).
 * Normalises to lowercase with Turkish rules before the Set lookup.
 */
export function isValidWord(word: string): boolean {
  const chars = Array.from(word);
  if (chars.length < 3 || chars.length > 8) return false;
  return WORD_SET.has(turkishLower(word));
}
