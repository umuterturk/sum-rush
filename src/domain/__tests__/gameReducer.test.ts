import { describe, it, expect } from 'vitest';
import {
  gameReducer,
  INITIAL_GAME_STATE,
  createInitialPlayerState,
} from '../gameReducer';
import type { GameState } from '../types';
import { MAX_STACK_SIZE, REMOVE_COOLDOWN_MS, TARGET_SUM } from '../constants';

const SEED = 'test-seed-deterministic';
const WALL_START = 1_000_000; // arbitrary wall-clock origin

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
    expect(players['local'].stack).toHaveLength(0);
  });

  it('restarting produces the same stream for the same seed', () => {
    const a = startedState();
    const b = startedState();
    expect(a.stream).toEqual(b.stream);
  });
});

// ── COLLECT_NUMBER ──────────────────────────────────────────────────────────

describe('COLLECT_NUMBER', () => {
  it('accepts an active tile and adds it to the stack', () => {
    const state = startedState();
    const next = gameReducer(state, {
      type: 'COLLECT_NUMBER',
      playerId: 'local',
      numberId: state.stream[0].id,
      at: activeAt(state, 0),
    });
    // Either scored (stack cleared) or stack grew
    const player = next.players['local'];
    expect(player.stack.length + player.score).toBeGreaterThan(0);
  });

  it('rejects a tile that has not yet spawned (logical time < spawnTime)', () => {
    const state = startedState();
    // at = WALL_START means logicalTime = 0, before first tile spawns at 600ms+
    const next = gameReducer(state, {
      type: 'COLLECT_NUMBER',
      playerId: 'local',
      numberId: state.stream[0].id,
      at: WALL_START,
    });
    expect(next.players['local'].stack.length).toBe(0);
    expect(next.players['local'].score).toBe(0);
  });

  it('rejects a tile that has already left the arena (expired)', () => {
    const state = startedState();
    const entry = state.stream[0];
    const fallDuration = 1 / entry.fallSpeed;
    // Place logical time well past the tile's exit
    const at = WALL_START + entry.spawnTime + fallDuration + 1000;
    const next = gameReducer(state, {
      type: 'COLLECT_NUMBER',
      playerId: 'local',
      numberId: entry.id,
      at,
    });
    expect(next.players['local'].stack.length).toBe(0);
    expect(next.players['local'].score).toBe(0);
  });

  it('does not allow collecting the same tile twice', () => {
    const state = startedState();
    const at = activeAt(state, 0);
    const action = {
      type: 'COLLECT_NUMBER' as const,
      playerId: 'local',
      numberId: state.stream[0].id,
      at,
    };
    const after1 = gameReducer(state, action);
    const after2 = gameReducer(after1, action);
    // Stack length + score must not grow on second attempt
    const s1 = after1.players['local'];
    const s2 = after2.players['local'];
    expect(s2.stack.length + s2.score).toBe(s1.stack.length + s1.score);
  });

  it('slides the window (evicts oldest) when the stack is already at MAX_STACK_SIZE', () => {
    const base = startedState();
    // Use low values so the sum after eviction + new tile won't accidentally hit TARGET_SUM
    const fullStack = Array.from({ length: MAX_STACK_SIZE }, (_, i) => ({
      numberId: `fake-${i}`,
      value: 1,
    }));
    const fullState: GameState = {
      ...base,
      players: {
        local: {
          ...createInitialPlayerState(),
          stack: fullStack,
          collectedIds: new Set(fullStack.map(s => s.numberId)),
        },
      },
    };
    const at = activeAt(base, 0);
    const next = gameReducer(fullState, {
      type: 'COLLECT_NUMBER',
      playerId: 'local',
      numberId: base.stream[0].id,
      at,
    });
    const resultStack = next.players['local'].stack;
    // Stack stays at MAX_STACK_SIZE
    expect(resultStack.length).toBe(MAX_STACK_SIZE);
    // The oldest item (fake-0, value 1) was evicted
    expect(resultStack[0].numberId).toBe('fake-1');
    // The new tile is at the end
    expect(resultStack[MAX_STACK_SIZE - 1].numberId).toBe(base.stream[0].id);
  });
});

// ── SCORING ─────────────────────────────────────────────────────────────────

