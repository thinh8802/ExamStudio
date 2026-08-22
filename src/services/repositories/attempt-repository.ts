// ============================================
// ATTEMPT REPOSITORY - Quiz Sessions & Transactions
// ============================================
import { db } from '@/services/database';
import type { Attempt, Question } from '@/types';

const UNFINISHED_ATTEMPT_KEY = 'quiz_auto_save';

export class AttemptRepository {
  async submitQuizTransaction(
    completedAttempt: Attempt,
    questionUpdates: { id: string; changes: Partial<Question> }[]
  ): Promise<void> {
    await db.transaction('rw', [db.questions, db.attempts], async () => {
      await db.attempts.add(completedAttempt);
      for (const update of questionUpdates) {
        await db.questions.update(update.id, update.changes);
      }
    });
  }

  async loadAttemptHistory(): Promise<Attempt[]> {
    const all = await db.attempts.toArray();
    return all
      .filter(a => a.isCompleted)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async getAttemptById(id: string): Promise<Attempt | undefined> {
    return db.attempts.get(id);
  }

  async deleteAttempt(id: string): Promise<void> {
    await db.attempts.delete(id);
  }

  // --- Unfinished Attempt Persistence & Recovery ---
  async saveUnfinishedAttempt(attempt: Attempt, elapsedTime: number): Promise<void> {
    if (attempt.isCompleted) return;
    const saveData = {
      attempt,
      elapsedTime,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(UNFINISHED_ATTEMPT_KEY, JSON.stringify(saveData));
  }

  async getUnfinishedAttempt(): Promise<{ attempt: Attempt; elapsedTime: number } | null> {
    const saved = localStorage.getItem(UNFINISHED_ATTEMPT_KEY);
    if (!saved) return null;
    try {
      const data = JSON.parse(saved);
      return {
        attempt: data.attempt as Attempt,
        elapsedTime: data.elapsedTime || 0,
      };
    } catch {
      localStorage.removeItem(UNFINISHED_ATTEMPT_KEY);
      return null;
    }
  }

  async clearUnfinishedAttempt(): Promise<void> {
    localStorage.removeItem(UNFINISHED_ATTEMPT_KEY);
  }
}

export const attemptRepository = new AttemptRepository();
