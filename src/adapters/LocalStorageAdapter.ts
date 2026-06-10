import type { StoragePort } from '../ports';

const BEST_SCORE_KEY = 'word-rush:bestScore';

export class LocalStorageAdapter implements StoragePort {
  async saveBestScore(score: number): Promise<void> {
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(score));
    } catch {
      // Silently ignore — storage may be unavailable (private browsing, quota)
    }
  }

  async loadBestScore(): Promise<number> {
    try {
      const raw = localStorage.getItem(BEST_SCORE_KEY);
      if (raw === null) return 0;
      const n = parseInt(raw, 10);
      return isNaN(n) ? 0 : Math.max(0, n);
    } catch {
      return 0;
    }
  }
}
