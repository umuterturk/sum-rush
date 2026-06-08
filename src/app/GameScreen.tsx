import { getActiveNumbers } from '../domain/numbers';
import type { GameAction, GameState } from '../domain/types';
import { MAX_STACK_SIZE, REMOVE_COOLDOWN_MS, TARGET_SUM } from '../domain/constants';
import type { ClockPort } from '../ports';

interface Props {
  gameState: GameState;
  logicalTime: number;
  bestScore: number;
  onDispatch: (action: GameAction) => void;
  clock: ClockPort;
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
    case 1: return '#4fc3f7'; // sky blue
    case 2: return '#4dd0e1'; // cyan
    case 3: return '#81c784'; // green
    case 4: return '#fff176'; // yellow
    case 5: return '#ffb74d'; // orange
    case 6: return '#ef9a9a'; // red-pink
    case 7: return '#ce93d8'; // purple
    default: return '#ffffff';
  }
}

export function GameScreen({ gameState, logicalTime, bestScore, onDispatch, clock }: Props) {
  const player = gameState.players['local'];
  const timeLeft = gameState.matchDuration - logicalTime;
  const isUrgent = timeLeft < 30_000;

  const collectedIds = player?.collectedIds ?? new Set<string>();
  const activeNumbers = getActiveNumbers(gameState.stream, collectedIds, logicalTime);

  const stackSum = player?.stack.reduce((s, item) => s + item.value, 0) ?? 0;
  const cooldownRemaining = player
    ? Math.max(0, player.removeCooldownUntil - logicalTime)
    : 0;
  const cooldownPct = (cooldownRemaining / REMOVE_COOLDOWN_MS) * 100;
  const onCooldown = cooldownRemaining > 0;

  function collect(numberId: string) {
    onDispatch({ type: 'COLLECT_NUMBER', playerId: 'local', numberId, at: clock.now() });
  }

  function remove(stackIndex: number) {
    onDispatch({ type: 'REMOVE_STACK_ITEM', playerId: 'local', stackIndex, at: clock.now() });
  }

  return (
    <div className="screen game-screen">
      {/* ── HUD ── */}
      <div className="hud">
        <div className="hud-item">
          <span className="hud-label">SCORE</span>
          <span key={player?.score ?? 0} className="hud-value hud-score">
            {player?.score ?? 0}
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

      {/* ── Falling arena ── */}
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
              // Fire on press, not release — tiles move while the finger is down,
              // so waiting for onClick (which checks pointer position on release)
              // causes missed taps when the tile has drifted away.
              e.preventDefault();
              collect(num.id);
            }}
          >
            {num.value}
          </button>
        ))}
      </div>

      {/* ── Stack panel ── */}
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
