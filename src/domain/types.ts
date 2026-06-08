export type MatchStatus = 'idle' | 'playing' | 'ended';

/** One pre-generated entry in the match's number stream. */
export interface NumberStreamEntry {
  id: string;
  /** Integer 1–15 */
  value: number;
  /** Milliseconds from match start when the tile spawns */
  spawnTime: number;
  /** Normalized 0..1 horizontal position (fraction of arena width) */
  xPosition: number;
  /** Fraction of arena height per millisecond */
  fallSpeed: number;
}

/** A tile that is currently visible in the arena (derived from stream + time). */
export interface FallingNumber extends NumberStreamEntry {
  /** Normalized 0..1 vertical position (0 = top, 1 = bottom) */
  yPosition: number;
}

export interface StackItem {
  numberId: string;
  value: number;
}

export interface PlayerState {
  score: number;
  stack: StackItem[];
  /** Logical time (ms) before which REMOVE_STACK_ITEM is rejected */
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
  stream: NumberStreamEntry[];
  /** Keyed by playerId; supports future multi-player by design */
  players: Record<string, PlayerState>;
}

export type GameAction =
  | { type: 'START_MATCH'; seed: string; at: number }
  | { type: 'END_MATCH'; at: number }
  | { type: 'COLLECT_NUMBER'; playerId: string; numberId: string; at: number }
  | { type: 'REMOVE_STACK_ITEM'; playerId: string; stackIndex: number; at: number };
