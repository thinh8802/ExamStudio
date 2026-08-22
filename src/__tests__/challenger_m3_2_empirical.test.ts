// ============================================
// EMPIRICAL TEST SUITE - CHALLENGER 2 FOR MILESTONE 3
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../services/database';
import { selectQuestions } from '../services/randomization';
import { useExamStore } from '../stores/exam-store';
import { useQuestionStore } from '../stores/question-store';
import type { Question, QuizConfig, Attempt } from '../types';

describe('Challenger 2 Empirical Verification - Milestone 3', () => {
  let mockQuestionPool: Question[] = [];
  let mockAttemptsPool: Attempt[] = [];

  const baseQuestion: Question = {
    id: 'q-m3-1',
    subjectId: 'sub-m3',
    chapterId: 'chap-m3',
    topicId: 'top-m3',
    type: 'single_choice',
    difficulty: 'medium',
    content: 'M3 Test Question',
    answers: [
      { id: 'a1', label: 'A', content: 'Correct', isCorrect: true },
      { id: 'a2', label: 'B', content: 'Wrong', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: '',
    tags: [],
    notes: '',
    source: '',
    imageUrl: '',
    status: 'needs_review',
    attemptCount: 3,
    correctCount: 1,
    wrongCount: 2,
    consecutiveCorrectCount: 1,
    masteryScore: 33,
    lastAttemptedAt: new Date(),
    isBookmarked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockQuestionPool = [];
    mockAttemptsPool = [];
    vi.restoreAllMocks();

    vi.spyOn(db.questions as any, 'where').mockImplementation((field: any) => {
      return {
        anyOf: (values: string[]) => ({
          toArray: async () => mockQuestionPool.filter(q => values.includes((q as any)[field])),
        }),
        equals: (value: string) => ({
          toArray: async () => mockQuestionPool.filter(q => (q as any)[field] === value),
        }),
      } as any;
    });

    vi.spyOn(db.questions as any, 'toArray').mockImplementation(async () => [...mockQuestionPool]);
    vi.spyOn(db.questions as any, 'orderBy').mockImplementation(() => ({
      reverse: () => ({
        toArray: async () => [...mockQuestionPool],
      }),
    }) as any);

    vi.spyOn(db.questions as any, 'update').mockImplementation(async (id: any, changes: any) => {
      const q = mockQuestionPool.find(item => item.id === id);
      if (q) {
        Object.assign(q, changes);
      }
      return 1;
    });

    vi.spyOn(db.attempts as any, 'add').mockImplementation(async (attempt: any) => {
      mockAttemptsPool.push(attempt);
      return attempt.id;
    });

    vi.spyOn(db as any, 'transaction').mockImplementation(async (mode: any, tables: any, cb: any) => {
      return cb();
    });

    useQuestionStore.setState({
      loadQuestions: vi.fn().mockImplementation(async () => {
        useQuestionStore.setState({ questions: [...mockQuestionPool] });
      }),
    });
  });

  it('Verification 1: Answering incorrectly resets consecutiveCorrectCount to 0, increments wrongCount, sets status to needs_review, and keeps question in review pool', async () => {
    const q1: Question = {
      ...baseQuestion,
      id: 'q-streak-reset-1',
      consecutiveCorrectCount: 5,
      wrongCount: 2,
      attemptCount: 7,
      correctCount: 5,
      status: 'learning',
    };
    mockQuestionPool = [q1];

    useExamStore.setState({
      currentAttempt: {
        id: 'att-incorrect-1',
        examId: '',
        examName: 'Review Session',
        mode: 'review',
        subjectId: 'sub-m3',
        chapterIds: ['chap-m3'],
        questionIds: ['q-streak-reset-1'],
        answers: [
          { questionId: 'q-streak-reset-1', selectedAnswer: 'B', isCorrect: false, timeSpent: 10, isMarked: false }
        ],
        totalQuestions: 1,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 1,
        score: 0,
        percentage: 0,
        timeSpent: 10,
        timeLimit: 0,
        isCompleted: false,
        currentIndex: 0,
        shuffledQuestionIds: ['q-streak-reset-1'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [q1],
      elapsedTime: 10,
    });

    await useExamStore.getState().submitQuiz();

    // 1. Verify consecutiveCorrectCount reset to 0
    expect(q1.consecutiveCorrectCount).toBe(0);

    // 2. Verify wrongCount incremented by 1 (2 -> 3)
    expect(q1.wrongCount).toBe(3);

    // 3. Verify attemptCount incremented by 1 (7 -> 8)
    expect(q1.attemptCount).toBe(8);

    // 4. Verify status updated to 'needs_review'
    expect(q1.status).toBe('needs_review');

    // 5. Verify question remains in review pool (wrongCount > 0 && status !== 'mastered')
    const reviewConfig: QuizConfig = {
      subjectId: 'sub-m3',
      chapterIds: ['chap-m3'],
      mode: 'review',
      questionCount: 10,
      timeLimit: 0,
      shuffleQuestions: false,
      shuffleAnswers: false,
      prioritizeWrong: true,
      prioritizeNew: false,
      prioritizeWeak: false,
      excludeMastered: true,
      difficulty: '',
      randomSeed: '',
    };

    const reviewQuestions = await selectQuestions(reviewConfig);
    expect(reviewQuestions.map(q => q.id)).toContain('q-streak-reset-1');
  });

  it('Verification 1b: Demoting a previously mastered question on incorrect answer resets streak to 0 and re-enters review pool', async () => {
    const qMastered: Question = {
      ...baseQuestion,
      id: 'q-demote-mastered',
      consecutiveCorrectCount: 3,
      wrongCount: 1,
      attemptCount: 10,
      correctCount: 9,
      status: 'mastered',
    };
    mockQuestionPool = [qMastered];

    useExamStore.setState({
      currentAttempt: {
        id: 'att-demote',
        examId: '',
        examName: 'Practice Session',
        mode: 'practice',
        subjectId: 'sub-m3',
        chapterIds: ['chap-m3'],
        questionIds: ['q-demote-mastered'],
        answers: [
          { questionId: 'q-demote-mastered', selectedAnswer: 'B', isCorrect: false, timeSpent: 12, isMarked: false }
        ],
        totalQuestions: 1,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 1,
        score: 0,
        percentage: 0,
        timeSpent: 12,
        timeLimit: 0,
        isCompleted: false,
        currentIndex: 0,
        shuffledQuestionIds: ['q-demote-mastered'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [qMastered],
      elapsedTime: 12,
    });

    await useExamStore.getState().submitQuiz();

    expect(qMastered.consecutiveCorrectCount).toBe(0);
    expect(qMastered.wrongCount).toBe(2);
    expect(qMastered.status).toBe('needs_review');

    // Re-check review pool eligibility
    const reviewConfig: QuizConfig = {
      subjectId: 'sub-m3',
      chapterIds: ['chap-m3'],
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
    const reviewQuestions = await selectQuestions(reviewConfig);
    expect(reviewQuestions.map(q => q.id)).toContain('q-demote-mastered');
  });

  it('Verification 2a: Atomic Dexie transaction executes attempts.add and questions.update atomically on success', async () => {
    const qAtomic: Question = {
      ...baseQuestion,
      id: 'q-atomic-success',
      consecutiveCorrectCount: 0,
      wrongCount: 0,
      status: 'learning',
    };
    mockQuestionPool = [qAtomic];

    useExamStore.setState({
      currentAttempt: {
        id: 'att-atomic-1',
        examId: '',
        examName: 'Atomic Session',
        mode: 'practice',
        subjectId: 'sub-m3',
        chapterIds: ['chap-m3'],
        questionIds: ['q-atomic-success'],
        answers: [
          { questionId: 'q-atomic-success', selectedAnswer: 'A', isCorrect: true, timeSpent: 5, isMarked: false }
        ],
        totalQuestions: 1,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 1,
        score: 0,
        percentage: 0,
        timeSpent: 5,
        timeLimit: 0,
        isCompleted: false,
        currentIndex: 0,
        shuffledQuestionIds: ['q-atomic-success'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [qAtomic],
      elapsedTime: 5,
    });

    const resultAttempt = await useExamStore.getState().submitQuiz();

    // Verify transaction wrapping
    expect(db.transaction).toHaveBeenCalledWith('rw', [db.questions, db.attempts], expect.any(Function));
    expect(db.attempts.add).toHaveBeenCalledTimes(1);
    expect(db.questions.update).toHaveBeenCalledWith('q-atomic-success', expect.objectContaining({
      consecutiveCorrectCount: 1,
      attemptCount: 4,
      correctCount: 2,
    }));
    expect(resultAttempt.isCompleted).toBe(true);
  });

  it('Verification 2b: Transaction failure is cleanly caught and rejects Promise without unhandled rejection', async () => {
    const qFail: Question = { ...baseQuestion, id: 'q-atomic-fail' };
    mockQuestionPool = [qFail];

    // Force db.transaction to reject with an error (simulating IndexedDB transaction abort/quota error)
    const transactionError = new Error('IndexedDB Transaction Failed: QuotaExceededError');
    vi.spyOn(db, 'transaction').mockRejectedValueOnce(transactionError);

    useExamStore.setState({
      currentAttempt: {
        id: 'att-atomic-fail',
        examId: '',
        examName: 'Failed Atomic Session',
        mode: 'practice',
        subjectId: 'sub-m3',
        chapterIds: ['chap-m3'],
        questionIds: ['q-atomic-fail'],
        answers: [
          { questionId: 'q-atomic-fail', selectedAnswer: 'A', isCorrect: true, timeSpent: 5, isMarked: false }
        ],
        totalQuestions: 1,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 1,
        score: 0,
        percentage: 0,
        timeSpent: 5,
        timeLimit: 0,
        isCompleted: false,
        currentIndex: 0,
        shuffledQuestionIds: ['q-atomic-fail'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [qFail],
      elapsedTime: 5,
    });

    // Submitting quiz should return a rejected promise that can be cleanly caught with rejects.toThrow
    await expect(useExamStore.getState().submitQuiz()).rejects.toThrow('IndexedDB Transaction Failed: QuotaExceededError');
  });
});
