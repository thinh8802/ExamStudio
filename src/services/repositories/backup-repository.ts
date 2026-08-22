// ============================================
// BACKUP REPOSITORY - Export, Restore & Clear
// ============================================
import { db } from '@/services/database';

export interface BackupData {
  version: number;
  exportedAt: string;
  subjects: any[];
  chapters: any[];
  topics: any[];
  questions: any[];
  attempts: any[];
  exams: any[];
  bookmarks?: any[];
  reports?: any[];
  settings?: any[];
}

export class BackupRepository {
  async exportBackupJSON(): Promise<BackupData> {
    const [subjects, chapters, topics, questions, attempts, exams, bookmarks, reports, settings] = await Promise.all([
      db.subjects.toArray(),
      db.chapters.toArray(),
      db.topics.toArray(),
      db.questions.toArray(),
      db.attempts.toArray(),
      db.exams.toArray(),
      db.bookmarks.toArray(),
      db.reports.toArray(),
      db.settings.toArray(),
    ]);

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      subjects,
      chapters,
      topics,
      questions,
      attempts,
      exams,
      bookmarks,
      reports,
      settings,
    };
  }

  async restoreBackupJSON(data: BackupData): Promise<void> {
    // 1. Validate JSON schema before touching existing DB
    if (!data || !data.version || !Array.isArray(data.subjects) || !Array.isArray(data.questions)) {
      throw new Error('Tệp backup không hợp lệ hoặc bị hư hỏng cấu trúc');
    }

    // 2. Perform restore within single atomic transaction to guarantee no data loss on error
    await db.transaction(
      'rw',
      [db.subjects, db.chapters, db.topics, db.questions, db.attempts, db.exams, db.bookmarks, db.reports, db.settings],
      async () => {
        // Clear old tables
        await Promise.all([
          db.subjects.clear(),
          db.chapters.clear(),
          db.topics.clear(),
          db.questions.clear(),
          db.attempts.clear(),
          db.exams.clear(),
          db.bookmarks.clear(),
          db.reports.clear(),
          db.settings.clear(),
        ]);

        // Bulk insert new tables
        if (data.subjects?.length) await db.subjects.bulkAdd(data.subjects);
        if (data.chapters?.length) await db.chapters.bulkAdd(data.chapters);
        if (data.topics?.length) await db.topics.bulkAdd(data.topics);
        if (data.questions?.length) await db.questions.bulkAdd(data.questions);
        if (data.attempts?.length) await db.attempts.bulkAdd(data.attempts);
        if (data.exams?.length) await db.exams.bulkAdd(data.exams);
        if (data.bookmarks?.length) await db.bookmarks.bulkAdd(data.bookmarks);
        if (data.reports?.length) await db.reports.bulkAdd(data.reports);
        if (data.settings?.length) await db.settings.bulkAdd(data.settings);
      }
    );
  }

  /**
   * Restore Replace with auto-backup snapshot and rollback capability
   */
  async restoreWithSafeBackup(data: BackupData): Promise<{ success: boolean; error?: string }> {
    let snapshot: BackupData | null = null;
    try {
      // 1. Create immediate snapshot
      snapshot = await this.exportBackupJSON();

      // 2. Perform replace restore
      await this.restoreBackupJSON(data);
      return { success: true };
    } catch (err: any) {
      console.error('Restore failed, attempting rollback...', err);
      if (snapshot) {
        try {
          await this.restoreBackupJSON(snapshot);
          return { success: false, error: `Phục hồi thất bại: ${err.message}. Đã tự động khôi phục dữ liệu ban đầu.` };
        } catch (rollbackErr: any) {
          return { success: false, error: `Lỗi nghiêm trọng trong quá trình rollback: ${rollbackErr.message}` };
        }
      }
      return { success: false, error: err.message || 'Lỗi không xác định' };
    }
  }

  /**
   * Restore Merge - Merge data without deleting existing history or records
   */
  async mergeBackupJSON(data: BackupData): Promise<{ importedQuestions: number; importedSubjects: number }> {
    if (!data || !Array.isArray(data.questions)) {
      throw new Error('Tệp backup không chứa dữ liệu câu hỏi hợp lệ');
    }

    let importedQuestions = 0;
    let importedSubjects = 0;

    await db.transaction(
      'rw',
      [db.subjects, db.chapters, db.topics, db.questions],
      async () => {
        // Merge subjects
        if (data.subjects?.length) {
          for (const s of data.subjects) {
            const exists = await db.subjects.get(s.id);
            if (!exists) {
              await db.subjects.add(s);
              importedSubjects++;
            }
          }
        }
        // Merge chapters
        if (data.chapters?.length) {
          for (const c of data.chapters) {
            const exists = await db.chapters.get(c.id);
            if (!exists) await db.chapters.add(c);
          }
        }
        // Merge topics
        if (data.topics?.length) {
          for (const t of data.topics) {
            const exists = await db.topics.get(t.id);
            if (!exists) await db.topics.add(t);
          }
        }
        // Merge questions
        if (data.questions?.length) {
          for (const q of data.questions) {
            const exists = await db.questions.get(q.id);
            if (!exists) {
              await db.questions.add(q);
              importedQuestions++;
            }
          }
        }
      }
    );

    return { importedQuestions, importedSubjects };
  }

  async clearAllData(): Promise<void> {
    await db.transaction(
      'rw',
      [db.subjects, db.chapters, db.topics, db.questions, db.attempts, db.exams, db.bookmarks, db.reports, db.settings],
      async () => {
        await Promise.all([
          db.subjects.clear(),
          db.chapters.clear(),
          db.topics.clear(),
          db.questions.clear(),
          db.attempts.clear(),
          db.exams.clear(),
          db.bookmarks.clear(),
          db.reports.clear(),
          db.settings.clear(),
        ]);
      }
    );
  }
}

export const backupRepository = new BackupRepository();
