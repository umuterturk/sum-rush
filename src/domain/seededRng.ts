export type RngFn = () => number;

/** djb2-style hash so any string seed produces a stable uint32. */
function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * Mulberry32 PRNG — fast, good statistical quality, fully deterministic.
 * Returns values in [0, 1).
 */
export function createSeededRng(seed: string): RngFn {
  let s = hashString(seed);
  return function (): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
