// ============================================
// EMPIRICAL STRESS TEST SUITE - CHALLENGER M2
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../services/database';
import { selectQuestions } from '../services/randomization';
import type { Question, QuizConfig } from '../types';

describe('Empirical Challenger M2: Smart Review Engine & Priority Toggles', () => {
  let mockQuestionPool: Question[] = [];

  beforeEach(() => {
    mockQuestionPool = [];
    vi.restoreAllMocks();

    vi.spyOn(db.questions, 'where').mockImplementation(((field: string) => {
      return {
        anyOf: (values: string[]) => ({
          toArray: async () => mockQuestionPool.filter(q => values.includes((q as any)[field])),
        }),
        equals: (value: string) => ({
          toArray: async () => mockQuestionPool.filter(q => (q as any)[field] === value),
        }),
      } as any;
    }) as any);

    vi.spyOn(db.questions, 'toArray').mockImplementation((async () => mockQuestionPool) as any);
  });

  const makeQuestion = (id: string, wrongCount: number, status: Question['status'] = 'needs_review', attemptCount = 1): Question => ({
    id,
    subjectId: 'sub-test',
    chapterId: 'chap-test',
    topicId: 'top-test',
    type: 'single_choice',
    difficulty: 'medium',
    content: `Question ${id}`,
    answers: [
      { id: 'a1', label: 'A', content: 'Option A', isCorrect: true },
      { id: 'a2', label: 'B', content: 'Option B', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Explanation',
    tags: [],
    notes: '',
    source: '',
    imageUrl: '',
    status,
    attemptCount,
    correctCount: 0,
    wrongCount,
    consecutiveCorrectCount: 0,
    masteryScore: 0,
    lastAttemptedAt: null,
    isBookmarked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // -------------------------------------------------------------
  // REQUIREMENT 1: Selecting "Review Mode" with 0 wrong questions
  // -------------------------------------------------------------
  describe('Requirement 1: Review Mode with 0 wrong questions returns exact []', () => {
    it('returns exact empty array [] when pool contains only wrongCount === 0 questions', async () => {
      mockQuestionPool = [
        makeQuestion('q1', 0, 'new'),
        makeQuestion('q2', 0, 'learning'),
        makeQuestion('q3', 0, 'unattempted' as any),
      ];

      const config: QuizConfig = {
        subjectId: 'sub-test',
        chapterIds: ['chap-test'],
        mode: 'review',
        questionCount: 10,
        timeLimit: 0,
        shuffleQuestions: false,
        shuffleAnswers: false,
        prioritizeWrong: true,
        prioritizeNew: false,
        prioritizeWeak: false,
        excludeMastered: false,
        difficulty: '',
        randomSeed: '',
      };

      const result = await selectQuestions(config);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('returns exact empty array [] when database is completely empty', async () => {
      mockQuestionPool = [];

      const config: QuizConfig = {
        subjectId: 'sub-test',
        chapterIds: ['chap-test'],
        mode: 'review',
        questionCount: 10,
        timeLimit: 0,
        shuffleQuestions: true,
        shuffleAnswers: true,
        prioritizeWrong: true,
        prioritizeNew: true,
        prioritizeWeak: true,
        excludeMastered: true,
        difficulty: '',
        randomSeed: '',
      };

      const result = await selectQuestions(config);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('returns exact empty array [] when all wrong questions are mastered', async () => {
      mockQuestionPool = [
        makeQuestion('q-m1', 5, 'mastered'),
        makeQuestion('q-m2', 10, 'mastered'),
      ];

      const config: QuizConfig = {
        subjectId: 'sub-test',
        chapterIds: ['chap-test'],
        mode: 'review',
        questionCount: 10,
        timeLimit: 0,
        shuffleQuestions: false,
        shuffleAnswers: false,
        prioritizeWrong: true,
        prioritizeNew: false,
        prioritizeWeak: false,
        excludeMastered: false,
        difficulty: '',
        randomSeed: '',
      };

      const result = await selectQuestions(config);
      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------
  // REQUIREMENT 2: prioritizeWrong places highest wrongCount first
  // -------------------------------------------------------------
  describe('Requirement 2: prioritizeWrong places highest wrongCount at the beginning', () => {
    it('orders questions in strictly descending order of wrongCount without shuffle', async () => {
      mockQuestionPool = [
        makeQuestion('q-w1', 1),
        makeQuestion('q-w10', 10),
        makeQuestion('q-w3', 3),
        makeQuestion('q-w7', 7),
        makeQuestion('q-w5', 5),
      ];

      const config: QuizConfig = {
        subjectId: 'sub-test',
        chapterIds: ['chap-test'],
        mode: 'review',
        questionCount: 10,
        timeLimit: 0,
        shuffleQuestions: false,
        shuffleAnswers: false,
        prioritizeWrong: true,
        prioritizeNew: false,
        prioritizeWeak: false,
        excludeMastered: false,
        difficulty: '',
        randomSeed: '',
      };

      const result = await selectQuestions(config);
      const wrongCounts = result.map(q => q.wrongCount);
      expect(wrongCounts).toEqual([10, 7, 5, 3, 1]);
      expect(result[0].id).toBe('q-w10');
    });

    it('preserves priority order across wrongCount tiers when shuffleQuestions is true', async () => {
      mockQuestionPool = [
        makeQuestion('q-tier1-a', 20),
        makeQuestion('q-tier1-b', 20),
        makeQuestion('q-tier2-a', 10),
        makeQuestion('q-tier2-b', 10),
        makeQuestion('q-tier3-a', 2),
        makeQuestion('q-tier3-b', 2),
      ];

      const config: QuizConfig = {
        subjectId: 'sub-test',
        chapterIds: ['chap-test'],
        mode: 'review',
        questionCount: 10,
        timeLimit: 0,
        shuffleQuestions: true,
        shuffleAnswers: false,
        prioritizeWrong: true,
        prioritizeNew: false,
        prioritizeWeak: false,
        excludeMastered: false,
        difficulty: '',
        randomSeed: 'empirical-seed-123',
      };

      const result = await selectQuestions(config);
      expect(result.length).toBe(6);

      // Verify tier 1 (wrongCount 20) comes first
      expect(result[0].wrongCount).toBe(20);
      expect(result[1].wrongCount).toBe(20);

      // Verify tier 2 (wrongCount 10) comes second
      expect(result[2].wrongCount).toBe(10);
      expect(result[3].wrongCount).toBe(10);

      // Verify tier 3 (wrongCount 2) comes last
      expect(result[4].wrongCount).toBe(2);
      expect(result[5].wrongCount).toBe(2);
    });

    it('stress test: 50 randomized questions with prioritizeWrong always maintains non-increasing wrongCount order', async () => {
      mockQuestionPool = Array.from({ length: 50 }, (_, i) =>
        makeQuestion(`q-${i}`, Math.floor(Math.random() * 50) + 1, 'needs_review')
      );

      const config: QuizConfig = {
        subjectId: 'sub-test',
        chapterIds: ['chap-test'],
        mode: 'review',
        questionCount: 50,
        timeLimit: 0,
        shuffleQuestions: true,
        shuffleAnswers: false,
        prioritizeWrong: true,
        prioritizeNew: false,
        prioritizeWeak: false,
        excludeMastered: false,
        difficulty: '',
        randomSeed: 'stress-seed-999',
      };

      const result = await selectQuestions(config);
      expect(result.length).toBe(50);

      for (let i = 0; i < result.length - 1; i++) {
        const currentWrong = result[i].wrongCount ?? 0;
        const nextWrong = result[i + 1].wrongCount ?? 0;
        expect(currentWrong).toBeGreaterThanOrEqual(nextWrong);
      }
    });
  });

  // -------------------------------------------------------------
  // REQUIREMENT 3: Never includes question with wrongCount === 0
  // -------------------------------------------------------------
  describe('Requirement 3: Never includes question with wrongCount === 0 in Review Mode', () => {
    it('filters out all questions with wrongCount === 0 from mixed candidate pool', async () => {
      mockQuestionPool = [
        makeQuestion('q-zero-1', 0, 'new'),
        makeQuestion('q-zero-2', 0, 'learning'),
        makeQuestion('q-wrong-1', 1, 'needs_review'),
        makeQuestion('q-zero-3', 0, 'needs_review'),
        makeQuestion('q-wrong-2', 5, 'needs_review'),
        makeQuestion('q-zero-4', 0, 'unattempted' as any),
      ];

      const config: QuizConfig = {
        subjectId: 'sub-test',
        chapterIds: ['chap-test'],
        mode: 'review',
        questionCount: 10,
        timeLimit: 0,
        shuffleQuestions: false,
        shuffleAnswers: false,
        prioritizeWrong: true,
        prioritizeNew: false,
        prioritizeWeak: false,
        excludeMastered: false,
        difficulty: '',
        randomSeed: '',
      };

      const result = await selectQuestions(config);
      expect(result.length).toBe(2);

      const zeroWrongCountItems = result.filter(q => (q.wrongCount ?? 0) === 0);
      expect(zeroWrongCountItems).toEqual([]);

      for (const q of result) {
        expect(q.wrongCount).toBeGreaterThan(0);
      }
    });

    it('filters out questions where wrongCount is undefined or null', async () => {
      const qUndefined = makeQuestion('q-undef', 0);
      delete (qUndefined as any).wrongCount;

      const qNull = makeQuestion('q-null', 0);
      (qNull as any).wrongCount = null;

      const qValid = makeQuestion('q-valid', 3);

      mockQuestionPool = [qUndefined, qNull, qValid];

      const config: QuizConfig = {
        subjectId: 'sub-test',
        chapterIds: ['chap-test'],
        mode: 'review',
        questionCount: 10,
        timeLimit: 0,
        shuffleQuestions: false,
        shuffleAnswers: false,
        prioritizeWrong: true,
        prioritizeNew: false,
        prioritizeWeak: false,
        excludeMastered: false,
        difficulty: '',
        randomSeed: '',
      };

      const result = await selectQuestions(config);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('q-valid');
    });

    it('works identically when mode is smart_wrong', async () => {
      mockQuestionPool = [
        makeQuestion('q-zero', 0, 'new'),
        makeQuestion('q-wrong', 4, 'needs_review'),
      ];

      const config: QuizConfig = {
        subjectId: 'sub-test',
        chapterIds: ['chap-test'],
        mode: 'smart_wrong' as any,
        questionCount: 10,
        timeLimit: 0,
        shuffleQuestions: false,
        shuffleAnswers: false,
        prioritizeWrong: true,
        prioritizeNew: false,
        prioritizeWeak: false,
        excludeMastered: false,
        difficulty: '',
        randomSeed: '',
      };

      const result = await selectQuestions(config);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('q-wrong');
      expect(result[0].wrongCount).toBe(4);
    });
  });
});
