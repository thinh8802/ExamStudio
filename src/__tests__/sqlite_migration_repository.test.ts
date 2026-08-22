// ============================================
// UNIT TESTS FOR REPOSITORY LAYER & MIGRATION SERVICE
// ============================================
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../services/database';
import { subjectRepository } from '../services/repositories/subject-repository';
import { questionRepository } from '../services/repositories/question-repository';
import { attemptRepository } from '../services/repositories/attempt-repository';
import { backupRepository } from '../services/repositories/backup-repository';
import { migrationService } from '../services/migration-service';
import {
  mapQuestionToSqlite, mapQuestionFromSqlite,
  mapSubjectToSqlite, mapSubjectFromSqlite,
  mapAttemptToSqlite, mapAttemptFromSqlite,
} from '../services/repositories/db-adapter';
import type { Question, Subject, Attempt } from '../types';

describe('Repository Layer & SQLite Schema DTO Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Correctly maps Question entity <-> SqliteQuestionDTO (boolean <-> 0/1, Date <-> ISO, tags <-> JSON)', () => {
    const question: Question = {
      id: 'Q-000001',
      subjectId: 'sub-1',
      chapterId: 'chap-1',
      topicId: 'top-1',
      type: 'single_choice',
      difficulty: 'medium',
      content: 'Sample Question Content',
      answers: [
        { id: 'a1', label: 'A', content: 'Choice A', isCorrect: true },
        { id: 'a2', label: 'B', content: 'Choice B', isCorrect: false },
      ],
      correctAnswer: 'A',
      explanation: 'Explanation text',
      tags: ['math', 'algebra'],
      notes: 'Note text',
      source: 'Exam 2026',
      imageUrl: '',
      status: 'learning',
      attemptCount: 5,
      correctCount: 4,
      wrongCount: 1,
      consecutiveCorrectCount: 2,
      masteryScore: 80,
      lastAttemptedAt: new Date('2026-08-13T10:00:00.000Z'),
      isBookmarked: true,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-13T10:00:00.000Z'),
    };

    const dto = mapQuestionToSqlite(question);
    expect(dto.id).toBe('Q-000001');
    expect(dto.is_bookmarked).toBe(1);
    expect(dto.tags_json).toBe('["math","algebra"]');
    expect(dto.attempt_count).toBe(5);

    const remapped = mapQuestionFromSqlite(dto, question.answers);
    expect(remapped.id).toBe(question.id);
    expect(remapped.isBookmarked).toBe(true);
    expect(remapped.tags).toEqual(['math', 'algebra']);
    expect(remapped.answers).toHaveLength(2);
  });

  it('2. Correctly queries subject cascading delete counts', async () => {
    vi.spyOn(db.subjects, 'get').mockResolvedValue({ id: 'sub-1', name: 'Môn toán' } as any);
    vi.spyOn(db.chapters, 'where').mockImplementation(() => ({
      equals: () => ({
        toArray: async () => [{ id: 'ch-1' }, { id: 'ch-2' }],
      }),
    }) as any);

    vi.spyOn(db.topics, 'where').mockImplementation(() => ({
      anyOf: () => ({
        count: async () => 5,
      }),
    }) as any);

    vi.spyOn(db.questions, 'where').mockImplementation(() => ({
      equals: () => ({
        count: async () => 42,
      }),
    }) as any);

    const counts = await subjectRepository.querySubjectDeleteCounts('sub-1');
    expect(counts.subjectId).toBe('sub-1');
    expect(counts.chapterCount).toBe(2);
    expect(counts.topicCount).toBe(5);
    expect(counts.questionCount).toBe(42);
  });


  it('3. BackupRepository exports complete JSON structure with version tag', async () => {
    vi.spyOn(db.subjects, 'toArray').mockResolvedValue([{ id: 'sub-1' }] as any);
    vi.spyOn(db.chapters, 'toArray').mockResolvedValue([]);
    vi.spyOn(db.topics, 'toArray').mockResolvedValue([]);
    vi.spyOn(db.questions, 'toArray').mockResolvedValue([]);
    vi.spyOn(db.attempts, 'toArray').mockResolvedValue([]);
    vi.spyOn(db.exams, 'toArray').mockResolvedValue([]);
    vi.spyOn(db.bookmarks, 'toArray').mockResolvedValue([]);
    vi.spyOn(db.reports, 'toArray').mockResolvedValue([]);
    vi.spyOn(db.settings, 'toArray').mockResolvedValue([]);

    const backup = await backupRepository.exportBackupJSON();
    expect(backup.version).toBe(1);
    expect(backup.subjects).toHaveLength(1);
    expect(backup.exportedAt).toBeDefined();
  });

  it('4. MigrationService returns source record counts for verification', async () => {
    vi.spyOn(db.subjects, 'count').mockResolvedValue(2);
    vi.spyOn(db.chapters, 'count').mockResolvedValue(5);
    vi.spyOn(db.topics, 'count').mockResolvedValue(10);
    vi.spyOn(db.questions, 'count').mockResolvedValue(100);
    vi.spyOn(db.attempts, 'count').mockResolvedValue(15);
    vi.spyOn(db.bookmarks, 'count').mockResolvedValue(4);
    vi.spyOn(db.reports, 'count').mockResolvedValue(0);
    vi.spyOn(db.settings, 'count').mockResolvedValue(9);
    vi.spyOn(db.questions, 'toArray').mockResolvedValue([]);
    vi.spyOn(db.attempts, 'toArray').mockResolvedValue([]);

    const counts = await migrationService.getSourceCounts();
    expect(counts.subjects).toBe(2);
    expect(counts.chapters).toBe(5);
    expect(counts.questions).toBe(100);
    expect(counts.attempts).toBe(15);
  });
});
