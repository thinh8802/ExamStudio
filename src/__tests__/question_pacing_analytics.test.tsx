import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { QuestionPacingAnalytics } from '../components/analytics/QuestionPacingAnalytics';
import type { Attempt, Question } from '../types';

describe('QuestionPacingAnalytics', () => {
  const mockQuestions: Question[] = [
    {
      id: 'Q1',
      subjectId: 'S1',
      chapterId: 'C1',
      topicId: 'T1',
      type: 'single_choice',
      difficulty: 'easy',
      content: 'Câu 1',
      answers: [],
      correctAnswer: 'A',
      explanation: '',
      tags: [],
      notes: '',
      source: '',
      imageUrl: '',
      status: 'new',
      attemptCount: 1,
      correctCount: 1,
      wrongCount: 0,
      masteryScore: 10,
      lastAttemptedAt: null,
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'Q2',
      subjectId: 'S1',
      chapterId: 'C1',
      topicId: 'T1',
      type: 'single_choice',
      difficulty: 'hard',
      content: 'Câu 2',
      answers: [],
      correctAnswer: 'B',
      explanation: '',
      tags: [],
      notes: '',
      source: '',
      imageUrl: '',
      status: 'new',
      attemptCount: 1,
      correctCount: 0,
      wrongCount: 1,
      masteryScore: 0,
      lastAttemptedAt: null,
      isBookmarked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockAttempt: Attempt = {
    id: 'ATT-1',
    examId: 'EX-1',
    examName: 'Bài thi thử',
    mode: 'exam',
    subjectId: 'S1',
    chapterIds: ['C1'],
    questionIds: ['Q1', 'Q2'],
    answers: [
      { questionId: 'Q1', selectedAnswer: 'A', isCorrect: true, timeSpent: 20, isMarked: false },
      { questionId: 'Q2', selectedAnswer: 'C', isCorrect: false, timeSpent: 110, isMarked: false },
    ],
    totalQuestions: 2,
    correctCount: 1,
    wrongCount: 1,
    skippedCount: 0,
    score: 5,
    percentage: 50,
    timeSpent: 130,
    timeLimit: 50,
    isCompleted: true,
    currentIndex: 0,
    shuffledQuestionIds: ['Q1', 'Q2'],
    shuffledAnswerMap: {},
    startedAt: new Date(),
    completedAt: new Date(),
  };

  it('renders pacing metrics and identifies time traps', () => {
    const { getByText, getAllByText } = render(
      <QuestionPacingAnalytics attempt={mockAttempt} questions={mockQuestions} />
    );

    expect(getByText(/Phân Tích Nhịp Độ Làm Bài/i)).toBeInTheDocument();
    expect(getAllByText(/Phản xạ nhanh/i).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/Bẫy thời gian/i).length).toBeGreaterThanOrEqual(1);
  });
});
