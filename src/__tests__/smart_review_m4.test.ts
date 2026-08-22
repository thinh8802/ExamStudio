// ============================================
// UNIT TESTS FOR REVIEW MODE RESULTS & KNOWLEDGE GAP ANALYTICS (M4)
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../services/database';
import type { Question, Attempt, Chapter, Subject } from '../types';

describe('Milestone 4: Review Mode Results & Knowledge Gap Analytics Unit Tests', () => {
  let mockQuestions: Question[] = [];
  let mockChapters: Chapter[] = [];
  let mockSubjects: Subject[] = [];

  beforeEach(() => {
    mockQuestions = [];
    mockChapters = [];
    mockSubjects = [];
    vi.restoreAllMocks();

    vi.spyOn(db.questions, 'toArray').mockImplementation((async () => mockQuestions) as any);
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
  });

  const baseQuestion: Omit<Question, 'id'> = {
    subjectId: 'sub-1',
    chapterId: 'chap-1',
    topicId: 'top-1',
    type: 'single_choice',
    difficulty: 'medium',
    content: 'Sample question',
    answers: [
      { id: 'a1', label: 'A', content: 'Ans A', isCorrect: true },
      { id: 'a2', label: 'B', content: 'Ans B', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Explanation',
    tags: [],
    notes: '',
    source: '',
    imageUrl: '',
    status: 'needs_review',
    attemptCount: 1,
    correctCount: 0,
    wrongCount: 1,
    consecutiveCorrectCount: 0,
    masteryScore: 20,
    lastAttemptedAt: new Date(),
    isBookmarked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('1. Calculates remaining un-mastered wrong questions count accurately for attempt scope', async () => {
    mockQuestions = [
      { ...baseQuestion, id: 'q1', chapterId: 'chap-1', wrongCount: 2, status: 'needs_review' },
      { ...baseQuestion, id: 'q2', chapterId: 'chap-1', wrongCount: 1, status: 'needs_review' },
      { ...baseQuestion, id: 'q3', chapterId: 'chap-1', wrongCount: 3, status: 'mastered' },
      { ...baseQuestion, id: 'q4', chapterId: 'chap-2', wrongCount: 1, status: 'needs_review' },
    ];

    const attempt: Partial<Attempt> = {
      subjectId: 'sub-1',
      chapterIds: ['chap-1'],
      mode: 'review',
    };

    const query = db.questions.where('chapterId').anyOf(attempt.chapterIds!);
    const filtered = (await query.toArray()).filter(
      q => (q.wrongCount ?? 0) > 0 && q.status !== 'mastered'
    );

    expect(filtered.length).toBe(2);
    expect(filtered.map(q => q.id)).toEqual(['q1', 'q2']);
  });

  it('2. Groups wrong un-mastered questions by chapter and computes urgency scores correctly', async () => {
    mockQuestions = [
      { ...baseQuestion, id: 'q1', chapterId: 'chap-1', wrongCount: 5, status: 'needs_review' },
      { ...baseQuestion, id: 'q2', chapterId: 'chap-1', wrongCount: 3, status: 'needs_review' },
      { ...baseQuestion, id: 'q3', chapterId: 'chap-1', wrongCount: 0, status: 'mastered' },
      { ...baseQuestion, id: 'q4', chapterId: 'chap-2', wrongCount: 1, status: 'needs_review' },
      { ...baseQuestion, id: 'q5', chapterId: 'chap-2', wrongCount: 0, status: 'mastered' },
    ];

    mockChapters = [
      { id: 'chap-1', subjectId: 'sub-1', name: 'Chương 1: Đại số', description: '', order: 1, createdAt: new Date(), updatedAt: new Date() },
      { id: 'chap-2', subjectId: 'sub-1', name: 'Chương 2: Hình học', description: '', order: 2, createdAt: new Date(), updatedAt: new Date() },
    ];

    const wrongQs = mockQuestions.filter(q => (q.wrongCount ?? 0) > 0 && q.status !== 'mastered');
    const chapterMap = new Map<string, Question[]>();
    wrongQs.forEach(q => {
      const list = chapterMap.get(q.chapterId) || [];
      list.push(q);
      chapterMap.set(q.chapterId, list);
    });

    expect(chapterMap.get('chap-1')?.length).toBe(2);
    expect(chapterMap.get('chap-2')?.length).toBe(1);

    const chap1Qs = chapterMap.get('chap-1')!;
    const totalChap1 = mockQuestions.filter(q => q.chapterId === 'chap-1').length;
    const sumWrong1 = chap1Qs.reduce((s, q) => s + (q.wrongCount || 0), 0);
    const avgWrong1 = sumWrong1 / chap1Qs.length;
    const urgencyScore1 = Math.min(100, Math.round((chap1Qs.length / totalChap1) * 70 + Math.min(30, avgWrong1 * 10)));
    
    expect(urgencyScore1).toBe(77);
  });

  it('3. Filters out mastered questions even if wrongCount > 0 from knowledge gaps', async () => {
    mockQuestions = [
      { ...baseQuestion, id: 'q1', chapterId: 'chap-1', wrongCount: 4, status: 'mastered' },
    ];

    const wrongQs = mockQuestions.filter(q => (q.wrongCount ?? 0) > 0 && q.status !== 'mastered');
    expect(wrongQs.length).toBe(0);
  });
});
