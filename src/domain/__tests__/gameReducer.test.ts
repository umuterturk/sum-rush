import { describe, it, expect } from 'vitest';
import {
  gameReducer,
  INITIAL_GAME_STATE,
  createInitialPlayerState,
} from '../gameReducer';
import type { GameState } from '../types';
import { MAX_BUFFER_SIZE, REMOVE_COOLDOWN_MS, WORD_SCORE } from '../constants';

const SEED = 'test-seed-deterministic';
const WALL_START = 1_000_000;

/** Helper: start a fresh match */
function startedState(): GameState {
  return gameReducer(INITIAL_GAME_STATE, {
    type: 'START_MATCH',
    seed: SEED,
    at: WALL_START,
  });
}

/** Wall-clock time that puts logical time 500ms past the given stream entry's spawn */
function activeAt(state: GameState, entryIdx: number): number {
  return WALL_START + state.stream[entryIdx].spawnTime + 500;
}

// ── START_MATCH ─────────────────────────────────────────────────────────────

describe('START_MATCH', () => {
  it('sets status to playing', () => {
    expect(startedState().matchStatus).toBe('playing');
  });

  it('generates a non-empty stream', () => {
    expect(startedState().stream.length).toBeGreaterThan(0);
  });

  it('creates the local player', () => {
    const { players } = startedState();
    expect(players['local']).toBeDefined();
    expect(players['local'].score).toBe(0);
    expect(players['local'].buffer).toHaveLength(0);
  });

  it('restarting produces the same stream for the same seed', () => {
    const a = startedState();
    const b = startedState();
    expect(a.stream).toEqual(b.stream);
  });
});

// ── COLLECT_LETTER ──────────────────────────────────────────────────────────

describe('COLLECT_LETTER', () => {
  it('accepts an active tile and adds it to the buffer', () => {
    const state = startedState();
    const next = gameReducer(state, {
      type: 'COLLECT_LETTER',
      playerId: 'local',
      letterId: state.stream[0].id,
      at: activeAt(state, 0),
    });
    expect(next.players['local'].buffer.length).toBe(1);
    expect(next.players['local'].buffer[0].letter).toBe(state.stream[0].letter);
  });

  it('rejects a tile that has not yet spawned (logical time < spawnTime)', () => {
    const state = startedState();
    const next = gameReducer(state, {
      type: 'COLLECT_LETTER',
      playerId: 'local',
      letterId: state.stream[0].id,
      at: WALL_START,
    });
    expect(next.players['local'].buffer.length).toBe(0);
  });

  it('rejects a tile that has already left the arena (expired)', () => {
    const state = startedState();
    const entry = state.stream[0];
    const fallDuration = 1 / entry.fallSpeed;
    const at = WALL_START + entry.spawnTime + fallDuration + 1000;
    const next = gameReducer(state, {
      type: 'COLLECT_LETTER',
      playerId: 'local',
      letterId: entry.id,
      at,
    });
    expect(next.players['local'].buffer.length).toBe(0);
  });

  it('does not allow collecting the same tile twice', () => {
    const state = startedState();
    const at = activeAt(state, 0);
    const action = {
      type: 'COLLECT_LETTER' as const,
      playerId: 'local',
      letterId: state.stream[0].id,
      at,
    };
    const after1 = gameReducer(state, action);
    const after2 = gameReducer(after1, action);
    expect(after2.players['local'].buffer.length).toBe(after1.players['local'].buffer.length);
  });

  it('slides the window (evicts oldest) when the buffer is already at MAX_BUFFER_SIZE', () => {
    const base = startedState();
    const fullBuffer = Array.from({ length: MAX_BUFFER_SIZE }, (_, i) => ({
      letterId: `fake-${i}`,
      letter: 'a',
    }));
    const fullState: GameState = {
      ...base,
      players: {
        local: {
          ...createInitialPlayerState(),
          buffer: fullBuffer,
          collectedIds: new Set(fullBuffer.map(b => b.letterId)),
        },
      },
    };
    const at = activeAt(base, 0);
    const next = gameReducer(fullState, {
      type: 'COLLECT_LETTER',
      playerId: 'local',
      letterId: base.stream[0].id,
      at,
    });
    const resultBuffer = next.players['local'].buffer;
    expect(resultBuffer.length).toBe(MAX_BUFFER_SIZE);
    // oldest (fake-0) evicted
    expect(resultBuffer[0].letterId).toBe('fake-1');
    // new tile at the end
    expect(resultBuffer[MAX_BUFFER_SIZE - 1].letterId).toBe(base.stream[0].id);
  });
});

// ── SUBMIT_WORD ──────────────────────────────────────────────────────────────

