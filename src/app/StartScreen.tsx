import { TARGET_SUM, MATCH_DURATION_MS } from '../domain/constants';

interface Props {
  bestScore: number;
  multiplayerAvailable: boolean;
  onPlaySolo: () => void;
  onQuickMatch: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

const MATCH_MINUTES = Math.round(MATCH_DURATION_MS / 60_000);

export function StartScreen({
  bestScore,
  multiplayerAvailable,
  onPlaySolo,
  onQuickMatch,
  onCreateRoom,
  onJoinRoom,
}: Props) {
  return (
    <div className="screen start-screen">
      <div className="start-content">
        <div className="start-badge">TAP TO COLLECT · REACH {TARGET_SUM}</div>
        <h1 className="game-title">SUM RUSH</h1>
        <p className="game-subtitle">{MATCH_MINUTES} minutes · how many {TARGET_SUM}s can you make?</p>
        {bestScore > 0 && (
          <div className="best-score-chip">BEST {bestScore}</div>
        )}

        <div className="mode-buttons">
          <button className="play-btn" onClick={onPlaySolo}>
            SOLO
          </button>

          {multiplayerAvailable && (
            <>
              <button className="play-btn play-btn--vs" onClick={onQuickMatch}>
                QUICK MATCH
              </button>
              <div className="friend-buttons">
                <button className="play-btn play-btn--secondary" onClick={onCreateRoom}>
                  CREATE ROOM
                </button>
                <button className="play-btn play-btn--secondary" onClick={onJoinRoom}>
                  JOIN ROOM
                </button>
              </div>
            </>
          )}
        </div>

        <div className="start-hint">
          Tap a falling number to add it to your stack.<br />
          Tap a stack number to remove it.<br />
          Stack sum = {TARGET_SUM} → point!
        </div>
      </div>
    </div>
  );
}
