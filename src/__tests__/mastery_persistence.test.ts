// ============================================
// MILESTONE 3: DYNAMIC PROGRESS TRACKING, DEXIE PERSISTENCE & MASTERY TESTS
// ============================================

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useExamStore } from '../stores/exam-store';
import { useQuestionStore } from '../stores/question-store';
import { db } from '../services/database';
import { selectQuestions } from '../services/randomization';
import type { Question, Attempt, QuizConfig } from '../types';

describe('Milestone 3: Dynamic Progress Tracking, Dexie Persistence & Mastery', () => {
  let mockQuestions: Question[] = [];
  let mockAttempts: Attempt[] = [];

  beforeEach(() => {
    mockQuestions = [
      {
        id: 'q-1',
        subjectId: 'sub-1',
        chapterId: 'chap-1',
        topicId: 'top-1',
        type: 'single_choice',
        difficulty: 'medium',
        content: 'Question 1',
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
        attemptCount: 1,
        correctCount: 0,
        wrongCount: 1,
        consecutiveCorrectCount: 0,
        masteryScore: 0,
        lastAttemptedAt: null,
        isBookmarked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'q-2',
        subjectId: 'sub-1',
        chapterId: 'chap-1',
        topicId: 'top-1',
        type: 'single_choice',
        difficulty: 'hard',
        content: 'Question 2',
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

    // Mock db.questions queries for QuestionStore and Randomization service
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

  it('1. Answering a wrong question correctly 2 times transitions its status to mastered', async () => {
    const q1 = mockQuestions[0];
    expect(q1.status).toBe('needs_review');
    expect(q1.consecutiveCorrectCount).toBe(0);

    // Attempt 1: Answer correctly
    useExamStore.setState({
      currentAttempt: {
        id: 'att-1',
        examId: '',
        examName: 'Review Mode 1',
        mode: 'review',
        subjectId: 'sub-1',
        chapterIds: ['chap-1'],
        questionIds: ['q-1'],
        answers: [{ questionId: 'q-1', selectedAnswer: 'A', isCorrect: true, timeSpent: 10, isMarked: false }],
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
        shuffledQuestionIds: ['q-1'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [q1],
      elapsedTime: 10,
    });

    await useExamStore.getState().submitQuiz();

    expect(q1.attemptCount).toBe(2);
    expect(q1.correctCount).toBe(1);
    expect(q1.wrongCount).toBe(1);
    expect(q1.consecutiveCorrectCount).toBe(1);
    expect(q1.status).toBe('learning');

    // Attempt 2: Answer correctly again (2nd consecutive correct)
    useExamStore.setState({
      currentAttempt: {
        id: 'att-2',
        examId: '',
        examName: 'Review Mode 2',
        mode: 'review',
        subjectId: 'sub-1',
        chapterIds: ['chap-1'],
        questionIds: ['q-1'],
        answers: [{ questionId: 'q-1', selectedAnswer: 'A', isCorrect: true, timeSpent: 12, isMarked: false }],
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
        shuffledQuestionIds: ['q-1'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [q1],
      elapsedTime: 12,
    });

    await useExamStore.getState().submitQuiz();

    expect(q1.attemptCount).toBe(3);
    expect(q1.correctCount).toBe(2);
    expect(q1.consecutiveCorrectCount).toBe(2);
    expect(q1.status).toBe('mastered');
  });

  it('2. Answering incorrectly resets streak and keeps question in review pool', async () => {
    const q2 = mockQuestions[1]; // consecutiveCorrectCount starts at 1
    expect(q2.consecutiveCorrectCount).toBe(1);
    expect(q2.wrongCount).toBe(1);

    // Submit attempt with incorrect answer ('B')
    useExamStore.setState({
      currentAttempt: {
        id: 'att-fail',
        examId: '',
        examName: 'Review Session',
        mode: 'review',
        subjectId: 'sub-1',
        chapterIds: ['chap-1'],
        questionIds: ['q-2'],
        answers: [{ questionId: 'q-2', selectedAnswer: 'B', isCorrect: false, timeSpent: 8, isMarked: false }],
        totalQuestions: 1,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 1,
        score: 0,
        percentage: 0,
        timeSpent: 8,
        timeLimit: 0,
        isCompleted: false,
        currentIndex: 0,
        shuffledQuestionIds: ['q-2'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [q2],
      elapsedTime: 8,
    });

    await useExamStore.getState().submitQuiz();

    expect(q2.wrongCount).toBe(2);
    expect(q2.consecutiveCorrectCount).toBe(0);
    expect(q2.status).toBe('needs_review');

    // Verify q-2 remains in review pool for selectQuestions
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
      excludeMastered: true,
      difficulty: '',
      randomSeed: '',
    };

    const reviewQuestions = await selectQuestions(config);
    const reviewIds = reviewQuestions.map(q => q.id);
    expect(reviewIds).toContain('q-2');
  });

  it('3. Persistence in Dexie IndexedDB across simulated app restarts', async () => {
    const q1 = mockQuestions[0];
    q1.consecutiveCorrectCount = 1;

    // Submit quiz to transition q1 to mastered via db transaction
    useExamStore.setState({
      currentAttempt: {
        id: 'att-restart-test',
        examId: '',
        examName: 'Exam Mode Persistence',
        mode: 'practice',
        subjectId: 'sub-1',
        chapterIds: ['chap-1'],
        questionIds: ['q-1'],
        answers: [{ questionId: 'q-1', selectedAnswer: 'A', isCorrect: true, timeSpent: 15, isMarked: false }],
        totalQuestions: 1,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 1,
        score: 0,
        percentage: 0,
        timeSpent: 15,
        timeLimit: 0,
        isCompleted: false,
        currentIndex: 0,
        shuffledQuestionIds: ['q-1'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [q1],
      elapsedTime: 15,
    });

    await useExamStore.getState().submitQuiz();

    // Verify Dexie transaction called db.attempts.add and db.questions.update
    expect(db.transaction).toHaveBeenCalledWith('rw', [db.questions, db.attempts], expect.any(Function));
    expect(db.attempts.add).toHaveBeenCalled();
    expect(db.questions.update).toHaveBeenCalledWith('q-1', expect.objectContaining({
      consecutiveCorrectCount: 2,
      status: 'mastered',
    }));

    // SIMULATE APP RESTART: Reset all in-memory store states
    useExamStore.setState({
      currentAttempt: null,
      currentQuestions: [],
      currentIndex: 0,
      elapsedTime: 0,
    });
    useQuestionStore.setState({
      questions: [],
      filteredQuestions: [],
      loading: false,
      totalCount: 0,
    });

    // App restarts and reloads data from Dexie DB
    await useQuestionStore.getState().loadQuestions();

    const reloadedQuestions = useQuestionStore.getState().questions;
    expect(reloadedQuestions.length).toBe(2);

    const reloadedQ1 = reloadedQuestions.find(q => q.id === 'q-1');
    expect(reloadedQ1).toBeDefined();
    expect(reloadedQ1?.status).toBe('mastered');
    expect(reloadedQ1?.consecutiveCorrectCount).toBe(2);

    // Verify Review mode excludes mastered question after restart
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

    const reviewQuestions = await selectQuestions(config);
    expect(reviewQuestions.map(q => q.id)).not.toContain('q-1');
  });

  it('4. Handles missing or undefined schema counter fields gracefully', async () => {
    const rawQuestion: Question = {
      id: 'q-legacy',
      subjectId: 'sub-1',
      chapterId: 'chap-1',
      topicId: 'top-1',
      type: 'single_choice',
      difficulty: 'medium',
      content: 'Legacy question',
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
      attemptCount: undefined as any,
      correctCount: undefined as any,
      wrongCount: undefined as any,
      consecutiveCorrectCount: undefined as any,
      masteryScore: undefined as any,
      lastAttemptedAt: null,
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockQuestions.push(rawQuestion);

    useExamStore.setState({
      currentAttempt: {
        id: 'att-legacy',
        examId: '',
        examName: 'Legacy Test',
        mode: 'practice',
        subjectId: 'sub-1',
        chapterIds: ['chap-1'],
        questionIds: ['q-legacy'],
        answers: [{ questionId: 'q-legacy', selectedAnswer: 'A', isCorrect: true, timeSpent: 5, isMarked: false }],
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
        shuffledQuestionIds: ['q-legacy'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [rawQuestion],
      elapsedTime: 5,
    });

    await useExamStore.getState().submitQuiz();

    expect(rawQuestion.attemptCount).toBe(1);
    expect(rawQuestion.correctCount).toBe(1);
    expect(rawQuestion.wrongCount).toBe(0);
    expect(rawQuestion.consecutiveCorrectCount).toBe(1);
    expect(rawQuestion.status).toBe('learning');
  });
});
