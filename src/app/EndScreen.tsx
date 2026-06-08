interface Props {
  score: number;
  bestScore: number;
  onPlayAgain: () => void;
}

export function EndScreen({ score, bestScore, onPlayAgain }: Props) {
  const isNewBest = score > 0 && score >= bestScore;

  return (
    <div className="screen end-screen">
      <div className="end-content">
        <h2 className="end-title">TIME'S UP</h2>
        {isNewBest && <div className="new-best-badge">NEW BEST!</div>}
        <div className="end-score">{score}</div>
        <div className="end-score-label">
          {score === 1 ? 'point' : 'points'}
        </div>
        {!isNewBest && bestScore > 0 && (
          <div className="best-score-chip">BEST {bestScore}</div>
        )}
        <button className="play-btn" onClick={onPlayAgain}>
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
