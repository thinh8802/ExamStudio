// ============================================
// UNIT TESTS FOR SMART REVIEW ENGINE & PRIORITY TOGGLES (M2)
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../services/database';
import { selectQuestions } from '../services/randomization';
import type { Question, QuizConfig } from '../types';

describe('Smart Review Engine & Priority Toggles Unit Tests', () => {
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

  const baseQuestion: Omit<Question, 'id'> = {
    subjectId: 'sub-1',
    chapterId: 'chap-1',
    topicId: 'top-1',
    type: 'single_choice',
    difficulty: 'medium',
    content: 'Sample question content',
    answers: [
      { id: 'a1', label: 'A', content: 'Ans A', isCorrect: true },
      { id: 'a2', label: 'B', content: 'Ans B', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Explanation',
    tags: [],
    notes: '',
    source: '',
    imageUrl: '',
    status: 'new',
    attemptCount: 0,
    correctCount: 0,
    wrongCount: 0,
    consecutiveCorrectCount: 0,
    masteryScore: 0,
    lastAttemptedAt: null,
    isBookmarked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('1. Review mode returns [] when 0 questions have wrongCount > 0', async () => {
    mockQuestionPool = [
      { ...baseQuestion, id: 'q1', wrongCount: 0, status: 'new' },
      { ...baseQuestion, id: 'q2', wrongCount: 0, status: 'learning' },
      { ...baseQuestion, id: 'q3', wrongCount: 0, status: 'mastered' },
    ];

    const config: QuizConfig = {
      subjectId: 'sub-1',
      chapterIds: ['chap-1'],
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

  it('2. Review mode ONLY includes questions with wrongCount > 0 and status !== mastered', async () => {
    mockQuestionPool = [
      { ...baseQuestion, id: 'q-wrong-1', wrongCount: 2, status: 'needs_review' },
      { ...baseQuestion, id: 'q-wrong-2', wrongCount: 1, status: 'needs_review' },
      { ...baseQuestion, id: 'q-wrong-mastered', wrongCount: 3, status: 'mastered' },
      { ...baseQuestion, id: 'q-zero-wrong', wrongCount: 0, status: 'new' },
    ];

    const config: QuizConfig = {
      subjectId: 'sub-1',
      chapterIds: ['chap-1'],
      mode: 'review',
      questionCount: 10,
      timeLimit: 0,
      shuffleQuestions: false,
      shuffleAnswers: false,
      prioritizeWrong: false,
      prioritizeNew: false,
      prioritizeWeak: false,
      excludeMastered: false,
      difficulty: '',
      randomSeed: '',
    };

    const result = await selectQuestions(config);
    expect(result.length).toBe(2);
    const ids = result.map(q => q.id);
    expect(ids).toContain('q-wrong-1');
    expect(ids).toContain('q-wrong-2');
    expect(ids).not.toContain('q-wrong-mastered');
    expect(ids).not.toContain('q-zero-wrong');
  });

  it('3. prioritizeWrong places highest wrongCount questions first', async () => {
    mockQuestionPool = [
      { ...baseQuestion, id: 'q-w1', wrongCount: 1, status: 'needs_review' },
      { ...baseQuestion, id: 'q-w5', wrongCount: 5, status: 'needs_review' },
      { ...baseQuestion, id: 'q-w3', wrongCount: 3, status: 'needs_review' },
    ];

    const config: QuizConfig = {
      subjectId: 'sub-1',
      chapterIds: ['chap-1'],
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
    expect(result.map(q => q.id)).toEqual(['q-w5', 'q-w3', 'q-w1']);
  });

  it('4. prioritizeNew sorts by attemptCount ascending', async () => {
    mockQuestionPool = [
      { ...baseQuestion, id: 'q-att-10', attemptCount: 10, wrongCount: 0, status: 'learning' },
      { ...baseQuestion, id: 'q-att-0', attemptCount: 0, wrongCount: 0, status: 'new' },
      { ...baseQuestion, id: 'q-att-3', attemptCount: 3, wrongCount: 0, status: 'learning' },
    ];

    const config: QuizConfig = {
      subjectId: 'sub-1',
      chapterIds: ['chap-1'],
      mode: 'practice',
      questionCount: 10,
      timeLimit: 0,
      shuffleQuestions: false,
      shuffleAnswers: false,
      prioritizeWrong: false,
      prioritizeNew: true,
      prioritizeWeak: false,
      excludeMastered: false,
      difficulty: '',
      randomSeed: '',
    };

    const result = await selectQuestions(config);
    expect(result.map(q => q.id)).toEqual(['q-att-0', 'q-att-3', 'q-att-10']);
  });

  it('5. excludeMastered excludes status === mastered', async () => {
    mockQuestionPool = [
      { ...baseQuestion, id: 'q-m1', status: 'mastered' },
      { ...baseQuestion, id: 'q-n1', status: 'new' },
    ];

    const config: QuizConfig = {
      subjectId: 'sub-1',
      chapterIds: ['chap-1'],
      mode: 'practice',
      questionCount: 10,
      timeLimit: 0,
      shuffleQuestions: false,
      shuffleAnswers: false,
      prioritizeWrong: false,
      prioritizeNew: false,
      prioritizeWeak: false,
      excludeMastered: true,
      difficulty: '',
      randomSeed: '',
    };

    const result = await selectQuestions(config);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('q-n1');
  });

  it('6. Priority bucketed shuffle preserves relative order across different priority tiers', async () => {
    mockQuestionPool = [
      { ...baseQuestion, id: 'q-high-1', wrongCount: 10, status: 'needs_review' },
      { ...baseQuestion, id: 'q-high-2', wrongCount: 10, status: 'needs_review' },
      { ...baseQuestion, id: 'q-low-1', wrongCount: 1, status: 'needs_review' },
      { ...baseQuestion, id: 'q-low-2', wrongCount: 1, status: 'needs_review' },
    ];

    const config: QuizConfig = {
      subjectId: 'sub-1',
      chapterIds: ['chap-1'],
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
      randomSeed: 'test-seed',
    };

    const result = await selectQuestions(config);
    expect(result.length).toBe(4);
    const topTwoIds = [result[0].id, result[1].id];
    expect(topTwoIds).toContain('q-high-1');
    expect(topTwoIds).toContain('q-high-2');

    const bottomTwoIds = [result[2].id, result[3].id];
    expect(bottomTwoIds).toContain('q-low-1');
    expect(bottomTwoIds).toContain('q-low-2');
  });
});