describe('SUBMIT_WORD', () => {
  it('scores correct points and clears buffer for a valid word', () => {
    const base = startedState();
    // Seed the buffer with a known valid Turkish word "kale" (4 letters → 2 pts)
    const primed: GameState = {
      ...base,
      players: {
        local: {
          ...createInitialPlayerState(),
          buffer: [
            { letterId: 'x0', letter: 'k' },
            { letterId: 'x1', letter: 'a' },
            { letterId: 'x2', letter: 'l' },
            { letterId: 'x3', letter: 'e' },
          ],
          collectedIds: new Set(['x0', 'x1', 'x2', 'x3']),
        },
      },
    };
    const next = gameReducer(primed, {
      type: 'SUBMIT_WORD',
      playerId: 'local',
      at: WALL_START + 5000,
    });
    expect(next.players['local'].score).toBe(WORD_SCORE[4]);
    expect(next.players['local'].buffer).toHaveLength(0);
  });

  it('does not score and keeps the buffer for an invalid word', () => {
    const base = startedState();
    const primed: GameState = {
      ...base,
      players: {
        local: {
          ...createInitialPlayerState(),
          buffer: [
            { letterId: 'y0', letter: 'x' },
            { letterId: 'y1', letter: 'q' },
            { letterId: 'y2', letter: 'z' },
          ],
          collectedIds: new Set(['y0', 'y1', 'y2']),
        },
      },
    };
    const next = gameReducer(primed, {
      type: 'SUBMIT_WORD',
      playerId: 'local',
      at: WALL_START + 5000,
    });
    expect(next.players['local'].score).toBe(0);
    expect(next.players['local'].buffer).toHaveLength(3);
  });

  it('scores more points for a longer valid word', () => {
    const base = startedState();
    // "yaşam" = 5 letters, a valid Turkish word (4 pts)
    const primed: GameState = {
      ...base,
      players: {
        local: {
          ...createInitialPlayerState(),
          buffer: [
            { letterId: 'z0', letter: 'y' },
            { letterId: 'z1', letter: 'a' },
            { letterId: 'z2', letter: 'ş' },
            { letterId: 'z3', letter: 'a' },
            { letterId: 'z4', letter: 'm' },
          ],
          collectedIds: new Set(['z0', 'z1', 'z2', 'z3', 'z4']),
        },
      },
    };
    const next = gameReducer(primed, {
      type: 'SUBMIT_WORD',
      playerId: 'local',
      at: WALL_START + 5000,
    });
    expect(next.players['local'].score).toBe(WORD_SCORE[5]);
  });
});

// ── REMOVE_BUFFER_ITEM ───────────────────────────────────────────────────────

describe('REMOVE_BUFFER_ITEM', () => {
  function stateWithOneItem(): { state: GameState; collectedAt: number } {
    const base = startedState();
    const collectedAt = activeAt(base, 0);
    const after = gameReducer(base, {
      type: 'COLLECT_LETTER',
      playerId: 'local',
      letterId: base.stream[0].id,
      at: collectedAt,
    });
    return { state: after, collectedAt };
  }

  it('removes the item when no cooldown is active', () => {
    const { state, collectedAt } = stateWithOneItem();
    expect(state.players['local'].buffer.length).toBe(1);
    const next = gameReducer(state, {
      type: 'REMOVE_BUFFER_ITEM',
      playerId: 'local',
      bufferIndex: 0,
      at: collectedAt + 10,
    });
    expect(next.players['local'].buffer.length).toBe(0);
  });

  it('sets a cooldown after a successful removal', () => {
    const { state, collectedAt } = stateWithOneItem();
    const removeAt = collectedAt + 10;
    const logicalRemoveTime = removeAt - WALL_START;
    const next = gameReducer(state, {
      type: 'REMOVE_BUFFER_ITEM',
      playerId: 'local',
      bufferIndex: 0,
      at: removeAt,
    });
    expect(next.players['local'].removeCooldownUntil).toBe(logicalRemoveTime + REMOVE_COOLDOWN_MS);
  });

  it('blocks removal while on cooldown', () => {
    const { state, collectedAt } = stateWithOneItem();
    const afterRemove = gameReducer(state, {
      type: 'REMOVE_BUFFER_ITEM',
      playerId: 'local',
      bufferIndex: 0,
      at: collectedAt + 10,
    });
    const withItem: GameState = {
      ...afterRemove,
      players: {
        local: {
          ...afterRemove.players['local'],
          buffer: [{ letterId: 'extra', letter: 'e' }],
        },
      },
    };
    const blocked = gameReducer(withItem, {
      type: 'REMOVE_BUFFER_ITEM',
      playerId: 'local',
      bufferIndex: 0,
      at: collectedAt + 110,
    });
    expect(blocked.players['local'].buffer.length).toBe(1);
  });

  it('allows removal after the cooldown has elapsed', () => {
    const { state, collectedAt } = stateWithOneItem();
    const afterRemove = gameReducer(state, {
      type: 'REMOVE_BUFFER_ITEM',
      playerId: 'local',
      bufferIndex: 0,
      at: collectedAt + 10,
    });
    const withItem: GameState = {
      ...afterRemove,
      players: {
        local: {
          ...afterRemove.players['local'],
          buffer: [{ letterId: 'extra2', letter: 'a' }],
        },
      },
    };
    const allowed = gameReducer(withItem, {
      type: 'REMOVE_BUFFER_ITEM',
      playerId: 'local',
      bufferIndex: 0,
      at: collectedAt + 1100,
    });
    expect(allowed.players['local'].buffer.length).toBe(0);
  });
});

// ── ACTION REPLAY DETERMINISM ────────────────────────────────────────────────

describe('action replay', () => {
  it('two independent reducer chains reach identical state for the same action log', () => {
    const actions = [
      { type: 'START_MATCH' as const, seed: SEED, at: WALL_START },
    ];
    const stateA = actions.reduce(gameReducer, INITIAL_GAME_STATE);
    const stateB = actions.reduce(gameReducer, INITIAL_GAME_STATE);
    expect(stateA.stream).toEqual(stateB.stream);
    expect(stateA.seed).toBe(stateB.seed);
    expect(stateA.matchStatus).toBe(stateB.matchStatus);
    expect(stateA.players['local'].score).toBe(stateB.players['local'].score);
  });
});
