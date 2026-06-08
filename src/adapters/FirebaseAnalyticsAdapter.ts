import { logEvent } from 'firebase/analytics';
import { getFirebaseAnalytics } from '../firebase/config';
import type { AnalyticsPort } from '../ports';

export class FirebaseAnalyticsAdapter implements AnalyticsPort {
  track(event: string, params?: Record<string, string | number | boolean>): void {
    void getFirebaseAnalytics().then(analytics => {
      if (!analytics) return;
      logEvent(analytics, event, params);
    });
  }
}
