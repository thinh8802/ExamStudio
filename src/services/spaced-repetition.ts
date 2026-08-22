import type { Flashcard, FlashcardRating } from '@/types';

/**
 * SuperMemo-2 (SM-2) algorithm variant for calculating spaced repetition intervals.
 */

// Lấy tham số theo độ khó: 
// again (1) -> hard (2) -> good (3) -> easy (4)
const RATING_VALUES: Record<FlashcardRating, number> = {
  again: 0, // Failed, restart
  hard: 3,  // Hard, long delay before knowing it well
  good: 4,  // Good, remembered
  easy: 5,  // Perfect response
};

export function calculateNextReview(
  rating: FlashcardRating,
  flashcard: Flashcard
): {
  interval: number;
  easeFactor: number;
  repetitions: number;
  dueAt: string;
} {
  let { repetitions, easeFactor, interval } = flashcard;
  const q = RATING_VALUES[rating];

  if (rating === 'again') {
    repetitions = 0;
    interval = 1; // 1 day for failed
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  
  if (easeFactor < 1.3) {
    easeFactor = 1.3; // minimum limit for EF
  }

  // Calculate next due date
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + interval);
  
  // Set time to end of day to make it due "that day" or start of day. 
  // Standard is exact time + interval days.
  const dueAt = now.toISOString();

  return {
    interval,
    easeFactor,
    repetitions,
    dueAt,
  };
}

// ============================================
// QUESTION SPACED REPETITION & PRIORITY SCORE
// ============================================
// Priority = (wrong_count * 3) + (is_bookmarked * 5) + DaysSinceLastAttempt - (consecutive_correct * 2)

export interface QuestionStats {
  wrongCount: number;
  correctCount: number;
  consecutiveCorrectCount: number;
  isBookmarked: boolean;
  lastAttemptedAt?: string | Date | null;
  attemptCount: number;
}

export function calculateQuestionPriority(stats: QuestionStats): number {
  const wrongWeight = (stats.wrongCount || 0) * 3;
  const bookmarkWeight = stats.isBookmarked ? 5 : 0;
  const consecutiveCorrectPenalty = (stats.consecutiveCorrectCount || 0) * 2;

  let daysSinceLastAttempt = 0;
  if (stats.lastAttemptedAt) {
    const lastDate = new Date(stats.lastAttemptedAt).getTime();
    const diffMs = Date.now() - lastDate;
    daysSinceLastAttempt = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  } else {
    // If never attempted, high priority for learning
    daysSinceLastAttempt = 10;
  }

  const priority = wrongWeight + bookmarkWeight + daysSinceLastAttempt - consecutiveCorrectPenalty;
  return Math.max(0, priority);
}

export type QuestionMasteryStatus = 'new' | 'learning' | 'needs_review' | 'mastered';

export function calculateMasteryStatus(stats: QuestionStats): {
  status: QuestionMasteryStatus;
  masteryScore: number;
} {
  if (stats.attemptCount === 0) {
    return { status: 'new', masteryScore: 0 };
  }

  const accuracy = stats.correctCount / Math.max(1, stats.attemptCount);
  const consecutive = stats.consecutiveCorrectCount || 0;

  // Calculate mastery score (0 - 100)
  const masteryScore = Math.min(
    100,
    Math.round(accuracy * 60 + Math.min(4, consecutive) * 10)
  );

  if (consecutive >= 3 && accuracy >= 0.8) {
    return { status: 'mastered', masteryScore };
  }
  if (stats.wrongCount > stats.correctCount || (stats.consecutiveCorrectCount === 0 && stats.attemptCount > 2)) {
    return { status: 'needs_review', masteryScore };
  }
  return { status: 'learning', masteryScore };
}