describe('scoring', () => {
  it('scores +1 and clears the stack when sum equals TARGET_SUM', () => {
    const base = startedState();
    // Find the first stream entry and compute what value completes 21
    const targetEntry = base.stream[0];
    const needed = TARGET_SUM - targetEntry.value;

    if (needed < 1 || needed > 15) {
      // Edge case: first tile IS 21 or makes it impossible — skip this scenario
      return;
    }

    // Seed the stack with (TARGET_SUM - targetEntry.value) manually
    const primed: GameState = {
      ...base,
      players: {
        local: {
          ...createInitialPlayerState(),
          stack: [{ numberId: 'pre', value: needed }],
          collectedIds: new Set(['pre']),
        },
      },
    };

    const at = activeAt(base, 0);
    const next = gameReducer(primed, {
      type: 'COLLECT_NUMBER',
      playerId: 'local',
      numberId: targetEntry.id,
      at,
    });

    expect(next.players['local'].score).toBe(1);
    expect(next.players['local'].stack).toHaveLength(0);
  });

  it('does NOT score when sum is below TARGET_SUM', () => {
    const base = startedState();
    const entry = base.stream[0];
    // Ensure we won't hit 21 by seeding a stack that would sum < 21 with this tile
    const safeNeeded = Math.max(0, TARGET_SUM - entry.value - 5);
    if (safeNeeded === 0) return; // tile alone might score — skip

    const primed: GameState = {
      ...base,
      players: {
        local: {
          ...createInitialPlayerState(),
          stack: [{ numberId: 'pre', value: safeNeeded }],
          collectedIds: new Set(['pre']),
        },
      },
    };

    const next = gameReducer(primed, {
      type: 'COLLECT_NUMBER',
      playerId: 'local',
      numberId: entry.id,
      at: activeAt(base, 0),
    });
    expect(next.players['local'].score).toBe(0);
    expect(next.players['local'].stack.length).toBeGreaterThan(0);
  });
});

// ── REMOVE_STACK_ITEM ────────────────────────────────────────────────────────

describe('REMOVE_STACK_ITEM', () => {
  function stateWithOneItem(): { state: GameState; collectedAt: number } {
    const base = startedState();
    const collectedAt = activeAt(base, 0);
    const after = gameReducer(base, {
      type: 'COLLECT_NUMBER',
      playerId: 'local',
      numberId: base.stream[0].id,
      at: collectedAt,
    });
    return { state: after, collectedAt };
  }

  it('removes the item when no cooldown is active', () => {
    const { state, collectedAt } = stateWithOneItem();
    if (state.players['local'].stack.length === 0) return; // scored 21, skip

    const next = gameReducer(state, {
      type: 'REMOVE_STACK_ITEM',
      playerId: 'local',
      stackIndex: 0,
      at: collectedAt + 10,
    });
    expect(next.players['local'].stack.length).toBe(0);
  });

  it('sets a cooldown after a successful removal', () => {
    const { state, collectedAt } = stateWithOneItem();
    if (state.players['local'].stack.length === 0) return;

    const removeAt = collectedAt + 10;
    const logicalRemoveTime = removeAt - WALL_START;
    const next = gameReducer(state, {
      type: 'REMOVE_STACK_ITEM',
      playerId: 'local',
      stackIndex: 0,
      at: removeAt,
    });
    expect(next.players['local'].removeCooldownUntil).toBe(logicalRemoveTime + REMOVE_COOLDOWN_MS);
  });

  it('blocks removal while on cooldown', () => {
    const { state, collectedAt } = stateWithOneItem();
    if (state.players['local'].stack.length === 0) return;

    // First removal — sets cooldown
    const afterRemove = gameReducer(state, {
      type: 'REMOVE_STACK_ITEM',
      playerId: 'local',
      stackIndex: 0,
      at: collectedAt + 10,
    });

    // Inject another item so there is something to remove
    const withItem: GameState = {
      ...afterRemove,
      players: {
        local: {
          ...afterRemove.players['local'],
          stack: [{ numberId: 'extra', value: 3 }],
        },
      },
    };

    // Try to remove immediately (100 ms after first removal, cooldown = 1000 ms)
    const blocked = gameReducer(withItem, {
      type: 'REMOVE_STACK_ITEM',
      playerId: 'local',
      stackIndex: 0,
      at: collectedAt + 110,
    });
    expect(blocked.players['local'].stack.length).toBe(1);
  });

  it('allows removal after the cooldown has elapsed', () => {
    const { state, collectedAt } = stateWithOneItem();
    if (state.players['local'].stack.length === 0) return;

    const afterRemove = gameReducer(state, {
      type: 'REMOVE_STACK_ITEM',
      playerId: 'local',
      stackIndex: 0,
      at: collectedAt + 10,
    });

    const withItem: GameState = {
      ...afterRemove,
      players: {
        local: {
          ...afterRemove.players['local'],
          stack: [{ numberId: 'extra2', value: 4 }],
        },
      },
    };

    // Remove after cooldown (>1000 ms later)
    const allowed = gameReducer(withItem, {
      type: 'REMOVE_STACK_ITEM',
      playerId: 'local',
      stackIndex: 0,
      at: collectedAt + 1100,
    });
    expect(allowed.players['local'].stack.length).toBe(0);
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

    // Deep equality check (ignores Set identity)
    expect(stateA.stream).toEqual(stateB.stream);
    expect(stateA.seed).toBe(stateB.seed);
    expect(stateA.matchStatus).toBe(stateB.matchStatus);
    expect(stateA.players['local'].score).toBe(stateB.players['local'].score);
  });
});
