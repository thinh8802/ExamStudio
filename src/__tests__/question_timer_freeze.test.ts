import { describe, it, expect, beforeEach } from 'vitest';
import { useExamStore } from '../stores/exam-store';
import type { Question, Attempt } from '../types';

describe('Question Timer Freeze upon Answered', () => {
  const dummyQuestions: Question[] = [
    {
      id: 'q-time-1',
      subjectId: 'sub-1',
      chapterId: 'chap-1',
      topicId: 'top-1',
      content: 'Câu hỏi 1',
      answers: [
        { id: 'ans-1', label: 'A', content: 'Đáp án A', isCorrect: true },
        { id: 'ans-2', label: 'B', content: 'Đáp án B', isCorrect: false },
      ],
      correctAnswer: 'A',
      explanation: 'Giải thích A',
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
    {
      id: 'q-time-2',
      subjectId: 'sub-1',
      chapterId: 'chap-1',
      topicId: 'top-1',
      content: 'Câu hỏi 2',
      answers: [
        { id: 'ans-3', label: 'A', content: 'Đáp án A', isCorrect: false },
        { id: 'ans-4', label: 'B', content: 'Đáp án B', isCorrect: true },
      ],
      correctAnswer: 'B',
      explanation: 'Giải thích B',
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

  it('increments timeSpent when question is NOT answered, and stops incrementing when answered', () => {
    const attempt: Attempt = {
      id: 'att-timer-1',
      examId: '',
      examName: 'Test Timer',
      mode: 'practice' as const,
      subjectId: 'sub-1',
      chapterIds: ['chap-1'],
      questionIds: ['q-time-1', 'q-time-2'],
      currentIndex: 0,
      totalQuestions: 2,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 2,
      score: 0,
      percentage: 0,
      timeSpent: 0,
      timeLimit: 0,
      isCompleted: false,
      answers: [
        { questionId: 'q-time-1', selectedAnswer: '', isCorrect: false, timeSpent: 0, isMarked: false },
        { questionId: 'q-time-2', selectedAnswer: '', isCorrect: false, timeSpent: 0, isMarked: false },
      ],
      startedAt: new Date(),
      completedAt: null,
      shuffledQuestionIds: ['q-time-1', 'q-time-2'],
      shuffledAnswerMap: {},
    };

    useExamStore.setState({
      currentAttempt: attempt,
      currentQuestions: dummyQuestions,
      currentIndex: 0,
      elapsedTime: 0,
    });

    // 1. Tick 5 times on question 1 (unanswered)
    for (let i = 0; i < 5; i++) {
      useExamStore.getState().tick();
    }

    let currentAns1 = useExamStore.getState().currentAttempt?.answers.find(a => a.questionId === 'q-time-1');
    expect(currentAns1?.timeSpent).toBe(5);

    // 2. Answer question 1
    useExamStore.getState().answerQuestion('q-time-1', 'A');

    // 3. Tick 10 more times while still viewing question 1 (reading explanation)
    for (let i = 0; i < 10; i++) {
      useExamStore.getState().tick();
    }

    currentAns1 = useExamStore.getState().currentAttempt?.answers.find(a => a.questionId === 'q-time-1');
    // timeSpent MUST STAY 5, NOT 15!
    expect(currentAns1?.timeSpent).toBe(5);
    // Global elapsedTime should still advance to 15
    expect(useExamStore.getState().elapsedTime).toBe(15);

    // 4. Navigate to question 2 (unanswered) and tick 3 times
    useExamStore.getState().navigateTo(1);
    for (let i = 0; i < 3; i++) {
      useExamStore.getState().tick();
    }

    const currentAns2 = useExamStore.getState().currentAttempt?.answers.find(a => a.questionId === 'q-time-2');
    expect(currentAns2?.timeSpent).toBe(3);

    // Question 1 should STILL remain 5
    currentAns1 = useExamStore.getState().currentAttempt?.answers.find(a => a.questionId === 'q-time-1');
    expect(currentAns1?.timeSpent).toBe(5);
  });

  it('in EXAM mode, timeSpent continues counting even after selecting an answer (real time spent thinking)', () => {
    const examAttempt: Attempt = {
      id: 'att-timer-exam',
      examId: 'exam-1',
      examName: 'Bài Thi Thử Toán',
      mode: 'exam' as const,
      subjectId: 'sub-1',
      chapterIds: ['chap-1'],
      questionIds: ['q-time-1', 'q-time-2'],
      currentIndex: 0,
      totalQuestions: 2,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: 2,
      score: 0,
      percentage: 0,
      timeSpent: 0,
      timeLimit: 3600,
      isCompleted: false,
      answers: [
        { questionId: 'q-time-1', selectedAnswer: '', isCorrect: false, timeSpent: 0, isMarked: false },
        { questionId: 'q-time-2', selectedAnswer: '', isCorrect: false, timeSpent: 0, isMarked: false },
      ],
      startedAt: new Date(),
      completedAt: null,
      shuffledQuestionIds: ['q-time-1', 'q-time-2'],
      shuffledAnswerMap: {},
    };

    useExamStore.setState({
      currentAttempt: examAttempt,
      currentQuestions: dummyQuestions,
      currentIndex: 0,
      elapsedTime: 0,
    });

    // 1. Tick 4 times on question 1
    for (let i = 0; i < 4; i++) {
      useExamStore.getState().tick();
    }
    let ans1 = useExamStore.getState().currentAttempt?.answers.find(a => a.questionId === 'q-time-1');
    expect(ans1?.timeSpent).toBe(4);

    // 2. Select answer A
    useExamStore.getState().answerQuestion('q-time-1', 'A');

    // 3. In Exam mode, continue thinking on question 1 for 6 more seconds
    for (let i = 0; i < 6; i++) {
      useExamStore.getState().tick();
    }

    // In Exam mode, timeSpent on question 1 MUST be 10 (4 + 6), not frozen at 4!
    ans1 = useExamStore.getState().currentAttempt?.answers.find(a => a.questionId === 'q-time-1');
    expect(ans1?.timeSpent).toBe(10);
    expect(useExamStore.getState().elapsedTime).toBe(10);

    // 4. Change answer to B
    useExamStore.getState().answerQuestion('q-time-1', 'B');
    for (let i = 0; i < 2; i++) {
      useExamStore.getState().tick();
    }
    ans1 = useExamStore.getState().currentAttempt?.answers.find(a => a.questionId === 'q-time-1');
    expect(ans1?.timeSpent).toBe(12);
  });
});
