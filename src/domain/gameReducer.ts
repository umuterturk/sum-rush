import type { GameAction, GameState, PlayerState, BufferItem } from './types';
import {
  MAX_BUFFER_SIZE,
  REMOVE_COOLDOWN_MS,
  MATCH_DURATION_MS,
  WORD_SCORE,
} from './constants';
import { generateLetterStream } from './letterStream';
import { isValidWord } from './wordSet';

export function createInitialPlayerState(): PlayerState {
  return {
    score: 0,
    buffer: [],
    removeCooldownUntil: 0,
    collectedIds: new Set(),
  };
}

export const INITIAL_GAME_STATE: GameState = {
  matchStatus: 'idle',
  matchStartedAt: 0,
  matchDuration: MATCH_DURATION_MS,
  seed: '',
  stream: [],
  players: {},
};

/**
 * Pure reducer: (state, action) => state.
 *
 * No side effects, no imports from React/DOM/timers.
 * Remote actions from multiplayer adapters can be replayed through this
 * same function to reproduce any past state exactly.
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_MATCH': {
      return {
        matchStatus: 'playing',
        matchStartedAt: action.at,
        matchDuration: MATCH_DURATION_MS,
        seed: action.seed,
        stream: generateLetterStream(action.seed),
        players: {
          local: createInitialPlayerState(),
        },
      };
    }

    case 'END_MATCH': {
      if (state.matchStatus !== 'playing') return state;
      return { ...state, matchStatus: 'ended' };
    }

    case 'RESET': {
      return INITIAL_GAME_STATE;
    }

    case 'COLLECT_LETTER': {
      const player = state.players[action.playerId];
      if (!player) return state;

      const entry = state.stream.find(e => e.id === action.letterId);
      if (!entry) return state;

      const logicalTime = action.at - state.matchStartedAt;
      const fallDuration = 1 / entry.fallSpeed;
      const isActive =
        entry.spawnTime <= logicalTime &&
        logicalTime < entry.spawnTime + fallDuration &&
        !player.collectedIds.has(action.letterId);

      if (!isActive) return state;

      // Sliding window: when the buffer is full, evict the oldest letter first
      const baseBuffer =
        player.buffer.length >= MAX_BUFFER_SIZE
          ? player.buffer.slice(1)
          : player.buffer;

      const newBuffer: BufferItem[] = [
        ...baseBuffer,
        { letterId: action.letterId, letter: entry.letter },
      ];
      const newCollectedIds = new Set(player.collectedIds);
      newCollectedIds.add(action.letterId);

      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            buffer: newBuffer,
            collectedIds: newCollectedIds,
          },
        },
      };
    }

    case 'REMOVE_BUFFER_ITEM': {
      const player = state.players[action.playerId];
      if (!player) return state;

      const logicalTime = action.at - state.matchStartedAt;
      if (logicalTime < player.removeCooldownUntil) return state;

      if (action.bufferIndex < 0 || action.bufferIndex >= player.buffer.length) return state;

      const newBuffer = player.buffer.filter((_, i) => i !== action.bufferIndex);

      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            buffer: newBuffer,
            removeCooldownUntil: logicalTime + REMOVE_COOLDOWN_MS,
          },
        },
      };
    }

    case 'REPLACE_BUFFER_ITEM': {
      const player = state.players[action.playerId];
      if (!player) return state;

      const entry = state.stream.find(e => e.id === action.letterId);
      if (!entry) return state;

      const logicalTime = action.at - state.matchStartedAt;
      const fallDuration = 1 / entry.fallSpeed;
      const isActive =
        entry.spawnTime <= logicalTime &&
        logicalTime < entry.spawnTime + fallDuration &&
        !player.collectedIds.has(action.letterId);

      if (!isActive) return state;
      if (action.bufferIndex < 0 || action.bufferIndex >= player.buffer.length) return state;

      const newBuffer = player.buffer.map((item, i) =>
        i === action.bufferIndex
          ? { letterId: action.letterId, letter: entry.letter }
          : item,
      );
      const newCollectedIds = new Set(player.collectedIds);
      newCollectedIds.add(action.letterId);

      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            buffer: newBuffer,
            collectedIds: newCollectedIds,
          },
        },
      };
    }

    case 'SUBMIT_WORD': {
      const player = state.players[action.playerId];
      if (!player) return state;

      const word = player.buffer.map(b => b.letter).join('');
      if (!isValidWord(word)) return state;

      const points = WORD_SCORE[word.length] ?? 1;

      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...player,
            score: player.score + points,
            buffer: [],
          },
        },
      };
    }

    default:
      return state;
  }
}
