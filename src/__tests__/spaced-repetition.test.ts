import { describe, it, expect } from 'vitest';
import { calculateNextReview } from '../services/spaced-repetition';
import type { Flashcard } from '@/types';

describe('Spaced Repetition Algorithm (SM-2 variant)', () => {
  const createBaseCard = (): Flashcard => ({
    id: 'test-card',
    deckId: 'deck-1',
    front: 'Question?',
    back: 'Answer',
    tags: [],
    reviewState: 'new',
    repetitions: 0,
    correctStreak: 0,
    easeFactor: 2.5,
    interval: 0,
    dueAt: new Date().toISOString(),
    lastReviewedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  it('should handle "again" rating by resetting repetitions and setting interval to 1', () => {
    const card = { ...createBaseCard(), repetitions: 5, interval: 14 };
    const result = calculateNextReview('again', card);

    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBeLessThan(2.5); // EF should decrease
  });

  it('should set interval to 1 on first "good" rating', () => {
    const card = createBaseCard();
    const result = calculateNextReview('good', card);

    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
  });

  it('should set interval to 6 on second "good" rating', () => {
    const card = { ...createBaseCard(), repetitions: 1, interval: 1 };
    const result = calculateNextReview('good', card);

    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(6);
  });

  it('should calculate interval correctly based on ease factor after multiple repetitions', () => {
    const card = { ...createBaseCard(), repetitions: 2, interval: 6, easeFactor: 2.5 };
    const result = calculateNextReview('good', card);

    expect(result.repetitions).toBe(3);
    // 6 * 2.5 = 15
    expect(result.interval).toBe(15);
  });

  it('should not allow ease factor to drop below 1.3', () => {
    const card = { ...createBaseCard(), repetitions: 2, interval: 6, easeFactor: 1.3 };
    // Rating 1 (again) will heavily penalize EF
    const result = calculateNextReview('again', card);

    expect(result.easeFactor).toBe(1.3);
  });
});
