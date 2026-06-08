import type { MatchSyncPort } from '../ports';
import type { GameAction } from '../domain/types';

/**
 * Single-player stub for MatchSyncPort.
 * Replace with FirebaseMatchSyncAdapter (or similar) to add real-time
 * multiplayer without changing any domain or UI code.
 */
export class NoopMatchSyncAdapter implements MatchSyncPort {
  async publishAction(_action: GameAction): Promise<void> {
    // no-op
  }

  subscribeToActions(_handler: (action: GameAction) => void): () => void {
    return () => {};
  }
}
