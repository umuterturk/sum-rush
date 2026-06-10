export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 8;
/** Buffer holds up to MAX_WORD_LENGTH letters at once. */
export const MAX_BUFFER_SIZE = MAX_WORD_LENGTH;

export const MATCH_DURATION_MS = 120_000;
export const REMOVE_COOLDOWN_MS = 300;

/** Points awarded per word length. Exponential reward for longer words. */
export const WORD_SCORE: Readonly<Record<number, number>> = {
  3: 1,
  4: 2,
  5: 4,
  6: 7,
  7: 11,
  8: 16,
};

// Per-tile random fall speed (fraction of arena height per ms)
export const FALL_SPEED_MIN = 0.00011;
export const FALL_SPEED_MAX = 0.00020;

// Speed multiplier at match start vs end (tiles fall faster as time passes)
export const FALL_SPEED_RAMP_START = 1.0;
export const FALL_SPEED_RAMP_END = 1.6;

// Wave spawns: how many tiles appear together each wave
export const SPAWN_WAVE_MIN = 2;
export const SPAWN_WAVE_MAX = 4;

// Time between successive spawn waves (÷1.5 vs original for ~1.5× letter density)
export const SPAWN_INTERVAL_MIN = 467;   // ms
export const SPAWN_INTERVAL_VARIANCE = 600; // ms

// Stop spawning this many ms before match ends (tiles still need time to fall)
export const SPAWN_CUTOFF_BEFORE_END_MS = 1_000;

// Tile dimensions as fraction of arena width (for hit-test awareness)
export const TILE_RADIUS_NORM = 0.07;

// Letter queue: random filler letters appended per word (0 = off)
export const STREAM_EXTRA_LETTERS_PER_WORD = 0;

// Letter queue: shuffle letters within each word batch before appending
export const STREAM_SHUFFLE_WORD_LETTERS = false;
