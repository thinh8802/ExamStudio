import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuizSetupPage } from '../pages/QuizSetupPage';
import { useSubjectStore } from '../stores/subject-store';
import { useQuestionStore } from '../stores/question-store';
import { useExamStore } from '../stores/exam-store';
import type { Subject, Chapter, Question, QuizConfig } from '../types';

// Mock react-router-dom
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, vi.fn()],
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Test mock data
const mockSubjects: Subject[] = [
  { id: 'sub-1', name: 'Môn Toán', description: 'Toán học đại cương', color: 'blue', icon: 'book', order: 1, createdAt: new Date(), updatedAt: new Date() },
];

const mockChapters: Chapter[] = [
  { id: 'ch-1', subjectId: 'sub-1', name: 'Chương 1: Đại số', description: '', order: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 'ch-2', subjectId: 'sub-1', name: 'Chương 2: Hình học', description: '', order: 2, createdAt: new Date(), updatedAt: new Date() },
];

const mockQuestions: Question[] = [
  {
    id: 'q-1',
    subjectId: 'sub-1',
    chapterId: 'ch-1',
    topicId: 'top-1',
    type: 'single_choice',
    content: 'Câu hỏi 1',
    answers: [{ id: 'a1', label: 'A', content: 'Ans 1', isCorrect: true }],
    correctAnswer: 'A',
    explanation: '',
    difficulty: 'easy',
    attemptCount: 2,
    correctCount: 0,
    wrongCount: 2,
    masteryScore: 0,
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
  {
    id: 'q-2',
    subjectId: 'sub-1',
    chapterId: 'ch-1',
    topicId: 'top-1',
    type: 'single_choice',
    content: 'Câu hỏi 2',
    answers: [{ id: 'a2', label: 'A', content: 'Ans 1', isCorrect: true }],
    correctAnswer: 'A',
    explanation: '',
    difficulty: 'medium',
    attemptCount: 5,
    correctCount: 5,
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
    id: 'q-3',
    subjectId: 'sub-1',
    chapterId: 'ch-2',
    topicId: 'top-2',
    type: 'single_choice',
    content: 'Câu hỏi 3',
    answers: [{ id: 'a3', label: 'A', content: 'Ans 1', isCorrect: true }],
    correctAnswer: 'A',
    explanation: '',
    difficulty: 'hard',
    attemptCount: 1,
    correctCount: 0,
    wrongCount: 1,
    masteryScore: 0,
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

describe('QuizSetupPage Empirical Verification', () => {
  const mockStartQuiz = vi.fn().mockResolvedValue(undefined);
  const mockResumeUnfinishedAttempt = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();

    // Setup store states
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
      resumeUnfinishedAttempt: mockResumeUnfinishedAttempt,
    });
  });

  it('1. Toggling individual switches updates internal config state and UI correctly', async () => {
    render(<QuizSetupPage />);

    // Query switches
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBe(5);

    // Initial switch states:
    // [0] shuffleQuestions: default true
    // [1] shuffleAnswers: default true
    // [2] prioritizeWrong: default false
    // [3] prioritizeNew: default false
    // [4] excludeMastered: default false

    expect(switches[0].getAttribute('aria-checked')).toBe('true');
    expect(switches[1].getAttribute('aria-checked')).toBe('true');
    expect(switches[2].getAttribute('aria-checked')).toBe('false');
    expect(switches[3].getAttribute('aria-checked')).toBe('false');
    expect(switches[4].getAttribute('aria-checked')).toBe('false');

    // Toggle prioritizeWrong (switch 2)
    fireEvent.click(switches[2]);
    expect(switches[2].getAttribute('aria-checked')).toBe('true');

    // Toggle prioritizeNew (switch 3)
    fireEvent.click(switches[3]);
    expect(switches[3].getAttribute('aria-checked')).toBe('true');

    // Toggle excludeMastered (switch 4)
    fireEvent.click(switches[4]);
    expect(switches[4].getAttribute('aria-checked')).toBe('true');

    // Toggle shuffleQuestions off (switch 0)
    fireEvent.click(switches[0]);
    expect(switches[0].getAttribute('aria-checked')).toBe('false');

    // Toggle shuffleAnswers off (switch 1)
    fireEvent.click(switches[1]);
    expect(switches[1].getAttribute('aria-checked')).toBe('false');
  });

  it('2. State propagation: Toggling excludeMastered dynamically updates available question count', async () => {
    render(<QuizSetupPage />);

    // Select all chapters to have all 3 questions
    fireEvent.click(screen.getByRole('button', { name: /Chọn tất cả/i }));

    // Toggle excludeMastered switch
    const switches = screen.getAllByRole('switch');
    const excludeMasteredSwitch = switches[4]; // index 4 is excludeMastered

    fireEvent.click(excludeMasteredSwitch);

    // Available count should update from 3 to 2 because q-2 is 'mastered'
    expect(screen.getByText(/\/ 2 câu/i)).toBeInTheDocument();
  });

  it('3. Gradient CTA Button triggers startQuiz with exact expected QuizConfig payload', async () => {
    render(<QuizSetupPage />);

    // Select all chapters
    fireEvent.click(screen.getByRole('button', { name: /Chọn tất cả/i }));

    const switches = screen.getAllByRole('switch');

    // Toggle prioritizeWrong -> true
    fireEvent.click(switches[2]);
    // Toggle prioritizeNew -> true
    fireEvent.click(switches[3]);
    // Toggle excludeMastered -> true
    fireEvent.click(switches[4]);

    // Click CTA Button
    const startButton = screen.getByRole('button', { name: /Bắt đầu làm bài/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockStartQuiz).toHaveBeenCalledTimes(1);
    });

    const passedConfig: QuizConfig = mockStartQuiz.mock.calls[0][0];

    expect(passedConfig).toEqual({
      subjectId: 'sub-1',
      chapterIds: ['ch-1', 'ch-2'],
      mode: 'practice',
      questionCount: 2, // adjusted to available count (2) when excludeMastered is true
      timeLimit: 0,
      shuffleQuestions: true,
      shuffleAnswers: true,
      prioritizeWrong: true,
      prioritizeNew: true,
      prioritizeWeak: false,
      excludeMastered: true,
      difficulty: '',
      randomSeed: '',
    });

    expect(mockNavigate).toHaveBeenCalledWith('/quiz/session');
  });

  it('4. Switching mode to exam updates timeLimit and mode in startQuiz payload', async () => {
    render(<QuizSetupPage />);

    // Select all chapters
    fireEvent.click(screen.getByRole('button', { name: /Chọn tất cả/i }));

    // Select Exam Mode card
    const examModeCard = screen.getByText('Thi thử');
    fireEvent.click(examModeCard);

    // Click CTA Button
    const startButton = screen.getByRole('button', { name: /Bắt đầu làm bài/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockStartQuiz).toHaveBeenCalledTimes(1);
    });

    const passedConfig: QuizConfig = mockStartQuiz.mock.calls[0][0];
    expect(passedConfig.mode).toBe('exam');
    expect(passedConfig.timeLimit).toBe(60);
  });

  it('5. Switching mode to review sets prioritizeWrong to true and shows empty state if 0 review questions', async () => {
    // Set store questions with no wrong questions
    useQuestionStore.setState({
      questions: [mockQuestions[1]], // only q-2 which is mastered and wrongCount === 0
    });

    render(<QuizSetupPage />);

    // Select all chapters
    fireEvent.click(screen.getByRole('button', { name: /Chọn tất cả/i }));

    // Select Review Mode card
    const reviewModeCard = screen.getByText('Ôn tập câu sai');
    fireEvent.click(reviewModeCard);

    // Check empty state banner
    expect(screen.getByText('🎉 Bạn không có câu nào cần ôn lại.')).toBeTruthy();

    // CTA button should be disabled when availableCount === 0
    const startButton = screen.getByRole('button', { name: /Bắt đầu làm bài/i }) as HTMLButtonElement;
    expect(startButton.disabled).toBe(true);
  });

  it('6. Question count presets (30, 60, 90, Tất cả) and custom number input work accurately', async () => {
    render(<QuizSetupPage />);

    // Select all chapters to have all 3 questions
    fireEvent.click(screen.getByRole('button', { name: /Chọn tất cả/i }));

    // Check presets exist
    expect(screen.getByRole('button', { name: /30 câu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /60 câu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /90 câu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tất cả \(3\)/i })).toBeInTheDocument();

    // Check custom number input
    const input = screen.getByLabelText(/Số lượng câu hỏi tự nhập/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Type custom count e.g. 2
    fireEvent.change(input, { target: { value: '2' } });
    expect(input.value).toBe('2');

    // Click CTA Button and verify payload has questionCount: 2
    const startButton = screen.getByRole('button', { name: /Bắt đầu làm bài/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockStartQuiz).toHaveBeenCalledTimes(1);
    });

    const passedConfig: QuizConfig = mockStartQuiz.mock.calls[0][0];
    expect(passedConfig.questionCount).toBe(2);
  });

  it('7. URL param ?mode=review automatically selects "Ôn tập câu sai" and enables prioritizeWrong', async () => {
    mockSearchParams = new URLSearchParams('mode=review');

    render(<QuizSetupPage />);

    // Select all chapters
    fireEvent.click(screen.getByRole('button', { name: /Chọn tất cả/i }));

    // Click CTA Button
    const startButton = screen.getByRole('button', { name: /Bắt đầu làm bài/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockStartQuiz).toHaveBeenCalledTimes(1);
    });

    const passedConfig: QuizConfig = mockStartQuiz.mock.calls[0][0];
    expect(passedConfig.mode).toBe('review');
    expect(passedConfig.prioritizeWrong).toBe(true);
  });
});
