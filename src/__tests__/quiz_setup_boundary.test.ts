// ============================================
// EMPIRICAL TEST SUITE FOR QUIZ SETUP PAGE (M1)
// Boundary conditions & state change stress test
// ============================================

import { describe, test, expect } from 'vitest';
import type { Question, Subject, Chapter, QuizConfig, Difficulty } from '../types';

// Helper function replicating QuizSetupPage's availableCount logic
function computeAvailableCount(
  questions: Question[],
  subjectId: string,
  chapterIds: string[],
  mode: QuizConfig['mode'],
  difficulty: Difficulty | '',
  excludeMastered: boolean
): number {
  if (!subjectId || chapterIds.length === 0) return 0;

  let qs = questions.filter(q => q.subjectId === subjectId && chapterIds.includes(q.chapterId));

  if (mode === 'review' || mode === 'smart_wrong') {
    qs = qs.filter(q => (q.wrongCount ?? 0) > 0 && q.status !== 'mastered');
  }
  if (difficulty) {
    qs = qs.filter(q => q.difficulty === difficulty);
  }
  if (excludeMastered) {
    qs = qs.filter(q => q.status !== 'mastered');
  }
  return qs.length;
}

// Mock question generator
function createMockQuestions(count: number, options: Partial<Question> = {}): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q-${i + 1}`,
    subjectId: 'sub-1',
    chapterId: `chap-${(i % 5) + 1}`,
    content: `Question ${i + 1}`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
    difficulty: (['easy', 'medium', 'hard', 'very_hard'][i % 4]) as Difficulty,
    wrongCount: options.wrongCount ?? 0,
    correctCount: options.correctCount ?? 0,
    attemptCount: options.attemptCount ?? 0,
    status: options.status ?? 'unattempted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date(),
    ...options,
  })) as any;
}

describe('QuizSetupPage Boundary & Logic Verification', () => {
  const mockSubjectId = 'sub-1';
  const mockChapterIds = ['chap-1', 'chap-2', 'chap-3', 'chap-4', 'chap-5'];

  test('1. Boundary Condition: 0 questions available in database', () => {
    const questions: Question[] = [];
    const count = computeAvailableCount(questions, mockSubjectId, mockChapterIds, 'practice', '', false);
    expect(count).toBe(0);
  });

  test('2. Boundary Condition: 1000 questions available in database', () => {
    const questions = createMockQuestions(1000);
    const count = computeAvailableCount(questions, mockSubjectId, mockChapterIds, 'practice', '', false);
    expect(count).toBe(1000);
  });

  test('3. Boundary Condition: 0 chapters selected', () => {
    const questions = createMockQuestions(100);
    const count = computeAvailableCount(questions, mockSubjectId, [], 'practice', '', false);
    expect(count).toBe(0);
  });

  test('4. Boundary Condition: All chapters selected vs Partial chapters selected', () => {
    const questions = createMockQuestions(100); // 20 per chapter (5 chapters)
    const allCount = computeAvailableCount(questions, mockSubjectId, mockChapterIds, 'practice', '', false);
    expect(allCount).toBe(100);

    const partialCount = computeAvailableCount(questions, mockSubjectId, ['chap-1', 'chap-2'], 'practice', '', false);
    expect(partialCount).toBe(40);
  });

  test('5. Review Mode: 0 wrong/needs_review questions', () => {
    const questions = createMockQuestions(50, { wrongCount: 0, status: 'unattempted' });
    const reviewCount = computeAvailableCount(questions, mockSubjectId, mockChapterIds, 'review', '', false);
    expect(reviewCount).toBe(0);
  });

  test('6. Review Mode: Some wrong questions available', () => {
    const questions = [
      ...createMockQuestions(10, { wrongCount: 2, status: 'needs_review' }),
      ...createMockQuestions(40, { wrongCount: 0, status: 'unattempted' }),
    ];
    const reviewCount = computeAvailableCount(questions, mockSubjectId, mockChapterIds, 'review', '', false);
    expect(reviewCount).toBe(10);
  });

  test('7. Exclude Mastered Filter in Review Mode', () => {
    const questions = [
      ...createMockQuestions(5, { wrongCount: 1, status: 'needs_review' }),
      ...createMockQuestions(5, { wrongCount: 2, status: 'mastered' }),
    ];
    const withMastered = computeAvailableCount(questions, mockSubjectId, mockChapterIds, 'review', '', false);
    expect(withMastered).toBe(5);

    const withoutMastered = computeAvailableCount(questions, mockSubjectId, mockChapterIds, 'review', '', true);
    expect(withoutMastered).toBe(5);
  });

  test('8. Difficulty Filter Boundary', () => {
    const questions = createMockQuestions(100); // 25 per difficulty
    const easyCount = computeAvailableCount(questions, mockSubjectId, mockChapterIds, 'practice', 'easy', false);
    expect(easyCount).toBe(25);
  });
});
