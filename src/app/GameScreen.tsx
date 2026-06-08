import { useCallback, useEffect, useRef, useState } from 'react';
import { getActiveNumbers } from '../domain/numbers';
import type { FallingNumber, GameAction, GameState } from '../domain/types';
import { MAX_STACK_SIZE, REMOVE_COOLDOWN_MS, TARGET_SUM } from '../domain/constants';
import type { ClockPort } from '../ports';

interface PopEffect {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
}

interface Props {
  gameState: GameState;
  logicalTime: number;
  bestScore: number;
  onDispatch: (action: GameAction) => void;
  clock: ClockPort;
  isMultiplayer?: boolean;
  opponentScore?: number;
  opponentName?: string;
  onScoreChange?: (score: number) => void;
}

function formatTime(ms: number): string {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** One distinct color per value (1–7) for instant visual recognition. */
function tileColor(value: number): string {
  switch (value) {
    case 1: return '#4fc3f7';
    case 2: return '#4dd0e1';
    case 3: return '#81c784';
    case 4: return '#fff176';
    case 5: return '#ffb74d';
    case 6: return '#ef9a9a';
    case 7: return '#ce93d8';
    default: return '#ffffff';
  }
}

export function GameScreen({
  gameState,
  logicalTime,
  bestScore,
  onDispatch,
  clock,
  isMultiplayer = false,
  opponentScore = 0,
  opponentName: _opponentName,
  onScoreChange,
}: Props) {
  const player = gameState.players['local'];
  const timeLeft = gameState.matchDuration - logicalTime;
  const isUrgent = timeLeft < 30_000;
  const localScore = player?.score ?? 0;

  const collectedIds = player?.collectedIds ?? new Set<string>();
  const activeNumbers = getActiveNumbers(gameState.stream, collectedIds, logicalTime);

  const stackSum = player?.stack.reduce((s, item) => s + item.value, 0) ?? 0;
  const cooldownRemaining = player
    ? Math.max(0, player.removeCooldownUntil - logicalTime)
    : 0;
  const cooldownPct = (cooldownRemaining / REMOVE_COOLDOWN_MS) * 100;
  const onCooldown = cooldownRemaining > 0;

  const prevScoreRef = useRef(localScore);
  useEffect(() => {
    if (onScoreChange && localScore !== prevScoreRef.current) {
      onScoreChange(localScore);
      prevScoreRef.current = localScore;
    }
  }, [localScore, onScoreChange]);

  const isLeading = isMultiplayer && localScore > opponentScore;
  const isBehind = isMultiplayer && localScore < opponentScore;

  const [popEffects, setPopEffects] = useState<PopEffect[]>([]);

  const collect = useCallback((num: FallingNumber) => {
    onDispatch({ type: 'COLLECT_NUMBER', playerId: 'local', numberId: num.id, at: clock.now() });
    const effectId = num.id + '-' + clock.now();
    setPopEffects(prev => [...prev, {
      id: effectId,
      x: num.xPosition,
      y: num.yPosition,
      value: num.value,
      color: tileColor(num.value),
    }]);
    setTimeout(() => {
      setPopEffects(prev => prev.filter(p => p.id !== effectId));
    }, 500);
  }, [onDispatch, clock]);

  function remove(stackIndex: number) {
    onDispatch({ type: 'REMOVE_STACK_ITEM', playerId: 'local', stackIndex, at: clock.now() });
  }

  return (
    <div className={`screen game-screen${isMultiplayer ? ' game-screen--vs' : ''}`}>
      {isMultiplayer ? (
        <div className="vs-hud">
          <div className={`vs-card vs-card--you${isLeading ? ' vs-card--leading' : ''}${isBehind ? ' vs-card--behind' : ''}`}>
            <span className="vs-card-label">YOU</span>
            <span key={localScore} className="vs-card-score">{localScore}</span>
            {isLeading && <span className="vs-lead-badge">WINNING</span>}
          </div>

          <div className="vs-center">
            <span className={`vs-time${isUrgent ? ' vs-time--urgent' : ''}`}>
              {formatTime(timeLeft)}
            </span>
            <span className="vs-versus">VS</span>
            <span className="vs-target-line">target <strong>{TARGET_SUM}</strong></span>
          </div>

          <div className={`vs-card vs-card--opp${!isLeading && !isBehind ? '' : isLeading ? ' vs-card--behind' : ' vs-card--leading'}`}>
            <span className="vs-card-label">THEM</span>
            <span key={opponentScore} className="vs-card-score vs-card-score--opp">{opponentScore}</span>
            {isBehind && <span className="vs-lead-badge vs-lead-badge--danger">WINNING</span>}
          </div>
        </div>
      ) : (
        <div className="hud">
          <div className="hud-item">
            <span className="hud-label">SCORE</span>
            <span key={localScore} className="hud-value hud-score">
              {localScore}
            </span>
          </div>

          <div className="hud-item">
            <span className="hud-label">TARGET</span>
            <span className="hud-value hud-target">{TARGET_SUM}</span>
          </div>

          <div className="hud-item">
            <span className="hud-label">TIME</span>
            <span className={`hud-value${isUrgent ? ' hud-urgent' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <div className="hud-item">
            <span className="hud-label">BEST</span>
            <span className="hud-value">{bestScore}</span>
          </div>
        </div>
      )}

      <div className="arena">
        {activeNumbers.map(num => (
          <button
            key={num.id}
            className="tile"
            style={{
              left: `${num.xPosition * 100}%`,
              top: `${num.yPosition * 100}%`,
              background: tileColor(num.value),
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              collect(num);
            }}
          >
            {num.value}
          </button>
        ))}
        {popEffects.map(p => (
          <div
            key={p.id}
            className="tile-pop"
            aria-hidden="true"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          >
            {/* Bubble that pops */}
            <div className="tile-pop__bubble" style={{ background: p.color }}>
              {p.value}
            </div>
            {/* Shockwave ring */}
            <div className="tile-pop__ring" style={{ borderColor: p.color }} />
            {/* Particles radiating outward */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => (
              <div
                key={angle}
                className="tile-pop__particle"
                style={{
                  background: p.color,
                  '--angle': `${angle}deg`,
                } as React.CSSProperties}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="stack-panel">
        <div className="stack-row">
          {player?.stack.map((item, idx) => (
            <button
              key={`${item.numberId}-${idx}`}
              className={`stack-tile${onCooldown ? ' stack-tile--cooling' : ''}`}
              style={{ background: tileColor(item.value) }}
              onClick={() => remove(idx)}
              aria-label={`Remove ${item.value} from stack`}
            >
              {item.value}
            </button>
          ))}
          {Array.from({ length: MAX_STACK_SIZE - (player?.stack.length ?? 0) }).map((_, i) => (
            <div key={`empty-${i}`} className="stack-slot-empty" aria-hidden="true" />
          ))}
        </div>

        <div className="stack-meta">
          <span
            className={
              'stack-sum' +
              (stackSum === TARGET_SUM ? ' stack-sum--exact' : '') +
              (stackSum > TARGET_SUM ? ' stack-sum--over' : '')
            }
          >
            {stackSum} / {TARGET_SUM}
          </span>

          {onCooldown && (
            <div className="cooldown-track">
              <div className="cooldown-fill" style={{ width: `${cooldownPct}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
