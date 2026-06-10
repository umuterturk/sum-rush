import { describe, it, expect } from 'vitest';
import { generateLetterStream } from '../letterStream';
import {
  MATCH_DURATION_MS,
  SPAWN_CUTOFF_BEFORE_END_MS,
} from '../constants';
import { LETTER_FREQUENCIES } from '../wordSet';

const ALL_LETTERS = new Set(Object.keys(LETTER_FREQUENCIES));

describe('generateLetterStream', () => {
  it('produces identical streams for the same seed', () => {
    const a = generateLetterStream('replay-seed-42');
    const b = generateLetterStream('replay-seed-42');
    expect(a).toEqual(b);
  });

  it('produces different streams for different seeds', () => {
    const a = generateLetterStream('seed-alpha');
    const b = generateLetterStream('seed-beta');
    expect(a).not.toEqual(b);
  });

  it('generates a non-empty stream', () => {
    expect(generateLetterStream('any-seed').length).toBeGreaterThan(0);
  });

  it('all letters are valid Turkish characters from the word list', () => {
    for (const entry of generateLetterStream('letter-check')) {
      expect(ALL_LETTERS.has(entry.letter)).toBe(true);
    }
  });

  it('letters are single characters', () => {
    for (const entry of generateLetterStream('length-check')) {
      expect(Array.from(entry.letter).length).toBe(1);
    }
  });

  it('spawn times are non-decreasing', () => {
    const stream = generateLetterStream('ordering-check');
    for (let i = 1; i < stream.length; i++) {
      expect(stream[i].spawnTime).toBeGreaterThanOrEqual(stream[i - 1].spawnTime);
    }
  });

  it('late spawns are faster than early spawns on average', () => {
    const stream = generateLetterStream('ramp-check');
    const earlyThreshold = MATCH_DURATION_MS * 0.2;
    const lateThreshold = MATCH_DURATION_MS * 0.7;
    const early = stream.filter(e => e.spawnTime < earlyThreshold);
    const late = stream.filter(e => e.spawnTime > lateThreshold);
    const avgEarly = early.reduce((s, e) => s + e.fallSpeed, 0) / Math.max(1, early.length);
    const avgLate = late.reduce((s, e) => s + e.fallSpeed, 0) / Math.max(1, late.length);
    expect(avgLate).toBeGreaterThan(avgEarly);
  });

  it('all tiles spawn before the spawn cutoff', () => {
    for (const entry of generateLetterStream('timing-check')) {
      expect(entry.spawnTime).toBeLessThan(MATCH_DURATION_MS - SPAWN_CUTOFF_BEFORE_END_MS);
    }
  });

  it('ids are unique', () => {
    const stream = generateLetterStream('unique-ids');
    const ids = stream.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('xPosition is within 0..1', () => {
    for (const entry of generateLetterStream('x-bounds')) {
      expect(entry.xPosition).toBeGreaterThanOrEqual(0);
      expect(entry.xPosition).toBeLessThanOrEqual(1);
    }
  });
});
