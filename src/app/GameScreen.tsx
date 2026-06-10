import { useCallback, useEffect, useRef, useState } from 'react';
import { getActiveLetters } from '../domain/letters';
import { isValidWord } from '../domain/wordSet';
import type { FallingLetter, GameAction, GameState } from '../domain/types';
import { MAX_BUFFER_SIZE, MIN_WORD_LENGTH, REMOVE_COOLDOWN_MS, WORD_SCORE } from '../domain/constants';
import type { ClockPort } from '../ports';

interface PopEffect {
  id: string;
  x: number;
  y: number;
  letter: string;
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

const TURKISH_VOWELS = new Set(['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü']);
const VOWEL_COLORS = ['#ffd54f', '#ffb74d', '#fff176'];
const CONSONANT_COLORS = ['#4fc3f7', '#4dd0e1', '#81c784', '#ce93d8', '#80cbc4'];

/**
 * Turkish-correct uppercase: 'i' → 'İ' (dotted), 'ı' → 'I' (dotless).
 * CSS text-transform collapses both to 'I', making them indistinguishable.
 * Using this function instead keeps them visually distinct on tile labels.
 */
function turkishUpper(ch: string): string {
  if (ch === 'i') return 'İ';
  if (ch === 'ı') return 'I';
  return ch.toUpperCase();
}

function displayWord(word: string): string {
  return Array.from(word).map(turkishUpper).join('');
}

function tileColor(letter: string): string {
  const code = letter.charCodeAt(0);
  if (TURKISH_VOWELS.has(letter)) {
    return VOWEL_COLORS[code % VOWEL_COLORS.length];
  }
  return CONSONANT_COLORS[code % CONSONANT_COLORS.length];
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
  const activeLetters = getActiveLetters(gameState.stream, collectedIds, logicalTime);

  const cooldownRemaining = player
    ? Math.max(0, player.removeCooldownUntil - logicalTime)
    : 0;
  const cooldownPct = (cooldownRemaining / REMOVE_COOLDOWN_MS) * 100;
  const onCooldown = cooldownRemaining > 0;

  // Current word being assembled
  const currentWord = player?.buffer.map(b => b.letter).join('') ?? '';
  const isWordValid = currentWord.length >= MIN_WORD_LENGTH && isValidWord(currentWord);
  const wordScore = isWordValid ? (WORD_SCORE[currentWord.length] ?? 1) : 0;

  // Submit feedback state: 'valid' | 'invalid' | null
  const [submitFeedback, setSubmitFeedback] = useState<'valid' | 'invalid' | null>(null);

  // Index of the buffer slot selected for replacement (null = none selected)
  const [selectedBufferIndex, setSelectedBufferIndex] = useState<number | null>(null);

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

  const collect = useCallback((tile: FallingLetter) => {
    if (selectedBufferIndex !== null) {
      onDispatch({
        type: 'REPLACE_BUFFER_ITEM',
        playerId: 'local',
        bufferIndex: selectedBufferIndex,
        letterId: tile.id,
        at: clock.now(),
      });
      setSelectedBufferIndex(null);
    } else {
      onDispatch({
        type: 'COLLECT_LETTER',
        playerId: 'local',
        letterId: tile.id,
        at: clock.now(),
      });
    }
    const effectId = tile.id + '-' + clock.now();
    setPopEffects(prev => [
      ...prev,
      {
        id: effectId,
        x: tile.xPosition,
        y: tile.yPosition,
        letter: tile.letter,
        color: tileColor(tile.letter),
      },
    ]);
    setTimeout(() => {
      setPopEffects(prev => prev.filter(p => p.id !== effectId));
    }, 500);
  }, [onDispatch, clock, selectedBufferIndex]);

  function handleBufferItemTap(bufferIndex: number) {
    if (selectedBufferIndex === bufferIndex) {
      onDispatch({
        type: 'REMOVE_BUFFER_ITEM',
        playerId: 'local',
        bufferIndex,
        at: clock.now(),
      });
      setSelectedBufferIndex(null);
      return;
    }
    setSelectedBufferIndex(bufferIndex);
  }

  function handleSubmit() {
    if (currentWord.length < MIN_WORD_LENGTH) return;
    const valid = isWordValid;
    setSubmitFeedback(valid ? 'valid' : 'invalid');
    setSelectedBufferIndex(null);
    onDispatch({ type: 'SUBMIT_WORD', playerId: 'local', at: clock.now() });
    setTimeout(() => setSubmitFeedback(null), 700);
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
        {activeLetters.map(tile => (
          <button
            key={tile.id}
            className="tile"
            style={{
              left: `${tile.xPosition * 100}%`,
              top: `${tile.yPosition * 100}%`,
              background: tileColor(tile.letter),
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              collect(tile);
            }}
          >
            {turkishUpper(tile.letter)}
          </button>
        ))}
        {popEffects.map(p => (
          <div
            key={p.id}
            className="tile-pop"
            aria-hidden="true"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          >
            <div className="tile-pop__bubble" style={{ background: p.color }}>
              {turkishUpper(p.letter)}
            </div>
            <div className="tile-pop__ring" style={{ borderColor: p.color }} />
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

      <div className={`buffer-panel${submitFeedback === 'valid' ? ' buffer-panel--valid' : ''}${submitFeedback === 'invalid' ? ' buffer-panel--invalid' : ''}`}>
        <div className="buffer-row">
          {player?.buffer.map((item, idx) => (
            <button
              key={`${item.letterId}-${idx}`}
              className={`buffer-tile${selectedBufferIndex === idx ? ' buffer-tile--selected' : ''}`}
              style={{ background: tileColor(item.letter) }}
              onClick={() => handleBufferItemTap(idx)}
              aria-label={`Select ${turkishUpper(item.letter)} to replace, double-tap to remove`}
            >
              {turkishUpper(item.letter)}
            </button>
          ))}
          {Array.from({ length: MAX_BUFFER_SIZE - (player?.buffer.length ?? 0) }).map((_, i) => (
            <div key={`empty-${i}`} className="buffer-slot-empty" aria-hidden="true" />
          ))}
        </div>

        <div className="buffer-meta">
          {onCooldown && (
            <div className="cooldown-track">
              <div className="cooldown-fill" style={{ width: `${cooldownPct}%` }} />
            </div>
          )}

          <div className="word-display">
            {currentWord.length > 0 ? (
              <span className={`word-text${isWordValid ? ' word-text--valid' : ''}`}>
                {displayWord(currentWord)}
              </span>
            ) : (
              <span className="word-text word-text--placeholder">tap letters to spell a word</span>
            )}
            {isWordValid && (
              <span className="word-score-badge">+{wordScore}</span>
            )}
          </div>

          <button
            className={`submit-btn${currentWord.length < MIN_WORD_LENGTH ? ' submit-btn--disabled' : ''}${isWordValid ? ' submit-btn--ready' : ''}`}
            onClick={handleSubmit}
            disabled={currentWord.length < MIN_WORD_LENGTH}
          >
            SUBMIT
          </button>
        </div>
      </div>
    </div>
  );
}
