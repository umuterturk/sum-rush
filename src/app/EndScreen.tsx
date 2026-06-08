import type { MatchResult } from '../multiplayer/types';

interface Props {
  score: number;
  bestScore: number;
  onPlayAgain: () => void;
  onBackToMenu?: () => void;
  isMultiplayer?: boolean;
  opponentScore?: number;
  opponentName?: string;
  opponentWantsRematch?: boolean;
  result?: MatchResult | null;
}

const RESULT_LABELS: Record<MatchResult, string> = {
  win: 'YOU WIN!',
  lose: 'YOU LOSE',
  tie: 'TIE GAME',
};

const RESULT_CLASSES: Record<MatchResult, string> = {
  win: 'result-win',
  lose: 'result-lose',
  tie: 'result-tie',
};

export function EndScreen({
  score,
  bestScore,
  onPlayAgain,
  onBackToMenu,
  isMultiplayer = false,
  opponentScore = 0,
  opponentName: _opponentName,
  opponentWantsRematch = false,
  result = null,
}: Props) {
  const isNewBest = !isMultiplayer && score > 0 && score >= bestScore;

  return (
    <div className="screen end-screen">
      <div className="end-content">
        {isMultiplayer && result ? (
          <>
            <h2 className={`end-title end-result ${RESULT_CLASSES[result]}`}>
              {RESULT_LABELS[result]}
            </h2>
            <div className="end-vs-scores">
              <div className="end-vs-player">
                <span className="end-vs-label">YOU</span>
                <span className="end-score">{score}</span>
              </div>
              <span className="end-vs-divider">VS</span>
              <div className="end-vs-player">
                <span className="end-vs-label">THEM</span>
                <span className="end-score end-score--opp">{opponentScore}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="end-title">TIME'S UP</h2>
            {isNewBest && <div className="new-best-badge">NEW BEST!</div>}
            <div className="end-score">{score}</div>
            <div className="end-score-label">
              {score === 1 ? 'point' : 'points'}
            </div>
            {!isNewBest && bestScore > 0 && (
              <div className="best-score-chip">BEST {bestScore}</div>
            )}
          </>
        )}

        {opponentWantsRematch && (
          <div className="rematch-nudge">
            OPPONENT WANTS A REMATCH!
          </div>
        )}

        <div className="end-buttons">
          <button className="play-btn" onClick={onPlayAgain}>
            {isMultiplayer ? 'REMATCH' : 'PLAY AGAIN'}
          </button>
          {onBackToMenu && (
            <button className="play-btn play-btn--secondary" onClick={onBackToMenu}>
              MENU
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
