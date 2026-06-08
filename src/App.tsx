import { useCallback, useState } from 'react';
import { BrowserClockAdapter } from './adapters/BrowserClockAdapter';
import { LocalStorageAdapter } from './adapters/LocalStorageAdapter';
import { useGameSession } from './app/useGameSession';
import { StartScreen } from './app/StartScreen';
import { CountdownScreen } from './app/CountdownScreen';
import { GameScreen } from './app/GameScreen';
import { EndScreen } from './app/EndScreen';

// Adapters are created once at module level — they are stateless singletons
// and stable across renders so the useGameSession effect never re-runs.
const clock = new BrowserClockAdapter();
const storage = new LocalStorageAdapter();

export default function App() {
  const { gameState, logicalTime, bestScore, dispatchAction } = useGameSession(clock, storage);
  const [showCountdown, setShowCountdown] = useState(false);

  const startMatch = useCallback(() => {
    // Seed from current timestamp — unique per attempt, reproducible if stored.
    dispatchAction({ type: 'START_MATCH', seed: String(clock.now()), at: clock.now() });
    setShowCountdown(false);
  }, [dispatchAction]);

  function handlePlay() {
    setShowCountdown(true);
  }

  if (showCountdown) {
    return <CountdownScreen onComplete={startMatch} />;
  }

  if (gameState.matchStatus === 'idle') {
    return <StartScreen bestScore={bestScore} onPlay={handlePlay} />;
  }

  if (gameState.matchStatus === 'playing') {
    return (
      <GameScreen
        gameState={gameState}
        logicalTime={logicalTime}
        bestScore={bestScore}
        onDispatch={dispatchAction}
        clock={clock}
      />
    );
  }

  // matchStatus === 'ended'
  return (
    <EndScreen
      score={gameState.players['local']?.score ?? 0}
      bestScore={bestScore}
      onPlayAgain={handlePlay}
    />
  );
}
