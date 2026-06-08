import type { AnalyticsPort } from '../ports';

export class NoopAnalyticsAdapter implements AnalyticsPort {
  track(_event: string, _params?: Record<string, string | number | boolean>): void {
    // no-op
  }
}
