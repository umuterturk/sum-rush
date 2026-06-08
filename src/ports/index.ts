import type { GameAction } from '../domain/types';

/**
 * Abstracts wall-clock time and the animation frame scheduler.
 * The domain never calls these directly — only the UI layer does.
 */
export interface ClockPort {
  /** Current wall-clock time in milliseconds (monotonic). */
  now(): number;
  /** Schedule a callback for the next animation frame. Returns a cancellable handle. */
  requestFrame(callback: (time: number) => void): number;
  /** Cancel a previously scheduled frame. */
  cancelFrame(handle: number): void;
}

/**
 * Persists and retrieves the player's best score.
 * Single-player MVP uses LocalStorage; future cloud variant replaces this port.
 */
export interface StoragePort {
  saveBestScore(score: number): Promise<void>;
  loadBestScore(): Promise<number>;
}

/**
 * Synchronises player actions across clients.
 * For single-player MVP this is a no-op adapter.
 * Firebase (or any other transport) can implement the same interface
 * for real-time multiplayer without touching the domain.
 */
export interface MatchSyncPort {
  publishAction(action: GameAction): Promise<void>;
  subscribeToActions(handler: (action: GameAction) => void): () => void;
}
