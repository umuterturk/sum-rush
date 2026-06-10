export type MatchStatus = 'idle' | 'playing' | 'ended';

/** One pre-generated entry in the match's letter stream. */
export interface LetterStreamEntry {
  id: string;
  /** Single Turkish character */
  letter: string;
  /** Milliseconds from match start when the tile spawns */
  spawnTime: number;
  /** Normalized 0..1 horizontal position (fraction of arena width) */
  xPosition: number;
  /** Fraction of arena height per millisecond */
  fallSpeed: number;
}

/** A tile that is currently visible in the arena (derived from stream + time). */
export interface FallingLetter extends LetterStreamEntry {
  /** Normalized 0..1 vertical position (0 = top, 1 = bottom) */
  yPosition: number;
}

export interface BufferItem {
  letterId: string;
  letter: string;
}

export interface PlayerState {
  score: number;
  buffer: BufferItem[];
  /** Logical time (ms) before which REMOVE_BUFFER_ITEM is rejected */
  removeCooldownUntil: number;
  /** IDs already taken from the stream (cannot be collected again) */
  collectedIds: Set<string>;
}

export interface GameState {
  matchStatus: MatchStatus;
  /** Wall-clock ms when START_MATCH was processed */
  matchStartedAt: number;
  matchDuration: number;
  seed: string;
  stream: LetterStreamEntry[];
  /** Keyed by playerId */
  players: Record<string, PlayerState>;
}

export type GameAction =
  | { type: 'START_MATCH'; seed: string; at: number }
  | { type: 'END_MATCH'; at: number }
  | { type: 'RESET' }
  | { type: 'COLLECT_LETTER'; playerId: string; letterId: string; at: number }
  | { type: 'REMOVE_BUFFER_ITEM'; playerId: string; bufferIndex: number; at: number }
  | { type: 'REPLACE_BUFFER_ITEM'; playerId: string; bufferIndex: number; letterId: string; at: number }
  | { type: 'SUBMIT_WORD'; playerId: string; at: number };
