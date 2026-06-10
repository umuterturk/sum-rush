import type { FallingLetter, LetterStreamEntry } from './types';

/**
 * Derives the set of tiles that are currently visible (active) in the arena.
 *
 * A tile is active when:
 *   spawnTime <= logicalTime < spawnTime + fallDuration
 *   AND it has not been collected by the given player.
 *
 * Both the reducer (for tap validation) and the renderer use this same
 * function, guaranteeing they always agree on what is tappable.
 *
 * @param stream       Full pre-generated stream for the match
 * @param collectedIds IDs already removed from play for this player
 * @param logicalTime  Milliseconds elapsed since match start
 */
export function getActiveLetters(
  stream: LetterStreamEntry[],
  collectedIds: Set<string>,
  logicalTime: number,
): FallingLetter[] {
  const result: FallingLetter[] = [];

  for (const entry of stream) {
    if (collectedIds.has(entry.id)) continue;
    if (entry.spawnTime > logicalTime) break; // stream is ordered by spawnTime

    const fallDuration = 1 / entry.fallSpeed;
    if (logicalTime >= entry.spawnTime + fallDuration) continue;

    result.push({
      ...entry,
      yPosition: (logicalTime - entry.spawnTime) * entry.fallSpeed,
    });
  }

  return result;
}
