import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MatchConfig, MatchPhase, MatchResult, MatchSnapshot } from '../multiplayer/types';
import type { MultiplayerPort } from '../ports';

interface MultiplayerSession {
  phase: MatchPhase;
  matchConfig: MatchConfig | null;
  opponentScore: number;
  opponentName: string;
  opponentWantsRematch: boolean;
  inviteCode: string | null;
  error: string | null;
  isAvailable: boolean;
  quickMatch: () => Promise<void>;
  createRoom: () => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  cancel: () => Promise<void>;
  publishScore: (score: number) => Promise<void>;
  requestRematch: () => Promise<void>;
  markPlaying: () => void;
  markEnded: () => void;
  getResult: (localScore: number) => MatchResult | null;
  reset: () => Promise<void>;
}

function snapshotToConfig(snapshot: MatchSnapshot): MatchConfig {
  return {
    matchId: snapshot.matchId,
    mode: snapshot.mode,
    inviteCode: snapshot.inviteCode,
    seed: snapshot.seed,
    matchDuration: snapshot.matchDuration,
    status: snapshot.status,
    opponentUid: snapshot.opponentUid,
    opponentName: snapshot.opponentName,
  };
}

export function useMultiplayer(multiplayer: MultiplayerPort, available: boolean): MultiplayerSession {
  const [phase, setPhase] = useState<MatchPhase>('idle');
  const [matchConfig, setMatchConfig] = useState<MatchConfig | null>(null);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentName, setOpponentName] = useState('');
  const [opponentWantsRematch, setOpponentWantsRematch] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[useMultiplayer] subscribing');
    const unsubscribe = multiplayer.subscribe((snapshot: MatchSnapshot | null) => {
      console.log('[useMultiplayer] snapshot received:', snapshot);
      if (!snapshot) {
        setPhase(prev => {
          if (prev === 'idle' || prev === 'ended') return prev;
          setError('Opponent disconnected.');
          return 'ended';
        });
        return;
      }

      setMatchConfig(snapshotToConfig(snapshot));
      setOpponentScore(snapshot.opponentScore);
      setOpponentName(snapshot.opponentName);
      setOpponentWantsRematch(snapshot.opponentWantsRematch);
      if (snapshot.inviteCode) setInviteCode(snapshot.inviteCode);

      const matchReady = snapshot.status === 'ready' && Boolean(snapshot.opponentUid);
      console.log('[useMultiplayer] matchReady=', matchReady);
      setPhase(prev => {
        const next = (() => {
          if (prev === 'playing' || prev === 'ended') return prev;
          if (matchReady) return 'ready';
          if (prev === 'searching' || prev === 'waiting') return 'waiting';
          return prev;
        })();
        console.log('[useMultiplayer] phase transition:', prev, '->', next);
        return next;
      });
    });

    return unsubscribe;
  }, [multiplayer]);

  const runAction = useCallback(
    async (action: () => Promise<void>, nextPhase: MatchPhase) => {
      setError(null);
      setPhase(nextPhase);
      try {
        await action();
        // Don't clobber a 'ready' that the snapshot may have already set.
        if (nextPhase === 'searching') {
          setPhase(prev => (prev === 'searching' ? 'waiting' : prev));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setPhase('idle');
        setMatchConfig(null);
        setInviteCode(null);
      }
    },
    [],
  );

  const quickMatch = useCallback(
    () => runAction(() => multiplayer.quickMatch(), 'searching'),
    [multiplayer, runAction],
  );

  const createRoom = useCallback(
    () => runAction(() => multiplayer.createRoom(), 'waiting'),
    [multiplayer, runAction],
  );

  const joinRoom = useCallback(
    (code: string) => runAction(() => multiplayer.joinRoom(code), 'searching'),
    [multiplayer, runAction],
  );

  const cancel = useCallback(async () => {
    await multiplayer.cancel();
    setPhase('idle');
    setMatchConfig(null);
    setOpponentScore(0);
    setOpponentName('');
    setOpponentWantsRematch(false);
    setInviteCode(null);
    setError(null);
  }, [multiplayer]);

  const publishScore = useCallback(
    (score: number) => multiplayer.publishScore(score),
    [multiplayer],
  );

  const requestRematch = useCallback(
    () => multiplayer.requestRematch(),
    [multiplayer],
  );

  const markPlaying = useCallback(() => {
    // Start fresh: a new match always begins with the opponent at zero.
    // Guards against a stale snapshot from the previous match leaking a
    // non-zero opponent score into the new game.
    setOpponentScore(0);
    setOpponentWantsRematch(false);
    setPhase('playing');
  }, []);
  const markEnded = useCallback(() => setPhase('ended'), []);

  const getResult = useCallback(
    (localScore: number): MatchResult | null => {
      if (localScore > opponentScore) return 'win';
      if (localScore < opponentScore) return 'lose';
      return 'tie';
    },
    [opponentScore],
  );

  const reset = useCallback(async () => {
    await multiplayer.leave();
    setPhase('idle');
    setMatchConfig(null);
    setOpponentScore(0);
    setOpponentName('');
    setOpponentWantsRematch(false);
    setInviteCode(null);
    setError(null);
  }, [multiplayer]);

  return useMemo(
    () => ({
      phase,
      matchConfig,
      opponentScore,
      opponentName,
      opponentWantsRematch,
      inviteCode,
      error,
      isAvailable: available,
      quickMatch,
      createRoom,
      joinRoom,
      cancel,
      publishScore,
      requestRematch,
      markPlaying,
      markEnded,
      getResult,
      reset,
    }),
    [
      phase,
      matchConfig,
      opponentScore,
      opponentName,
      opponentWantsRematch,
      inviteCode,
      error,
      available,
      quickMatch,
      createRoom,
      joinRoom,
      cancel,
      publishScore,
      requestRematch,
      markPlaying,
      markEnded,
      getResult,
      reset,
    ],
  );
}
