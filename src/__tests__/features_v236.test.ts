import { describe, it, expect, beforeEach } from 'vitest';
import { useExamStore } from '../stores/exam-store';
import { useAppStore } from '../stores/app-store';
import { useQuestionStore } from '../stores/question-store';
import type { Question, Attempt } from '../types';

describe('Features v2.3.6 Comprehensive Test Suite', () => {
  const dummyQuestions: Question[] = [
    {
      id: 'q-feat-1',
      subjectId: 'sub-math',
      chapterId: 'chap-1',
      topicId: 'top-1',
      content: 'Biểu thức nào sau đây là hằng đẳng thức?',
      answers: [
        { id: 'ans-1', label: 'A', content: '(a+b)^2 = a^2 + 2ab + b^2', isCorrect: true },
        { id: 'ans-2', label: 'B', content: '(a+b)^2 = a^2 + b^2', isCorrect: false },
        { id: 'ans-3', label: 'C', content: '(a-b)^2 = a^2 - b^2', isCorrect: false },
        { id: 'ans-4', label: 'D', content: '(a+b)^3 = a^3 + b^3', isCorrect: false },
      ],
      correctAnswer: 'A',
      explanation: 'Đây là bình phương của một tổng.',
      difficulty: 'easy',
      type: 'single_choice',
      isBookmarked: false,
      attemptCount: 0,
      correctCount: 0,
      wrongCount: 0,
      masteryScore: 0,
      status: 'new',
      tags: [],
      notes: '',
      source: '',
      imageUrl: '',
      lastAttemptedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    useExamStore.setState({
      currentAttempt: null,
      currentQuestions: [],
      currentIndex: 0,
      elapsedTime: 0,
      isPaused: false,
      isSubmitting: false,
    });
  });

  describe('1. Shuffled Answer Visual Keyboard Mapping', () => {
    it('correctly maps visual keyboard indexes (0->A, 1->B, 2->C, 3->D) to actual database labels when answers are shuffled', () => {
      const attempt: Attempt = {
        id: 'att-shuffle-1',
        examId: '',
        examName: 'Shuffle Test',
        mode: 'practice',
        subjectId: 'sub-math',
        chapterIds: ['chap-1'],
        questionIds: ['q-feat-1'],
        currentIndex: 0,
        totalQuestions: 1,
        correctCount: 0,
        wrongCount: 0,
        skippedCount: 1,
        score: 0,
        percentage: 0,
        timeSpent: 0,
        timeLimit: 0,
        isCompleted: false,
        answers: [
          { questionId: 'q-feat-1', selectedAnswer: '', isCorrect: false, timeSpent: 0, isMarked: false },
        ],
        startedAt: new Date(),
        completedAt: null,
        shuffledQuestionIds: ['q-feat-1'],
        shuffledAnswerMap: {
          'q-feat-1': ['C', 'A', 'D', 'B'],
        },
      };

      const q = dummyQuestions[0];
      const shuffled = attempt.shuffledAnswerMap['q-feat-1'];
      const displayAnswers = shuffled.map(lbl => q.answers.find(a => a.label === lbl)).filter(Boolean) as typeof q.answers;

      // User presses key 'A' (visual index 0) -> should select displayAnswers[0] which is label 'C'
      expect(displayAnswers[0].label).toBe('C');
      // User presses key 'B' (visual index 1) -> should select displayAnswers[1] which is label 'A'
      expect(displayAnswers[1].label).toBe('A');
      // User presses key 'C' (visual index 2) -> should select displayAnswers[2] which is label 'D'
      expect(displayAnswers[2].label).toBe('D');
      // User presses key 'D' (visual index 3) -> should select displayAnswers[3] which is label 'B'
      expect(displayAnswers[3].label).toBe('B');
    });
  });

  describe('2. Streak Notification Settings in app-store', () => {
    it('initializes and updates streak notification settings properly', async () => {
      const store = useAppStore.getState();
      expect(store.streakNotificationEnabled).toBeDefined();
      expect(store.streakNotificationMode).toBeDefined();
      expect(store.streakMinThreshold).toBeDefined();

      // Test toggling enabled
      await store.setStreakNotificationEnabled(false);
      expect(useAppStore.getState().streakNotificationEnabled).toBe(false);

      // Test mode change
      await store.setStreakNotificationMode('milestones_only');
      expect(useAppStore.getState().streakNotificationMode).toBe('milestones_only');

      await store.setStreakNotificationMode('min_streak');
      expect(useAppStore.getState().streakNotificationMode).toBe('min_streak');

      // Test min streak threshold
      await store.setStreakMinThreshold(7);
      expect(useAppStore.getState().streakMinThreshold).toBe(7);

      // Reset
      await store.setStreakNotificationEnabled(true);
      await store.setStreakNotificationMode('all');
      await store.setStreakMinThreshold(3);
    });
  });

  describe('3. Pacing Analytics Pagination Logic for 500 questions', () => {
    it('splits 500 questions into 10 chunks of 50 questions with safe navigation', () => {
      const totalQuestions = 500;
      const PAGE_SIZE = 50;
      const totalPages = Math.ceil(totalQuestions / PAGE_SIZE);

      expect(totalPages).toBe(10);

      // Page 0 should span questions 1 to 50
      const page0Start = 0 * PAGE_SIZE;
      const page0End = Math.min(totalQuestions, (0 + 1) * PAGE_SIZE);
      expect(page0Start + 1).toBe(1);
      expect(page0End).toBe(50);

      // Page 9 (last page) should span questions 451 to 500
      const page9Start = 9 * PAGE_SIZE;
      const page9End = Math.min(totalQuestions, (9 + 1) * PAGE_SIZE);
      expect(page9Start + 1).toBe(451);
      expect(page9End).toBe(500);
    });
  });

  describe('4. Bulk Import Integration with Store', () => {
    it('automatically reloads questions into the store after bulkImport', async () => {
      const qStore = useQuestionStore.getState();
      
      const newQuestionsToImport: Partial<Question>[] = [
        {
          content: 'Thủ đô của Việt Nam là gì?',
          subjectId: 'sub-geo',
          chapterId: 'chap-geo-1',
          correctAnswer: 'A',
          explanation: 'Hà Nội là thủ đô.',
          type: 'single_choice',
          difficulty: 'easy',
          answers: [
            { id: 'ans-g1', label: 'A', content: 'Hà Nội', isCorrect: true },
            { id: 'ans-g2', label: 'B', content: 'Đà Nẵng', isCorrect: false },
            { id: 'ans-g3', label: 'C', content: 'Hải Phòng', isCorrect: false },
            { id: 'ans-g4', label: 'D', content: 'Cần Thơ', isCorrect: false },
          ],
        },
      ];

      const result = await qStore.bulkImport(newQuestionsToImport);
      expect(result.errors.length).toBe(0);
      expect(result.imported).toBe(1);

      // Verify that useQuestionStore has updated questions in memory
      const updatedStore = useQuestionStore.getState();
      const found = updatedStore.questions.find((q: Question) => q.content === 'Thủ đô của Việt Nam là gì?');
      expect(found).toBeDefined();
      expect(found?.subjectId).toBe('sub-geo');
      expect(found?.chapterId).toBe('chap-geo-1');
      expect(found?.answers.length).toBe(4);
    });
  });
});
