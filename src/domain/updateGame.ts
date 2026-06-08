import type { GameAction, GameState } from './types';
import { gameReducer } from './gameReducer';

/**
 * Advances game state to the given wall-clock time and folds any pending
 * actions through the reducer.
 *
 * The function is pure: it reads the wall clock only through the `wallClockTime`
 * parameter, never through a global. This makes it trivially testable and safe
 * to call during multiplayer action replay with any synthetic clock value.
 *
 * @param state         Current game state
 * @param wallClockTime Current wall-clock milliseconds (e.g. from ClockPort.now())
 * @param actions       Actions queued since the last update call
 */
export function updateGame(
  state: GameState,
  wallClockTime: number,
  actions: GameAction[],
): GameState {
  if (state.matchStatus === 'idle') {
    // Only START_MATCH can advance from idle
    return actions.reduce(gameReducer, state);
  }

  const logicalTime = wallClockTime - state.matchStartedAt;

  if (state.matchStatus === 'playing' && logicalTime >= state.matchDuration) {
    // Match duration expired — end immediately, ignore remaining actions
    return { ...state, matchStatus: 'ended' };
  }

  if (actions.length === 0) return state;

  return actions.reduce(gameReducer, state);
}
