// ============================================
// DEXIE.JS DATABASE - IndexedDB Layer
// ============================================
import Dexie, { type Table } from 'dexie';
import type {
  Subject, Chapter, Topic, Question, Exam, ExamBlueprint,
  Attempt, Bookmark, QuestionReport, AppSettings,
  FlashcardDeck, Flashcard, FlashcardReview
} from '@/types';

// --- Database Schema Version 1 ---
export class QuizDatabase extends Dexie {
  subjects!: Table<Subject, string>;
  chapters!: Table<Chapter, string>;
  topics!: Table<Topic, string>;
  questions!: Table<Question, string>;
  exams!: Table<Exam, string>;
  blueprints!: Table<ExamBlueprint, string>;
  attempts!: Table<Attempt, string>;
  bookmarks!: Table<Bookmark, string>;
  reports!: Table<QuestionReport, string>;
  settings!: Table<AppSettings, string>;
  flashcard_decks!: Table<FlashcardDeck, string>;
  flashcards!: Table<Flashcard, string>;
  flashcard_reviews!: Table<FlashcardReview, string>;

  constructor() {
    super('QuizAppDB');

    this.version(1).stores({
      subjects: 'id, name, order, createdAt',
      chapters: 'id, subjectId, order, [subjectId+order], createdAt',
      topics: 'id, chapterId, subjectId, order, [chapterId+order], createdAt',
      questions: 'id, subjectId, chapterId, topicId, type, difficulty, status, isBookmarked, masteryScore, *tags, createdAt, updatedAt',
      exams: 'id, subjectId, createdAt',
      blueprints: 'id, subjectId, createdAt',
      attempts: 'id, examId, mode, subjectId, isCompleted, startedAt, completedAt',
      bookmarks: 'id, questionId, createdAt',
      reports: 'id, questionId, type, isResolved, createdAt',
      settings: 'key',
    });

    // Version 2 Schema: Indexed tracking fields & automatic upgrade migration
    this.version(2).stores({
      questions: 'id, subjectId, chapterId, topicId, type, difficulty, status, wrongCount, attemptCount, consecutiveCorrectCount, isBookmarked, masteryScore, *tags, createdAt, updatedAt',
    }).upgrade(tx => {
      return tx.table('questions').toCollection().modify((q: Partial<Question>) => {
        if (q.consecutiveCorrectCount === undefined) q.consecutiveCorrectCount = 0;
        if (q.wrongCount === undefined) q.wrongCount = 0;
        if (q.attemptCount === undefined) q.attemptCount = 0;
        if (q.correctCount === undefined) q.correctCount = 0;
        if (!q.status) q.status = 'new';
      });
    });

    // Version 3: Recalculate mastery status with new threshold (85% / 3 consecutive)
    this.version(3).stores({}).upgrade(tx => {
      return tx.table('questions').toCollection().modify((q: Partial<Question>) => {
        const attemptCount = q.attemptCount || 0;
        if (attemptCount === 0) {
          q.status = 'new';
          return;
        }
        const correctCount = q.correctCount || 0;
        const consecutiveCorrect = q.consecutiveCorrectCount || 0;
        const masteryScore = Math.round((correctCount / attemptCount) * 100);
        q.masteryScore = masteryScore;

        if (consecutiveCorrect >= 3 || (masteryScore >= 85 && attemptCount >= 3)) {
          q.status = 'mastered';
        } else if (correctCount > 0) {
          q.status = (q.wrongCount || 0) > 0 ? 'needs_review' : 'learning';
        } else {
          q.status = 'needs_review';
        }
      });
    });

    // Version 4: Thêm hệ thống Flashcard & Spaced Repetition
    this.version(4).stores({
      flashcard_decks: 'id, name, subjectId, chapterId, topicId, source, createdAt, updatedAt',
      flashcards: 'id, deckId, questionId, reviewState, dueAt, lastReviewedAt, createdAt',
      flashcard_reviews: 'id, flashcardId, rating, reviewedAt',
    });

    // Version 5: Thêm status index cho exams
    this.version(5).stores({
      exams: 'id, subjectId, status, createdAt',
    }).upgrade(tx => {
      return tx.table('exams').toCollection().modify((e: Partial<Exam>) => {
        if (!e.status) e.status = 'ready';
      });
    });
  }
}

// Singleton instance
export const db = new QuizDatabase();

// --- ID Generators ---

let questionCounter: number | null = null;

