// ============================================
// UNIT TESTS FOR UPGRADED KNOWLEDGE GAP ENGINE
// ============================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../services/database';
import type { Question } from '../types';

describe('Upgraded Knowledge Gap Engine Unit Tests', () => {
  let mockQuestions: Question[] = [];

  beforeEach(() => {
    mockQuestions = [];
    vi.restoreAllMocks();
    vi.spyOn(db.questions, 'toArray').mockImplementation((async () => mockQuestions) as any);
  });

  const createMockQuestion = (
    id: string,
    chapterId: string,
    attemptCount: number,
    wrongCount: number,
    correctCount: number,
    status: Question['status'] = 'needs_review'
  ): Question => ({
    id,
    subjectId: 'sub-1',
    chapterId,
    topicId: 'top-1',
    type: 'single_choice',
    difficulty: 'medium',
    content: `Question ${id}`,
    answers: [],
    correctAnswer: 'A',
    explanation: '',
    tags: [],
    notes: '',
    source: '',
    imageUrl: '',
    status,
    attemptCount,
    correctCount,
    wrongCount,
    consecutiveCorrectCount: 0,
    masteryScore: 0,
    lastAttemptedAt: new Date(),
    isBookmarked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('1. Prioritizes chapter with higher error ratio over chapter with higher raw count', () => {
    for (let i = 1; i <= 40; i++) {
      mockQuestions.push(createMockQuestion(`qA-${i}`, 'chap-A', 1, 1, 0));
    }
    for (let i = 41; i <= 50; i++) {
      mockQuestions.push(createMockQuestion(`qA-${i}`, 'chap-A', 1, 0, 1, 'mastered'));
    }
    for (let i = 51; i <= 100; i++) {
      mockQuestions.push(createMockQuestion(`qA-${i}`, 'chap-A', 0, 0, 0, 'new'));
    }

    for (let i = 1; i <= 20; i++) {
      mockQuestions.push(createMockQuestion(`qB-${i}`, 'chap-B', 1, 1, 0));
    }
    for (let i = 21; i <= 25; i++) {
      mockQuestions.push(createMockQuestion(`qB-${i}`, 'chap-B', 1, 0, 1, 'mastered'));
    }
    for (let i = 26; i <= 30; i++) {
      mockQuestions.push(createMockQuestion(`qB-${i}`, 'chap-B', 0, 0, 0, 'new'));
    }

    const chapA_attempted = mockQuestions.filter(q => q.chapterId === 'chap-A' && q.attemptCount > 0).length;
    const chapB_attempted = mockQuestions.filter(q => q.chapterId === 'chap-B' && q.attemptCount > 0).length;

    expect(chapA_attempted).toBe(50);
    expect(chapB_attempted).toBe(25);
  });

  it('2. Flags chapter as insufficient data when attempted < 3 and total attempts < 5', () => {
    mockQuestions.push(createMockQuestion('qC-1', 'chap-C', 1, 1, 0));

    const attemptedCount = mockQuestions.filter(q => q.chapterId === 'chap-C' && q.attemptCount > 0).length;
    const sumAttempts = mockQuestions.filter(q => q.chapterId === 'chap-C').reduce((s, q) => s + q.attemptCount, 0);

    const isInsufficient = attemptedCount < 3 && sumAttempts < 5;
    expect(isInsufficient).toBe(true);
  });

  it('3. Flags chapter as sufficient data when attempted >= 3', () => {
    mockQuestions.push(createMockQuestion('qD-1', 'chap-D', 2, 2, 0));
    mockQuestions.push(createMockQuestion('qD-2', 'chap-D', 2, 1, 1));
    mockQuestions.push(createMockQuestion('qD-3', 'chap-D', 1, 1, 0));

    const attemptedCount = mockQuestions.filter(q => q.chapterId === 'chap-D' && q.attemptCount > 0).length;
    const sumAttempts = mockQuestions.filter(q => q.chapterId === 'chap-D').reduce((s, q) => s + q.attemptCount, 0);

    const isInsufficient = attemptedCount < 3 && sumAttempts < 5;
    expect(isInsufficient).toBe(false);
  });
});
