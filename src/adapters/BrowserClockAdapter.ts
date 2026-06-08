import type { ClockPort } from '../ports';

/**
 * Production clock backed by the browser's high-resolution timer.
 * Using `performance.timeOrigin + performance.now()` gives a stable
 * monotonic epoch that is consistent with `Date.now()` but more precise.
 */
export class BrowserClockAdapter implements ClockPort {
  now(): number {
    return performance.timeOrigin + performance.now();
  }

  requestFrame(callback: (time: number) => void): number {
    return requestAnimationFrame(() => callback(this.now()));
  }

  cancelFrame(handle: number): void {
    cancelAnimationFrame(handle);
  }
}
