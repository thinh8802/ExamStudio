import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuizSetupPage } from '../pages/QuizSetupPage';
import { useSubjectStore } from '../stores/subject-store';
import { useQuestionStore } from '../stores/question-store';
import { useExamStore } from '../stores/exam-store';
import type { Subject, Chapter, Question, QuizConfig } from '../types';

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, vi.fn()],
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const mockSubjects: Subject[] = [
  { id: 'sub-1', name: 'Môn Toán', description: '', color: 'blue', icon: 'book', order: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 'sub-2', name: 'Môn Lý', description: '', color: 'red', icon: 'zap', order: 2, createdAt: new Date(), updatedAt: new Date() },
];

const mockChapters: Chapter[] = [
  { id: 'ch-1', subjectId: 'sub-1', name: 'Toán - Chương 1', description: '', order: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 'ch-2', subjectId: 'sub-1', name: 'Toán - Chương 2', description: '', order: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 'ch-3', subjectId: 'sub-2', name: 'Lý - Chương 1', description: '', order: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 'ch-4', subjectId: 'sub-2', name: 'Lý - Chương 2', description: '', order: 2, createdAt: new Date(), updatedAt: new Date() },
];

const mockQuestions: Question[] = [
  {
    id: 'q-1',
    subjectId: 'sub-1',
    chapterId: 'ch-1',
    topicId: 't-1',
    type: 'single_choice',
    content: 'Câu Toán 1',
    answers: [{ id: 'a1', label: 'A', content: '1', isCorrect: true }],
    correctAnswer: 'A',
    explanation: '',
    difficulty: 'easy',
    attemptCount: 0,
    correctCount: 0,
    wrongCount: 0,
    masteryScore: 0,
    status: 'unattempted',
    tags: [],
    notes: '',
    source: '',
    imageUrl: '',
    isBookmarked: false,
    lastAttemptedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'q-2',
    subjectId: 'sub-2',
    chapterId: 'ch-3',
    topicId: 't-2',
    type: 'single_choice',
    content: 'Câu Lý 1',
    answers: [{ id: 'a1', label: 'A', content: '1', isCorrect: true }],
    correctAnswer: 'A',
    explanation: '',
    difficulty: 'easy',
    attemptCount: 0,
    correctCount: 0,
    wrongCount: 0,
    masteryScore: 0,
    status: 'unattempted',
    tags: [],
    notes: '',
    source: '',
    imageUrl: '',
    isBookmarked: false,
    lastAttemptedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'q-3',
    subjectId: 'sub-2',
    chapterId: 'ch-4',
    topicId: 't-3',
    type: 'single_choice',
    content: 'Câu Lý 2',
    answers: [{ id: 'a1', label: 'A', content: '1', isCorrect: true }],
    correctAnswer: 'A',
    explanation: '',
    difficulty: 'easy',
    attemptCount: 0,
    correctCount: 0,
    wrongCount: 0,
    masteryScore: 0,
    status: 'unattempted',
    tags: [],
    notes: '',
    source: '',
    imageUrl: '',
    isBookmarked: false,
    lastAttemptedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('QuizSetupPage - Subject Change Chapter Defaulting Verification', () => {
  const mockStartQuiz = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();

    useSubjectStore.setState({
      subjects: mockSubjects,
      chapters: mockChapters,
      getChaptersBySubject: (subId: string) => mockChapters.filter(c => c.subjectId === subId),
    });

    useQuestionStore.setState({
      questions: mockQuestions,
    });

    useExamStore.setState({
      startQuiz: mockStartQuiz,
      hasUnfinishedAttempt: false,
      resumeUnfinishedAttempt: vi.fn(),
    });
  });

  it('does not auto-select any chapter by default and clears chapter selection when changing subjects', async () => {
    render(<QuizSetupPage />);

    // Initially sub-1 ("Môn Toán") is selected
    // Check initial chapters listed: 0/2 selected (no default chapter auto-selected)
    expect(screen.getByText('Danh sách chương học (0/2)')).toBeTruthy();
    expect(screen.getByText('Toán - Chương 1')).toBeTruthy();
    expect(screen.getByText('Toán - Chương 2')).toBeTruthy();

    // Change subject select dropdown to "sub-2" ("Môn Lý")
    const selects = screen.getAllByRole('combobox');
    const subjectSelect = selects[0];
    fireEvent.change(subjectSelect, { target: { value: 'sub-2' } });

    // Assert: UI updates to show sub-2 chapters with 0/2 selected
    await waitFor(() => {
      expect(screen.getByText('Danh sách chương học (0/2)')).toBeTruthy();
      expect(screen.getByText('Lý - Chương 1')).toBeTruthy();
      expect(screen.getByText('Lý - Chương 2')).toBeTruthy();
    });

    // Select a chapter manually (Lý - Chương 1)
    const chap1Button = screen.getByText('Lý - Chương 1');
    fireEvent.click(chap1Button);

    await waitFor(() => {
      expect(screen.getByText('Danh sách chương học (1/2)')).toBeTruthy();
    });

    // Verify Start Quiz CTA is enabled and passes sub-2 and chapter 1 ['ch-3']
    const startButton = screen.getByRole('button', { name: /Bắt đầu làm bài/i });
    expect((startButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockStartQuiz).toHaveBeenCalledTimes(1);
    });

    const passedConfig: QuizConfig = mockStartQuiz.mock.calls[0][0];
    expect(passedConfig.subjectId).toBe('sub-2');
    expect(passedConfig.chapterIds).toEqual(['ch-3']);
  });
});
