export type FlashcardReviewState = 'new' | 'learning' | 'review' | 'mastered';
export type FlashcardRating = 'again' | 'hard' | 'good' | 'easy';

export interface FlashcardDeck {
  id: string;
  name: string;
  description: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  source: 'manual' | 'question-bank' | 'mixed';
  folders?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  deckId: string;
  questionId?: string;

  front: string;
  back: string;

  tags: string[];

  reviewState: FlashcardReviewState;

  repetitions: number;
  correctStreak: number;

  easeFactor: number;
  interval: number;

  dueAt: string | null;
  lastReviewedAt: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface FlashcardReview {
  id: string;
  flashcardId: string;
  rating: FlashcardRating;
  previousInterval: number;
  newInterval: number;
  reviewedAt: string;
}