export async function generateQuestionId(): Promise<string> {
  if (questionCounter === null) {
    const allQuestions = await db.questions.toArray();
    let maxId = 0;
    for (const q of allQuestions) {
      if (q.id && q.id.startsWith('Q-')) {
        const num = parseInt(q.id.replace('Q-', ''), 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
    questionCounter = maxId;
  }
  questionCounter++;
  return `Q-${String(questionCounter).padStart(6, '0')}`;
}

export function generateId(): string {
  return crypto.randomUUID();
}

// --- Default Settings ---

export const DEFAULT_SETTINGS: Record<string, string> = {
  theme: 'light',
  language: 'vi',
  fontSize: 'medium',
  soundEnabled: 'true',
  defaultTimeLimit: '60',
  defaultQuestionCount: '20',
  defaultShuffleQuestions: 'true',
  defaultShuffleAnswers: 'true',
  showExplanation: 'true',
  masteryScoreThreshold: '80',
  easyDifficultyThreshold: '70',
  hardDifficultyThreshold: '60',
};

export async function initializeSettings(): Promise<void> {
  const existingKeys = await db.settings.toCollection().primaryKeys();
  const missing = Object.entries(DEFAULT_SETTINGS).filter(
    ([key]) => !existingKeys.includes(key)
  );
  if (missing.length > 0) {
    await db.settings.bulkAdd(
      missing.map(([key, value]) => ({ key, value }))
    );
  }
}

export async function getSetting(key: string): Promise<string> {
  const record = await db.settings.get(key);
  return record?.value ?? DEFAULT_SETTINGS[key] ?? '';
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

// --- Helper: Reset counter on DB changes ---
export function resetQuestionCounter(): void {
  questionCounter = null;
}

// --- Mastery & Adaptive Difficulty Recalculation ---
// Runs on every loadQuestions to guarantee data consistency.
// Mastery: 85% accuracy with 3+ attempts, OR 3+ consecutive correct
// Adaptive difficulty: correctCount > 3 → easy, wrongCount >= 3 → hard
const MASTERY_RECALC_KEY = 'mastery_recalc_v6';

export async function recalculateMasteryAndDifficulty(): Promise<void> {
  // Only run once per session to avoid repeated bulk writes
  const alreadyRan = sessionStorage.getItem(MASTERY_RECALC_KEY);
  if (alreadyRan) return;

  const masteryThreshold = parseInt(await getSetting('masteryScoreThreshold'), 10) || 80;
  const easyThreshold = parseInt(await getSetting('easyDifficultyThreshold'), 10) || 70;
  const hardThreshold = parseInt(await getSetting('hardDifficultyThreshold'), 10) || 60;

  const allQuestions = await db.questions.toArray();
  const updates: { id: string; changes: Partial<Question> }[] = [];

  for (const q of allQuestions) {
    const attemptCount = q.attemptCount || 0;
    const correctCount = q.correctCount || 0;
    const wrongCount = q.wrongCount || 0;
    const consecutiveCorrect = q.consecutiveCorrectCount || 0;
    const changes: Partial<Question> = {};

    // --- Recalculate status ---
    if (attemptCount === 0) {
      if (q.status !== 'new' && q.status !== 'unattempted') {
        changes.status = 'new';
      }
    } else {
      const masteryScore = Math.round((correctCount / attemptCount) * 100);
      if (q.masteryScore !== masteryScore) {
        changes.masteryScore = masteryScore;
      }

      let newStatus: Question['status'];
      if (consecutiveCorrect >= 2 || (masteryScore >= masteryThreshold && attemptCount >= 3)) {
        newStatus = 'mastered';
      } else if (consecutiveCorrect >= 1 || (correctCount > 0 && wrongCount === 0)) {
        newStatus = 'learning';
      } else if (wrongCount > 0) {
        newStatus = 'needs_review';
      } else {
        newStatus = 'new';
      }

      if (q.status !== newStatus) {
        changes.status = newStatus;
      }
    }

    // --- Adaptive difficulty ---
    if (attemptCount >= 3) {
      const correctRatio = Math.round((correctCount / attemptCount) * 100);
      const wrongRatio = Math.round((wrongCount / attemptCount) * 100);
      let newDifficulty = q.difficulty;
      
      if (correctRatio >= easyThreshold) {
        newDifficulty = 'easy';
      } else if (wrongRatio >= hardThreshold) {
        newDifficulty = wrongRatio > 80 ? 'very_hard' : 'hard';
      } else {
        newDifficulty = 'medium';
      }
      
      if (newDifficulty !== q.difficulty) {
        changes.difficulty = newDifficulty;
      }
    }

    if (Object.keys(changes).length > 0) {
      updates.push({ id: q.id, changes });
    }
  }

  if (updates.length > 0) {
    await db.transaction('rw', db.questions, async () => {
      for (const u of updates) {
        await db.questions.update(u.id, u.changes);
      }
    });
  }

  sessionStorage.setItem(MASTERY_RECALC_KEY, '1');
}
