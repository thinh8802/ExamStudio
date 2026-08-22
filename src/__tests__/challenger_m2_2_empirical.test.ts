// ============================================
// EMPIRICAL TEST SUITE - CHALLENGER 2 FOR MILESTONE 2
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../services/database';
import { selectQuestions } from '../services/randomization';
import { useExamStore } from '../stores/exam-store';
import { useQuestionStore } from '../stores/question-store';
import type { Question, QuizConfig } from '../types';

describe('Challenger 2 Empirical Verification - Milestone 2', () => {
  let mockQuestionPool: Question[] = [];

  const baseQuestion: Question = {
    id: 'q-test-1',
    subjectId: 'sub-m2',
    chapterId: 'chap-m2',
    topicId: 'top-m2',
    type: 'single_choice',
    difficulty: 'medium',
    content: 'Test Question Content',
    answers: [
      { id: 'a1', label: 'A', content: 'Correct Answer', isCorrect: true },
      { id: 'a2', label: 'B', content: 'Wrong Answer', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Test Explanation',
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
    lastAttemptedAt: new Date(),
    isBookmarked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockQuestionPool = [];
    vi.restoreAllMocks();

    // Mock db.questions methods
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

    vi.spyOn(db.questions, 'toArray').mockImplementation((async () => [...mockQuestionPool]) as any);
    vi.spyOn(db.questions, 'orderBy').mockImplementation((() => ({
      reverse: () => ({
        toArray: async () => [...mockQuestionPool],
      }),
    })) as any);

    vi.spyOn(db.questions, 'update').mockImplementation((async (id: any, changes: any) => {
      const q = mockQuestionPool.find(item => item.id === id);
      if (q) {
        Object.assign(q, changes);
      }
      return 1;
    }) as any);

    vi.spyOn(db.attempts, 'add').mockImplementation((async (attempt: any) => attempt.id) as any);
    vi.spyOn(db, 'transaction').mockImplementation((async (mode: any, tables: any, cb: any) => {
      return cb();
    }) as any);

    // Mock question store loadQuestions
    useQuestionStore.setState({
      loadQuestions: vi.fn().mockImplementation(async () => {
        useQuestionStore.setState({ questions: [...mockQuestionPool] });
      }),
    });
  });

  it('Verification 1: consecutiveCorrectCount is correctly recorded on question updates in submitQuiz()', async () => {
    const q1: Question = {
      ...baseQuestion,
      id: 'q-streak-1',
      attemptCount: 1,
      correctCount: 0,
      wrongCount: 1,
      consecutiveCorrectCount: 0,
      status: 'needs_review',
    };
    mockQuestionPool = [q1];

    // Setup initial exam store state for 1st submission (correct answer)
    useExamStore.setState({
      currentAttempt: {
        id: 'att-1',
        examId: '',
        examName: 'Practice Test',
        mode: 'practice',
        subjectId: 'sub-m2',
        chapterIds: ['chap-m2'],
        questionIds: ['q-streak-1'],
        answers: [
          { questionId: 'q-streak-1', selectedAnswer: 'A', isCorrect: true, timeSpent: 5, isMarked: false }
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
        shuffledQuestionIds: ['q-streak-1'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [q1],
      elapsedTime: 5,
    });

    // Execute submitQuiz()
    await useExamStore.getState().submitQuiz();

    // Verify q1 updated in pool
    expect(q1.consecutiveCorrectCount).toBe(1);
    expect(q1.correctCount).toBe(1);
    expect(q1.wrongCount).toBe(1);

    // Setup 2nd submission (wrong answer) -> consecutiveCorrectCount must reset to 0
    useExamStore.setState({
      currentAttempt: {
        id: 'att-2',
        examId: '',
        examName: 'Practice Test 2',
        mode: 'practice',
        subjectId: 'sub-m2',
        chapterIds: ['chap-m2'],
        questionIds: ['q-streak-1'],
        answers: [
          { questionId: 'q-streak-1', selectedAnswer: 'B', isCorrect: false, timeSpent: 5, isMarked: false }
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
        shuffledQuestionIds: ['q-streak-1'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [q1],
      elapsedTime: 5,
    });

    await useExamStore.getState().submitQuiz();

    // Verify consecutiveCorrectCount reset to 0
    expect(q1.consecutiveCorrectCount).toBe(0);
    expect(q1.wrongCount).toBe(2);
    expect(q1.status).toBe('needs_review');
  });

  it('Verification 2: Answering a previously wrong question correctly 2 times transitions its status to mastered', async () => {
    // Initial state: question has wrongCount = 1, status = 'needs_review'
    const qPrevWrong: Question = {
      ...baseQuestion,
      id: 'q-wrong-to-mastered',
      attemptCount: 1,
      correctCount: 0,
      wrongCount: 1,
      consecutiveCorrectCount: 0,
      status: 'needs_review',
    };
    mockQuestionPool = [qPrevWrong];

    // --- STEP 1: Answer correctly 1st time ---
    useExamStore.setState({
      currentAttempt: {
        id: 'att-step1',
        examId: '',
        examName: 'Review Session 1',
        mode: 'review',
        subjectId: 'sub-m2',
        chapterIds: ['chap-m2'],
        questionIds: ['q-wrong-to-mastered'],
        answers: [
          { questionId: 'q-wrong-to-mastered', selectedAnswer: 'A', isCorrect: true, timeSpent: 10, isMarked: false }
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
        shuffledQuestionIds: ['q-wrong-to-mastered'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [qPrevWrong],
      elapsedTime: 10,
    });

    await useExamStore.getState().submitQuiz();

    // After 1st correct answer: streak = 1, status is NOT mastered (becomes 'learning')
    expect(qPrevWrong.consecutiveCorrectCount).toBe(1);
    expect(qPrevWrong.status).not.toBe('mastered');
    expect(qPrevWrong.status).toBe('learning');

    // --- STEP 2: Answer correctly 2nd time ---
    useExamStore.setState({
      currentAttempt: {
        id: 'att-step2',
        examId: '',
        examName: 'Review Session 2',
        mode: 'review',
        subjectId: 'sub-m2',
        chapterIds: ['chap-m2'],
        questionIds: ['q-wrong-to-mastered'],
        answers: [
          { questionId: 'q-wrong-to-mastered', selectedAnswer: 'A', isCorrect: true, timeSpent: 10, isMarked: false }
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
        shuffledQuestionIds: ['q-wrong-to-mastered'],
        shuffledAnswerMap: {},
        startedAt: new Date(),
        completedAt: null,
      },
      currentQuestions: [qPrevWrong],
      elapsedTime: 10,
    });

    await useExamStore.getState().submitQuiz();

    // After 2nd consecutive correct answer: streak = 2, status MUST be 'mastered'!
    expect(qPrevWrong.consecutiveCorrectCount).toBe(2);
    expect(qPrevWrong.status).toBe('mastered');
  });

  it('Verification 3: Generating a Review Quiz with excludeMastered: true excludes all mastered questions', async () => {
    const q1_wrong_unmastered: Question = {
      ...baseQuestion,
      id: 'q-1-wrong',
      wrongCount: 3,
      status: 'needs_review',
    };
    const q2_wrong_mastered: Question = {
      ...baseQuestion,
      id: 'q-2-mastered',
      wrongCount: 2,
      status: 'mastered',
    };
    const q3_zero_wrong_mastered: Question = {
      ...baseQuestion,
      id: 'q-3-mastered',
      wrongCount: 0,
      status: 'mastered',
    };
    const q4_unattempted: Question = {
      ...baseQuestion,
      id: 'q-4-unattempted',
      wrongCount: 0,
      attemptCount: 0,
      status: 'new',
    };

    mockQuestionPool = [q1_wrong_unmastered, q2_wrong_mastered, q3_zero_wrong_mastered, q4_unattempted];

    // Case A: Review mode with excludeMastered = true
    const configReview: QuizConfig = {
      subjectId: 'sub-m2',
      chapterIds: ['chap-m2'],
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

    const reviewQuestions = await selectQuestions(configReview);
    const reviewIds = reviewQuestions.map(q => q.id);

    expect(reviewIds).toContain('q-1-wrong');
    expect(reviewIds).not.toContain('q-2-mastered');
    expect(reviewIds).not.toContain('q-3-mastered');
    expect(reviewIds).not.toContain('q-4-unattempted');
    expect(reviewQuestions.every(q => q.status !== 'mastered')).toBe(true);

    // Case B: Practice mode with excludeMastered = true
    const configPractice: QuizConfig = {
      subjectId: 'sub-m2',
      chapterIds: ['chap-m2'],
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

    const practiceQuestions = await selectQuestions(configPractice);
    const practiceIds = practiceQuestions.map(q => q.id);

    expect(practiceIds).toContain('q-1-wrong');
    expect(practiceIds).toContain('q-4-unattempted');
    expect(practiceIds).not.toContain('q-2-mastered');
    expect(practiceIds).not.toContain('q-3-mastered');
    expect(practiceQuestions.every(q => q.status !== 'mastered')).toBe(true);
  });
});
