// ============================================
// EMPIRICAL STRESS TEST FOR MILESTONE 3
// Progress Tracking, Dexie Persistence & Mastery
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useExamStore } from '../stores/exam-store';
import { useQuestionStore } from '../stores/question-store';
import { db } from '../services/database';
import { selectQuestions } from '../services/randomization';
import type { Question, Attempt, QuizConfig } from '../types';

describe('Challenger M3: Empirical Stress Harness for Mastery & Dexie Persistence', () => {
  let mockQuestions: Question[] = [];
  let mockAttempts: Attempt[] = [];

  beforeEach(() => {
    mockQuestions = [
      {
        id: 'q-m3-1',
        subjectId: 'sub-1',
        chapterId: 'chap-1',
        topicId: 'top-1',
        type: 'single_choice',
        difficulty: 'medium',
        content: 'Challenger Question 1',
        answers: [
          { id: 'a1', label: 'A', content: 'Ans A', isCorrect: true },
          { id: 'a2', label: 'B', content: 'Ans B', isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: '',
        tags: [],
        notes: '',
        source: '',
        imageUrl: '',
        status: 'needs_review',
        attemptCount: 3,
        correctCount: 0,
        wrongCount: 3,
        consecutiveCorrectCount: 0,
        masteryScore: 0,
        lastAttemptedAt: null,
        isBookmarked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'q-m3-2',
        subjectId: 'sub-1',
        chapterId: 'chap-1',
        topicId: 'top-1',
        type: 'single_choice',
        difficulty: 'hard',
        content: 'Challenger Question 2 (Mastered)',
        answers: [
          { id: 'a1', label: 'A', content: 'Ans A', isCorrect: true },
          { id: 'a2', label: 'B', content: 'Ans B', isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: '',
        tags: [],
        notes: '',
        source: '',
        imageUrl: '',
        status: 'mastered',
        attemptCount: 5,
        correctCount: 4,
        wrongCount: 1,
        consecutiveCorrectCount: 2,
        masteryScore: 80,
        lastAttemptedAt: null,
        isBookmarked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'q-m3-3',
        subjectId: 'sub-1',
        chapterId: 'chap-1',
        topicId: 'top-1',
        type: 'single_choice',
        difficulty: 'easy',
        content: 'Challenger Question 3 (Learning)',
        answers: [
          { id: 'a1', label: 'A', content: 'Ans A', isCorrect: true },
          { id: 'a2', label: 'B', content: 'Ans B', isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: '',
        tags: [],
        notes: '',
        source: '',
        imageUrl: '',
        status: 'learning',
        attemptCount: 2,
        correctCount: 1,
        wrongCount: 1,
        consecutiveCorrectCount: 1,
        masteryScore: 50,
        lastAttemptedAt: null,
        isBookmarked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockAttempts = [];

    vi.restoreAllMocks();

    // Mock db.attempts.add
    vi.spyOn(db.attempts, 'add').mockImplementation((async (attempt: any) => {
      mockAttempts.push(attempt);
      return attempt.id;
    }) as any);

    // Mock db.questions.update
    vi.spyOn(db.questions, 'update').mockImplementation((async (id: string, changes: any) => {
      const q = mockQuestions.find(item => item.id === id);
      if (q) {
        Object.assign(q, changes);
      }
      return 1;
    }) as any);

    // Mock db.transaction to execute callback immediately
    vi.spyOn(db, 'transaction').mockImplementation((async (mode: any, tables: any, cb: any) => {
      return cb();
    }) as any);

    // Mock db queries
    vi.spyOn(db.questions, 'orderBy').mockImplementation((() => ({
      reverse: () => ({
        toArray: async () => [...mockQuestions],
      }),
    })) as any);

    vi.spyOn(db.questions, 'toArray').mockImplementation((async () => [...mockQuestions]) as any);

    vi.spyOn(db.questions, 'where').mockImplementation(((field: string) => {
      return {
        anyOf: (values: string[]) => ({
          toArray: async () => mockQuestions.filter(q => values.includes((q as any)[field])),
        }),
        equals: (value: string) => ({
          toArray: async () => mockQuestions.filter(q => (q as any)[field] === value),
        }),
      } as any;
    }) as any);

    // Reset stores
    useExamStore.setState({
      currentAttempt: null,
      currentQuestions: [],
      currentIndex: 0,
      elapsedTime: 0,
      isSubmitting: false,
      isPaused: false,
      hasUnfinishedAttempt: false,
    });
    useQuestionStore.setState({
      questions: [...mockQuestions],
      filteredQuestions: [...mockQuestions],
      selectedIds: new Set(),
      loading: false,
      totalCount: mockQuestions.length,
    });
  });

  it('Verification Requirement 1: Answering a previously wrong question correctly 2 times consecutively changes its status to mastered', async () => {
    const q1 = mockQuestions.find(q => q.id === 'q-m3-1')!;
    expect(q1.status).toBe('needs_review');
    expect(q1.consecutiveCorrectCount).toBe(0);
    expect(q1.wrongCount).toBe(3);

    // 1st Correct Answer
    useExamStore.setState({
      currentAttempt: {
        id: 'att-m3-run1',
        examId: '',
        examName: 'Empirical Test Run 1',
        mode: 'review',
        subjectId: 'sub-1',
        chapterIds: ['chap-1'],
        questionIds: ['q-m3-1'],
        answers: [{ questionId: 'q-m3-1', selectedAnswer: 'A', isCorrect: true, timeSpent: 5, isMarked: false }],
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
        shuffledQuestionIds: ['q-m3-1'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [q1],
      elapsedTime: 5,
    });

    await useExamStore.getState().submitQuiz();

    // After 1st correct answer: streak = 1, status = 'learning'
    expect(q1.attemptCount).toBe(4);
    expect(q1.correctCount).toBe(1);
    expect(q1.wrongCount).toBe(3);
    expect(q1.consecutiveCorrectCount).toBe(1);
    expect(q1.status).toBe('learning');

    // 2nd Consecutive Correct Answer
    useExamStore.setState({
      currentAttempt: {
        id: 'att-m3-run2',
        examId: '',
        examName: 'Empirical Test Run 2',
        mode: 'review',
        subjectId: 'sub-1',
        chapterIds: ['chap-1'],
        questionIds: ['q-m3-1'],
        answers: [{ questionId: 'q-m3-1', selectedAnswer: 'A', isCorrect: true, timeSpent: 6, isMarked: false }],
        totalQuestions: 1,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 1,
        score: 0,
        percentage: 0,
        timeSpent: 6,
        timeLimit: 0,
        isCompleted: false,
        currentIndex: 0,
        shuffledQuestionIds: ['q-m3-1'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [q1],
      elapsedTime: 6,
    });

    await useExamStore.getState().submitQuiz();

    // After 2nd consecutive correct answer: streak = 2, status = 'mastered'
    expect(q1.attemptCount).toBe(5);
    expect(q1.correctCount).toBe(2);
    expect(q1.wrongCount).toBe(3);
    expect(q1.consecutiveCorrectCount).toBe(2);
    expect(q1.status).toBe('mastered');
  });

  it('Verification Requirement 2: Generating a Review Quiz with "Loại bỏ câu đã thành thạo" enabled successfully excludes all mastered questions', async () => {
    // mockQuestions has q-m3-1 (needs_review), q-m3-2 (mastered), q-m3-3 (learning with wrongCount=1)
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
      excludeMastered: true,
      difficulty: '',
      randomSeed: '',
    };

    const reviewQuestions = await selectQuestions(config);
    const resultIds = reviewQuestions.map(q => q.id);

    // q-m3-2 has status='mastered', so it MUST be excluded
    expect(resultIds).not.toContain('q-m3-2');
    // q-m3-1 (needs_review) and q-m3-3 (learning) have wrongCount > 0 and are not mastered, so they should be present
    expect(resultIds).toContain('q-m3-1');
    expect(resultIds).toContain('q-m3-3');
    expect(reviewQuestions.every(q => q.status !== 'mastered')).toBe(true);
  });

  it('Verification Requirement 3: Simulating app restart preserves wrongCount, consecutiveCorrectCount, and status in Dexie DB', async () => {
    const q1 = mockQuestions.find(q => q.id === 'q-m3-1')!;
    q1.consecutiveCorrectCount = 1;
    q1.wrongCount = 3;
    q1.status = 'learning';

    // Submit quiz to achieve mastery and update Dexie DB via transaction
    useExamStore.setState({
      currentAttempt: {
        id: 'att-m3-restart',
        examId: '',
        examName: 'Persistence Test',
        mode: 'review',
        subjectId: 'sub-1',
        chapterIds: ['chap-1'],
        questionIds: ['q-m3-1'],
        answers: [{ questionId: 'q-m3-1', selectedAnswer: 'A', isCorrect: true, timeSpent: 4, isMarked: false }],
        totalQuestions: 1,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 1,
        score: 0,
        percentage: 0,
        timeSpent: 4,
        timeLimit: 0,
        isCompleted: false,
        currentIndex: 0,
        shuffledQuestionIds: ['q-m3-1'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [q1],
      elapsedTime: 4,
    });

    await useExamStore.getState().submitQuiz();

    // Verify Dexie db update was triggered with correct payload
    expect(db.transaction).toHaveBeenCalledWith('rw', [db.questions, db.attempts], expect.any(Function));
    expect(db.questions.update).toHaveBeenCalledWith('q-m3-1', expect.objectContaining({
      wrongCount: 3,
      consecutiveCorrectCount: 2,
      status: 'mastered',
    }));

    // SIMULATE APP RESTART: Purge all state from memory
    useExamStore.setState({
      currentAttempt: null,
      currentQuestions: [],
      currentIndex: 0,
      elapsedTime: 0,
    });
    useQuestionStore.setState({
      questions: [],
      filteredQuestions: [],
      selectedIds: new Set(),
      loading: false,
      totalCount: 0,
    });

    // App reloads questions from Dexie DB on boot
    await useQuestionStore.getState().loadQuestions();
    const reloaded = useQuestionStore.getState().questions;

    const reloadedQ1 = reloaded.find(q => q.id === 'q-m3-1');
    expect(reloadedQ1).toBeDefined();
    expect(reloadedQ1?.wrongCount).toBe(3);
    expect(reloadedQ1?.consecutiveCorrectCount).toBe(2);
    expect(reloadedQ1?.status).toBe('mastered');
  });

  it('Verification Bonus: Incorrect answer resets streak to 0 and updates status to needs_review', async () => {
    const q3 = mockQuestions.find(q => q.id === 'q-m3-3')!; // consecutiveCorrectCount=1, status='learning'
    expect(q3.consecutiveCorrectCount).toBe(1);

    // Submit wrong answer
    useExamStore.setState({
      currentAttempt: {
        id: 'att-m3-wrong',
        examId: '',
        examName: 'Wrong Answer Test',
        mode: 'review',
        subjectId: 'sub-1',
        chapterIds: ['chap-1'],
        questionIds: ['q-m3-3'],
        answers: [{ questionId: 'q-m3-3', selectedAnswer: 'B', isCorrect: false, timeSpent: 3, isMarked: false }],
        totalQuestions: 1,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 1,
        score: 0,
        percentage: 0,
        timeSpent: 3,
        timeLimit: 0,
        isCompleted: false,
        currentIndex: 0,
        shuffledQuestionIds: ['q-m3-3'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [q3],
      elapsedTime: 3,
    });

    await useExamStore.getState().submitQuiz();

    expect(q3.consecutiveCorrectCount).toBe(0);
    expect(q3.wrongCount).toBe(2);
    expect(q3.status).toBe('needs_review');
  });
});
