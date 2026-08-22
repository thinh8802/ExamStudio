import { describe, it, expect } from 'vitest';
import { ExamExportService, type ExportExamConfig } from '../services/exam-export-service';
import type { Exam, Question } from '../types';

describe('ExamExportService', () => {
  const mockQuestions: Question[] = [
    {
      id: 'Q-001',
      subjectId: 'SUB-1',
      chapterId: 'CH-1',
      topicId: 'TP-1',
      type: 'single_choice',
      difficulty: 'easy',
      content: 'Cho hàm số $y = f(x)$. Đạo hàm của $x^2$ là:',
      answers: [
        { id: 'A1', label: 'A', content: '$2x$', isCorrect: true },
        { id: 'A2', label: 'B', content: '$x$', isCorrect: false },
        { id: 'A3', label: 'C', content: '$x^3$', isCorrect: false },
        { id: 'A4', label: 'D', content: '$2$', isCorrect: false },
      ],
      correctAnswer: 'A',
      explanation: 'Đạo hàm của $x^n$ là $n x^{n-1}$',
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
    },
    {
      id: 'Q-002',
      subjectId: 'SUB-1',
      chapterId: 'CH-1',
      topicId: 'TP-1',
      type: 'single_choice',
      difficulty: 'medium',
      content: 'Tích phân $\\int_0^1 x dx$ bằng:',
      answers: [
        { id: 'B1', label: 'A', content: '1', isCorrect: false },
        { id: 'B2', label: 'B', content: '1/2', isCorrect: true },
        { id: 'B3', label: 'C', content: '2', isCorrect: false },
        { id: 'B4', label: 'D', content: '0', isCorrect: false },
      ],
      correctAnswer: 'B',
      explanation: 'Nguyên hàm của $x$ là $x^2/2$',
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
    },
  ];

  const mockExam: Exam = {
    id: 'EXAM-001',
    name: 'Đề Thi Thử Toán Học 2026',
    subjectId: 'SUB-1',
    description: 'Đề thi thử',
    questionIds: ['Q-001', 'Q-002'],
    questionCount: 2,
    timeLimit: 50,
    shuffleQuestions: true,
    shuffleAnswers: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('generates single variant correctly with answer keys', () => {
    const config: ExportExamConfig = {
      title: 'KỲ THI THỬ',
      schoolName: 'TRƯỜNG CHUYÊN',
      subjectName: 'TOÁN HỌC',
      timeLimit: 50,
      codeCount: 1,
      baseCode: 101,
      includeAnswers: false,
      includeAnswerKeyTable: true,
      includeExplanations: true,
    };

    const variants = ExamExportService.generateVariants(mockExam, mockQuestions, config);
    expect(variants).toHaveLength(1);
    expect(variants[0].code).toBe('101');
    expect(variants[0].questions).toHaveLength(2);
    expect(variants[0].answerKey).toHaveLength(2);
  });

  it('generates 4 distinct test codes with unique shuffling', () => {
    const config: ExportExamConfig = {
      title: 'KỲ THI THỬ',
      schoolName: 'TRƯỜNG CHUYÊN',
      subjectName: 'TOÁN HỌC',
      timeLimit: 50,
      codeCount: 4,
      baseCode: 101,
      includeAnswers: false,
      includeAnswerKeyTable: true,
      includeExplanations: false,
    };

    const variants = ExamExportService.generateVariants(mockExam, mockQuestions, config);
    expect(variants).toHaveLength(4);
    expect(variants.map(v => v.code)).toEqual(['101', '102', '103', '104']);

    // Each variant has its own answer key
    variants.forEach(v => {
      expect(v.answerKey).toHaveLength(2);
      expect(['A', 'B', 'C', 'D']).toContain(v.answerKey[0].correctLabel);
    });
  });
});
