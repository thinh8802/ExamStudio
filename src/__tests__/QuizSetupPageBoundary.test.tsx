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
  { id: 'ch-1', subjectId: 'sub-1', name: 'Chương 1: Đại số', description: '', order: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 'ch-2', subjectId: 'sub-1', name: 'Chương 2: Hình học', description: '', order: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 'ch-3', subjectId: 'sub-2', name: 'Chương 1: Cơ học', description: '', order: 1, createdAt: new Date(), updatedAt: new Date() },
];

const mockQuestions: Question[] = [
  {
    id: 'q-1',
    subjectId: 'sub-1',
    chapterId: 'ch-1',
    topicId: 'top-1',
    type: 'single_choice',
    content: 'Câu 1',
    answers: [{ id: 'a1', label: 'A', content: '1', isCorrect: true }],
    correctAnswer: 'A',
    explanation: '',
    difficulty: 'easy',
    attemptCount: 1,
    correctCount: 1,
    wrongCount: 0,
    masteryScore: 100,
    status: 'mastered',
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
    subjectId: 'sub-1',
    chapterId: 'ch-2',
    topicId: 'top-2',
    type: 'single_choice',
    content: 'Câu 2',
    answers: [{ id: 'a2', label: 'A', content: '2', isCorrect: true }],
    correctAnswer: 'A',
    explanation: '',
    difficulty: 'hard',
    attemptCount: 3,
    correctCount: 1,
    wrongCount: 2,
    masteryScore: 33,
    status: 'needs_review',
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

describe('QuizSetupPage Boundary & Stress Verification', () => {
  const mockStartQuiz = vi.fn().mockResolvedValue(undefined);
  const mockAbandonQuiz = vi.fn();
  const mockResumeUnfinishedAttempt = vi.fn().mockResolvedValue(undefined);

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
      abandonQuiz: mockAbandonQuiz,
      hasUnfinishedAttempt: false,
      resumeUnfinishedAttempt: mockResumeUnfinishedAttempt,
    });
  });

  it('6. Label click vs Switch button click both toggle state cleanly', async () => {
    render(<QuizSetupPage />);

    // Click label text for 'Trộn câu hỏi'
    const labelText = screen.getByText('Trộn câu hỏi');
    const switches = screen.getAllByRole('switch');
    const shuffleQuestionsSwitch = switches[0];

    expect(shuffleQuestionsSwitch.getAttribute('aria-checked')).toBe('true');

    // Click label text
    fireEvent.click(labelText);
    expect(shuffleQuestionsSwitch.getAttribute('aria-checked')).toBe('false');

    // Click switch button directly
    fireEvent.click(shuffleQuestionsSwitch);
    expect(shuffleQuestionsSwitch.getAttribute('aria-checked')).toBe('true');
  });

  it('7. Chapter select/deselect all toggle updates selected chapterIds and available count', async () => {
    render(<QuizSetupPage />);

    // Click 'Bỏ chọn' to clear all chapters
    const deselectBtn = screen.getByText('Bỏ chọn');
    fireEvent.click(deselectBtn);

    const startButton = screen.getByRole('button', { name: /Bắt đầu làm bài/i }) as HTMLButtonElement;
    expect(startButton.disabled).toBe(true);

    // Click 'Chọn tất cả' to select all chapters
    const selectAllBtn = screen.getByText('Chọn tất cả');
    fireEvent.click(selectAllBtn);

    expect(startButton.disabled).toBe(false);
  });

  it('8. Difficulty dropdown filter updates QuizConfig payload', async () => {
    render(<QuizSetupPage />);

    // Select all chapters
    fireEvent.click(screen.getByRole('button', { name: /Chọn tất cả/i }));

    // Select Difficulty 'Dễ' (easy)
    const selects = screen.getAllByRole('combobox');
    const difficultySelect = selects[1]; // index 0 is subject, index 1 is difficulty

    fireEvent.change(difficultySelect, { target: { value: 'easy' } });

    // Click CTA Button
    const startButton = screen.getByRole('button', { name: /Bắt đầu làm bài/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockStartQuiz).toHaveBeenCalledTimes(1);
    });

    const passedConfig: QuizConfig = mockStartQuiz.mock.calls[0][0];
    expect(passedConfig.difficulty).toBe('easy');
    expect(passedConfig.questionCount).toBe(1); // only 1 easy question
  });

  it('9. Unfinished attempt alert handles resume and abandon correctly', async () => {
    useExamStore.setState({
      hasUnfinishedAttempt: true,
    });

    render(<QuizSetupPage />);

    expect(screen.getByText('Bạn có một bài thi chưa hoàn thành')).toBeTruthy();

    // Click 'Tiếp tục làm'
    const resumeBtn = screen.getByText('Tiếp tục làm');
    fireEvent.click(resumeBtn);

    await waitFor(() => {
      expect(mockResumeUnfinishedAttempt).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('/quiz/session');
    });

    // Click 'Hủy bài thi'
    const abandonBtn = screen.getByText('Hủy bài thi');
    fireEvent.click(abandonBtn);

    expect(mockAbandonQuiz).toHaveBeenCalledTimes(1);
  });
});
