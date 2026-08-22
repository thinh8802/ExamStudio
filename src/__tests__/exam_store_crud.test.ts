import { describe, it, expect, beforeEach } from 'vitest';
import { useExamStore } from '../stores/exam-store';
import { db } from '../services/database';
import type { Exam, Question } from '../types';

describe('useExamStore - Exam & Blueprint CRUD operations', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.exams.clear();
    await db.blueprints.clear();
    await db.questions.clear();
    await db.attempts.clear();
  });

  it('should create, load, update, and delete an Exam in Dexie', async () => {
    const store = useExamStore.getState();

    // 1. Create
    const created = await store.createExam({
      name: 'Đề Thi Số 1',
      subjectId: 'sub-1',
      description: 'Mô tả đề thi số 1',
      questionIds: ['q-1', 'q-2'],
      questionCount: 2,
      timeLimit: 60,
      shuffleQuestions: true,
      shuffleAnswers: true,
      passingScore: 5.0,
      status: 'ready',
    });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Đề Thi Số 1');

    // 2. Load
    const list = await store.loadExams();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);

    // 3. Update
    const updated = await store.updateExam(created.id, { name: 'Đề Thi Số 1 (Đã sửa)' });
    expect(updated.name).toBe('Đề Thi Số 1 (Đã sửa)');

    const reloaded = await store.getExamById(created.id);
    expect(reloaded?.name).toBe('Đề Thi Số 1 (Đã sửa)');

    // 4. Duplicate
    const dup = await store.duplicateExam(created.id);
    expect(dup.id).not.toBe(created.id);
    expect(dup.name).toContain('(Bản sao)');

    // 5. Delete
    await store.deleteExam(created.id);
    const afterDelete = await store.loadExams();
    expect(afterDelete.some(e => e.id === created.id)).toBe(false);
  });

  it('should save, load, and clear manual exam draft', async () => {
    const store = useExamStore.getState();

    await store.saveDraft({
      name: 'Bản nháp toán',
      subjectId: 'sub-1',
      questionIds: ['q-10', 'q-20'],
      timeLimit: 30,
    });

    const draft = await store.loadDraft();
    expect(draft).not.toBeNull();
    expect(draft?.name).toBe('Bản nháp toán');
    expect(draft?.questionIds).toEqual(['q-10', 'q-20']);

    await store.clearDraft();
    const afterClear = await store.loadDraft();
    expect(afterClear).toBeNull();
  });

  it('should save, load, and delete Exam Blueprint', async () => {
    const store = useExamStore.getState();

    const bp = await store.saveBlueprint({
      name: 'Mẫu Đề Giữa Kỳ 45p',
      subjectId: 'sub-math',
      totalQuestions: 40,
      timeLimit: 45,
      chapterDistribution: [{ chapterId: 'c1', count: 20 }, { chapterId: 'c2', count: 20 }],
      difficultyDistribution: [{ difficulty: 'easy', percentage: 50 }, { difficulty: 'hard', percentage: 50 }],
    });

    expect(bp.id).toBeTruthy();

    const list = await store.loadBlueprints('sub-math');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('Mẫu Đề Giữa Kỳ 45p');

    await store.deleteBlueprint(bp.id);
    const afterDelete = await store.loadBlueprints();
    expect(afterDelete).toHaveLength(0);
  });

  it('should start exam attempt from stored exam snapshot', async () => {
    const mockQuestion: Question = {
      id: 'q-snap-1',
      subjectId: 'sub-1',
      chapterId: 'chap-1',
      topicId: 't-1',
      type: 'single_choice',
      difficulty: 'medium',
      content: 'Nội dung câu hỏi snapshot',
      answers: [
        { id: 'a1', label: 'A', content: 'Đáp án A', isCorrect: true },
        { id: 'a2', label: 'B', content: 'Đáp án B', isCorrect: false },
      ],
      correctAnswer: 'A',
      explanation: 'Giải thích',
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
    };

    await db.questions.put(mockQuestion);

    const exam = await useExamStore.getState().createExam({
      name: 'Đề Snapshot Test',
      subjectId: 'sub-1',
      description: '',
      questionIds: ['q-snap-1'],
      questionCount: 1,
      timeLimit: 30,
      shuffleQuestions: false,
      shuffleAnswers: false,
      status: 'ready',
      snapshotQuestions: [mockQuestion],
    });

    await useExamStore.getState().startExamById(exam.id, { mode: 'exam' });

    const state = useExamStore.getState();
    expect(state.currentAttempt).not.toBeNull();
    expect(state.currentAttempt?.examId).toBe(exam.id);
    expect(state.currentAttempt?.examName).toBe('Đề Snapshot Test');
    expect(state.currentAttempt?.totalQuestions).toBe(1);
    expect(state.currentQuestions).toHaveLength(1);
    expect(state.currentQuestions[0].id).toBe('q-snap-1');
  });
});
