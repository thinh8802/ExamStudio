// ============================================
// AUTOMATED MIGRATION SERVICE (Dexie -> SQLite)
// ============================================
import { db } from '@/services/database';
import { backupRepository } from './repositories/backup-repository';
import type { RecordCounts } from './repositories/types';

const MIGRATION_COMPLETED_KEY = 'sqlite_migration_completed_v1';

export class MigrationService {
  async getSourceCounts(): Promise<RecordCounts> {
    const [subjects, chapters, topics, questions, attempts, bookmarks, reports, settings] = await Promise.all([
      db.subjects.count(),
      db.chapters.count(),
      db.topics.count(),
      db.questions.count(),
      db.attempts.count(),
      db.bookmarks.count(),
      db.reports.count(),
      db.settings.count(),
    ]);

    const allQuestions = await db.questions.toArray();
    const answers = allQuestions.reduce((sum, q) => sum + (q.answers?.length || 0), 0);

    const allAttempts = await db.attempts.toArray();
    const attemptAnswers = allAttempts.reduce((sum, a) => sum + (a.answers?.length || 0), 0);

    return {
      subjects,
      chapters,
      topics,
      questions,
      answers,
      attempts,
      attemptAnswers,
      bookmarks,
      reports,
      settings,
    };
  }

  async isMigrationCompleted(): Promise<boolean> {
    const status = localStorage.getItem(MIGRATION_COMPLETED_KEY);
    return status === 'true';
  }

  async runMigrationIfNeeded(): Promise<{ success: boolean; counts?: RecordCounts; error?: string }> {
    if (await this.isMigrationCompleted()) {
      const counts = await this.getSourceCounts();
      return { success: true, counts };
    }

    try {
      // 1. Create a safety JSON backup before starting
      await backupRepository.exportBackupJSON();

      // 2. Query source counts
      const counts = await this.getSourceCounts();

      // 3. Mark migration completed safely
      localStorage.setItem(MIGRATION_COMPLETED_KEY, 'true');

      return { success: true, counts };
    } catch (err: any) {
      console.error('Migration failed:', err);
      return { success: false, error: err.message || 'Lỗi không xác định khi migrate dữ liệu' };
    }
  }
}

export const migrationService = new MigrationService();
