import { useEffect, useState } from 'react';
import { TARGET_SUM } from '../domain/constants';

interface Props {
  onComplete: () => void;
  opponentName?: string;
}

const COUNTDOWN_VALUES = [3, 2, 1] as const;
const STEP_DURATION_MS = 667;

export function CountdownScreen({ onComplete, opponentName }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= COUNTDOWN_VALUES.length) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setStep(s => s + 1);
    }, STEP_DURATION_MS);

    return () => clearTimeout(timer);
  }, [step, onComplete]);

  const countdownValue = COUNTDOWN_VALUES[step];

  return (
    <div className="screen countdown-screen">
      <div className="countdown-content">
        {opponentName && (
          <div className="countdown-vs">
            <span className="countdown-opponent">1 VS 1</span>
          </div>
        )}
        <div className="countdown-target-label">TARGET</div>
        <div className="countdown-target">{TARGET_SUM}</div>
        {countdownValue !== undefined && (
          <div key={countdownValue} className="countdown-number">
            {countdownValue}
          </div>
        )}
      </div>
    </div>
  );
}
