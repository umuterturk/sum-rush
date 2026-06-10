import { MATCH_DURATION_MS } from '../domain/constants';

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
        <div className="start-badge">TAP LETTERS · SPELL TURKISH WORDS</div>
        <h1 className="game-title">WORD RUSH</h1>
        <p className="game-subtitle">{MATCH_MINUTES} minutes · how many words can you spell?</p>
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
          Tap a falling letter to add it to your word.<br />
          Tap a buffered letter to remove it.<br />
          Spell a valid Turkish word → hit SUBMIT to score!<br />
          Longer words earn more points.
        </div>
      </div>
    </div>
  );
}
