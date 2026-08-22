import { describe, it, expect } from 'vitest';
import { ExamBuilderService, createPRNG } from '../services/exam-builder-service';
import type { Question, Chapter, Difficulty } from '../types';

const mockChapters: Chapter[] = [
  { id: 'chap-1', subjectId: 'sub-1', name: 'Chương 1: Hàm số', description: '', order: 1, createdAt: new Date() },
  { id: 'chap-2', subjectId: 'sub-1', name: 'Chương 2: Mũ & Logarit', description: '', order: 2, createdAt: new Date() },
  { id: 'chap-3', subjectId: 'sub-1', name: 'Chương 3: Nguyên hàm', description: '', order: 3, createdAt: new Date() },
];

const createMockQuestion = (id: string, chapterId: string, difficulty: Difficulty, extra: Partial<Question> = {}): Question => ({
  id,
  subjectId: 'sub-1',
  chapterId,
  topicId: 'topic-1',
  type: 'single_choice',
  difficulty,
  content: `Nội dung câu hỏi ${id}`,
  answers: [
    { id: 'a1', label: 'A', content: 'Đáp án A', isCorrect: true },
    { id: 'a2', label: 'B', content: 'Đáp án B', isCorrect: false },
    { id: 'a3', label: 'C', content: 'Đáp án C', isCorrect: false },
    { id: 'a4', label: 'D', content: 'Đáp án D', isCorrect: false },
  ],
  correctAnswer: 'A',
  explanation: 'Giải thích chi tiết',
  tags: [],
  notes: '',
  source: '',
  imageUrl: '',
  status: 'new',
  attemptCount: 0,
  correctCount: 0,
  wrongCount: 0,
  masteryScore: 0,
  lastAttemptedAt: null,
  isBookmarked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...extra,
});

// Build 30 mock questions: 10 per chapter (3 easy, 4 medium, 2 hard, 1 very_hard)
const mockQuestions: Question[] = [];
mockChapters.forEach((ch, cIdx) => {
  ['easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'very_hard'].forEach((diff, dIdx) => {
    mockQuestions.push(createMockQuestion(`q-c${cIdx + 1}-${dIdx + 1}`, ch.id, diff as Difficulty));
  });
});

