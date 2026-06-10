import type { LetterStreamEntry } from './types';
import { createSeededRng } from './seededRng';
import { LETTER_FREQUENCIES, WORD_LIST } from './wordSet';
import {
  MATCH_DURATION_MS,
  FALL_SPEED_MIN,
  FALL_SPEED_MAX,
  FALL_SPEED_RAMP_START,
  FALL_SPEED_RAMP_END,
  SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_VARIANCE,
  SPAWN_CUTOFF_BEFORE_END_MS,
  STREAM_EXTRA_LETTERS_PER_WORD,
  STREAM_SHUFFLE_WORD_LETTERS,
} from './constants';

// Build a cumulative-weight lookup table from letter frequencies.
// Letters are sorted deterministically (by letter) so the table is stable.
const _sortedEntries = Object.entries(LETTER_FREQUENCIES).sort((a, b) =>
  a[0].localeCompare(b[0]),
);
let _cum = 0;
const WEIGHTED_THRESHOLDS: { letter: string; cumulative: number }[] =
  _sortedEntries.map(([letter, weight]) => {
    _cum += weight;
    return { letter, cumulative: _cum };
  });

/**
 * Seven evenly-distributed horizontal lanes.
 * Fixed lanes prevent horizontal overlap and keep the arena readable.
 */
const LANES: readonly number[] = [0.08, 0.21, 0.34, 0.50, 0.66, 0.79, 0.92];

const SPAWN_CUTOFF_MS = MATCH_DURATION_MS - SPAWN_CUTOFF_BEFORE_END_MS;

/** Pick a single random letter using frequency-weighted probabilities. */
function randomLetter(rng: () => number): string {
  const r = rng();
  for (const { letter, cumulative } of WEIGHTED_THRESHOLDS) {
    if (r < cumulative) return letter;
  }
  return WEIGHTED_THRESHOLDS[WEIGHTED_THRESHOLDS.length - 1].letter;
}

/**
 * Builds a letter queue by repeatedly:
 *   1. Picking a random word from the word list
 *   2. Optionally adding random filler letters (STREAM_EXTRA_LETTERS_PER_WORD)
 *   3. Optionally shuffling the batch (STREAM_SHUFFLE_WORD_LETTERS)
 *   4. Appending to the queue
 *
 * This ensures real words are "hidden" within the stream (possibly spanning
 * consecutive waves), while filler letters add noise and challenge.
 */
function buildLetterQueue(rng: () => number, minLength: number): string[] {
  const queue: string[] = [];
  while (queue.length < minLength) {
    const word = WORD_LIST[Math.floor(rng() * WORD_LIST.length)];
    const batch: string[] = Array.from(word);
    for (let i = 0; i < STREAM_EXTRA_LETTERS_PER_WORD; i++) {
      batch.push(randomLetter(rng));
    }
    if (STREAM_SHUFFLE_WORD_LETTERS) {
      for (let i = batch.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [batch[i], batch[j]] = [batch[j], batch[i]];
      }
    }
    queue.push(...batch);
  }
  return queue;
}

/**
 * Speed multiplier that ramps from start to end as match time progresses.
 * Uses a parabolic (ease-in) curve: slow acceleration early, faster later.
 */
function fallSpeedRamp(spawnTime: number): number {
  const progress = Math.min(1, spawnTime / SPAWN_CUTOFF_MS);
  const eased = progress * progress;
  return (
    FALL_SPEED_RAMP_START +
    eased * (FALL_SPEED_RAMP_END - FALL_SPEED_RAMP_START)
  );
}

/** Random per-tile speed scaled by the time-based ramp. */
function randomFallSpeed(rng: () => number, spawnTime: number): number {
  const base = FALL_SPEED_MIN + rng() * (FALL_SPEED_MAX - FALL_SPEED_MIN);
  return base * fallSpeedRamp(spawnTime);
}

/**
 * Wave size increases as match progresses.
 * Early (0–33%): 2–3 tiles per wave
 * Mid  (33–66%): 4–5 tiles per wave
 * Late (66–100%): 6–7 tiles per wave
 */
function getWaveSize(rng: () => number, spawnTime: number): number {
  const progress = Math.min(1, spawnTime / SPAWN_CUTOFF_MS);
  let min: number, max: number;
  if (progress < 0.33) {
    min = 2; max = 3;
  } else if (progress < 0.66) {
    min = 4; max = 5;
  } else {
    min = 6; max = 7;
  }
  return min + Math.floor(rng() * (max - min + 1));
}

/** Pick distinct lane indices for a wave (no two tiles in the same lane). */
function pickLaneIndices(rng: () => number, count: number): number[] {
  const available = LANES.map((_, i) => i);
  const picked: number[] = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(rng() * available.length);
    picked.push(available[idx]);
    available.splice(idx, 1);
  }
  return picked;
}

/**
 * Generates the complete letter stream for a match before play begins.
 * Same seed always produces an identical stream (deterministic replay).
 *
 * Letter distribution mirrors real Turkish word frequency so common
 * letters (a, e, k, l…) appear more often as falling tiles.
 */
export function generateLetterStream(seed: string): LetterStreamEntry[] {
  const rng = createSeededRng(seed);

  // Pre-build the letter queue (1500 chars is well above any 2-min match total).
  // Each batch = one word (+ optional fillers / shuffle per constants).
  const letterQueue = buildLetterQueue(rng, 1500);
  let queueIdx = 0;

  const entries: LetterStreamEntry[] = [];

  // First wave spawns 600 ms in so the player has time to orient.
  let time = 600;
  let idx = 0;

  while (time < SPAWN_CUTOFF_MS) {
    const waveSize = getWaveSize(rng, time);
    const lanes = pickLaneIndices(rng, waveSize);
    const spawnTime = Math.round(time);

    for (const laneIdx of lanes) {
      entries.push({
        id: `l${idx}`,
        letter: letterQueue[queueIdx++ % letterQueue.length],
        spawnTime,
        xPosition: LANES[laneIdx],
        fallSpeed: randomFallSpeed(rng, spawnTime),
      });
      idx++;
    }

    time += SPAWN_INTERVAL_MIN + rng() * SPAWN_INTERVAL_VARIANCE;
  }

  return entries.sort((a, b) =>
    a.spawnTime !== b.spawnTime ? a.spawnTime - b.spawnTime : a.id.localeCompare(b.id),
  );
}