describe('ExamBuilderService - Matrix Validation & Generation', () => {
  it('should validate a valid matrix successfully', () => {
    const res = ExamBuilderService.validateMatrix(
      'sub-1',
      10,
      [
        { chapterId: 'chap-1', count: 4 },
        { chapterId: 'chap-2', count: 3 },
        { chapterId: 'chap-3', count: 3 },
      ],
      [
        { difficulty: 'easy', percentage: 30 },
        { difficulty: 'medium', percentage: 40 },
        { difficulty: 'hard', percentage: 20 },
        { difficulty: 'very_hard', percentage: 10 },
      ],
      mockQuestions,
      mockChapters
    );

    expect(res.isValid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.totalRequested).toBe(10);
    expect(res.totalAvailable).toBe(30);
  });

  it('should detect chapter count shortages', () => {
    const res = ExamBuilderService.validateMatrix(
      'sub-1',
      20,
      [
        { chapterId: 'chap-1', count: 15 }, // Only 10 available
        { chapterId: 'chap-2', count: 5 },
      ],
      [
        { difficulty: 'easy', percentage: 50 },
        { difficulty: 'medium', percentage: 50 },
      ],
      mockQuestions,
      mockChapters
    );

    expect(res.isValid).toBe(false);
    expect(res.chapterIssues).toHaveLength(1);
    expect(res.chapterIssues[0].missing).toBe(5);
    expect(res.errors.some(e => e.includes('Chương 1'))).toBe(true);
  });

  it('should generate an exam with exact requested questions count and no duplicates', () => {
    const res = ExamBuilderService.generateExamFromMatrix(
      {
        subjectId: 'sub-1',
        name: 'Đề Thi Thử Nghiệm',
        totalQuestions: 12,
        timeLimit: 45,
        chapterDistribution: [
          { chapterId: 'chap-1', count: 4 },
          { chapterId: 'chap-2', count: 4 },
          { chapterId: 'chap-3', count: 4 },
        ],
        difficultyDistribution: [
          { difficulty: 'easy', percentage: 30 },
          { difficulty: 'medium', percentage: 40 },
          { difficulty: 'hard', percentage: 20 },
          { difficulty: 'very_hard', percentage: 10 },
        ],
        generationSeed: 'test-seed-12345',
      },
      mockQuestions,
      mockChapters
    );

    expect(res.questions).toHaveLength(12);
    expect(res.exam.questionCount).toBe(12);
    expect(res.exam.questionIds).toHaveLength(12);

    // Verify zero duplicates
    const uniqueIds = new Set(res.questions.map(q => q.id));
    expect(uniqueIds.size).toBe(12);
    expect(res.seed).toBe('test-seed-12345');
  });

  it('should guarantee reproducibility when using the same seed', () => {
    const params = {
      subjectId: 'sub-1',
      name: 'Đề Seed Test',
      totalQuestions: 8,
      timeLimit: 30,
      chapterDistribution: [
        { chapterId: 'chap-1', count: 4 },
        { chapterId: 'chap-2', count: 4 },
      ],
      difficultyDistribution: [
        { difficulty: 'easy', percentage: 50 },
        { difficulty: 'medium', percentage: 50 },
      ],
      generationSeed: 'fixed-seed-abc',
    };

    const run1 = ExamBuilderService.generateExamFromMatrix(params, mockQuestions, mockChapters);
    const run2 = ExamBuilderService.generateExamFromMatrix(params, mockQuestions, mockChapters);

    expect(run1.questions.map(q => q.id)).toEqual(run2.questions.map(q => q.id));
  });

  it('should reroll a question with the same chapter and difficulty without duplicates', () => {
    const currentQ = mockQuestions[0]; // chap-1, easy
    const examQuestionIds = [currentQ.id, mockQuestions[1].id]; // q-c1-1, q-c1-2

    const rerolled = ExamBuilderService.rerollQuestion({
      currentQuestionId: currentQ.id,
      examQuestionIds,
      subjectId: 'sub-1',
      chapterId: currentQ.chapterId,
      difficulty: currentQ.difficulty,
      allQuestions: mockQuestions,
      seed: 'reroll-seed-1',
    });

    expect(rerolled).not.toBeNull();
    expect(rerolled!.id).not.toBe(currentQ.id);
    expect(examQuestionIds).not.toContain(rerolled!.id);
    expect(rerolled!.chapterId).toBe(currentQ.chapterId);
    expect(rerolled!.difficulty).toBe(currentQ.difficulty);
  });

  it('should duplicate an exam with a new id, timestamps, and copy title', () => {
    const originalExam = {
      id: 'exam-orig-1',
      name: 'Đề Toán Học Kỳ I',
      subjectId: 'sub-1',
      description: 'Mô tả',
      questionIds: ['q-1', 'q-2', 'q-3'],
      questionCount: 3,
      timeLimit: 45,
      shuffleQuestions: true,
      shuffleAnswers: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    const duplicate = ExamBuilderService.duplicateExam(originalExam);

    expect(duplicate.id).not.toBe(originalExam.id);
    expect(duplicate.name).toBe('Đề Toán Học Kỳ I (Bản sao)');
    expect(duplicate.questionIds).toEqual(originalExam.questionIds);
    expect(duplicate.createdAt.getTime()).toBeGreaterThan(originalExam.createdAt.getTime());
  });

  it('should export exam to structured JSON', () => {
    const exam = {
      id: 'exam-exp-1',
      name: 'Đề Xuất JSON',
      subjectId: 'sub-1',
      description: 'Mô tả xuất file',
      questionIds: ['q-c1-1'],
      questionCount: 1,
      timeLimit: 45,
      shuffleQuestions: false,
      shuffleAnswers: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const jsonStr = ExamBuilderService.exportExamJSON(exam, [mockQuestions[0]]);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.version).toBe('1.0');
    expect(parsed.exam.id).toBe('exam-exp-1');
    expect(parsed.questions).toHaveLength(1);
    expect(parsed.questions[0].id).toBe('q-c1-1');
  });
});
