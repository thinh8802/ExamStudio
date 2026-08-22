// ============================================
// SQLITE DATABASE ADAPTER & CONVERSION UTILS
// ============================================
import type {
  Subject, Chapter, Topic, Question, Answer, Exam,
  Attempt, AttemptAnswer, Bookmark, QuestionReport, AppSettings,
} from '@/types';
import type {
  SqliteSubjectDTO, SqliteChapterDTO, SqliteTopicDTO,
  SqliteQuestionDTO, SqliteAnswerDTO, SqliteAttemptDTO,
  SqliteAttemptAnswerDTO, SqliteBookmarkDTO, SqliteReportDTO,
  SqliteSettingDTO,
} from './types';

// Check if running inside Tauri Desktop container
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// Convert DTOs <-> Entities
export function mapSubjectFromSqlite(dto: SqliteSubjectDTO): Subject {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description || '',
    color: dto.color || '#3B82F6',
    icon: dto.icon || 'BookOpen',
    order: dto.sort_order ?? 0,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  };
}

export function mapSubjectToSqlite(entity: Partial<Subject>): SqliteSubjectDTO {
  const now = new Date().toISOString();
  return {
    id: entity.id || crypto.randomUUID(),
    name: entity.name || '',
    description: entity.description || '',
    color: entity.color || '#3B82F6',
    icon: entity.icon || 'BookOpen',
    sort_order: entity.order ?? 0,
    created_at: entity.createdAt ? new Date(entity.createdAt).toISOString() : now,
    updated_at: entity.updatedAt ? new Date(entity.updatedAt).toISOString() : now,
  };
}

export function mapChapterFromSqlite(dto: SqliteChapterDTO): Chapter {
  return {
    id: dto.id,
    subjectId: dto.subject_id,
    name: dto.name,
    description: dto.description || '',
    order: dto.sort_order ?? 0,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  };
}

export function mapChapterToSqlite(entity: Partial<Chapter>): SqliteChapterDTO {
  const now = new Date().toISOString();
  return {
    id: entity.id || crypto.randomUUID(),
    subject_id: entity.subjectId || '',
    name: entity.name || '',
    description: entity.description || '',
    sort_order: entity.order ?? 0,
    created_at: entity.createdAt ? new Date(entity.createdAt).toISOString() : now,
    updated_at: entity.updatedAt ? new Date(entity.updatedAt).toISOString() : now,
  };
}

export function mapTopicFromSqlite(dto: SqliteTopicDTO): Topic {
  return {
    id: dto.id,
    chapterId: dto.chapter_id,
    subjectId: dto.subject_id,
    name: dto.name,
    order: dto.sort_order ?? 0,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  };
}

export function mapTopicToSqlite(entity: Partial<Topic>): SqliteTopicDTO {
  const now = new Date().toISOString();
  return {
    id: entity.id || crypto.randomUUID(),
    chapter_id: entity.chapterId || '',
    subject_id: entity.subjectId || '',
    name: entity.name || '',
    sort_order: entity.order ?? 0,
    created_at: entity.createdAt ? new Date(entity.createdAt).toISOString() : now,
    updated_at: entity.updatedAt ? new Date(entity.updatedAt).toISOString() : now,
  };
}

export function mapQuestionFromSqlite(dto: SqliteQuestionDTO, answers: Answer[]): Question {
  let tags: string[] = [];
  try {
    tags = JSON.parse(dto.tags_json || '[]');
  } catch {
    tags = [];
  }

  return {
    id: dto.id,
    subjectId: dto.subject_id,
    chapterId: dto.chapter_id,
    topicId: dto.topic_id || '',
    type: (dto.type as any) || 'single_choice',
    difficulty: (dto.difficulty as any) || 'medium',
    content: dto.content,
    answers,
    correctAnswer: dto.correct_answer || '',
    explanation: dto.explanation || '',
    tags,
    notes: dto.notes || '',
    source: dto.source || '',
    imageUrl: dto.image_url || '',
    status: (dto.status as any) || 'new',
    attemptCount: dto.attempt_count ?? 0,
    correctCount: dto.correct_count ?? 0,
    wrongCount: dto.wrong_count ?? 0,
    consecutiveCorrectCount: dto.consecutive_correct_count ?? 0,
    masteryScore: dto.mastery_score ?? 0,
    lastAttemptedAt: dto.last_attempted_at ? new Date(dto.last_attempted_at) : null,
    isBookmarked: dto.is_bookmarked === 1,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  };
}

export function mapQuestionToSqlite(entity: Partial<Question>): SqliteQuestionDTO {
  const now = new Date().toISOString();
  return {
    id: entity.id || '',
    subject_id: entity.subjectId || '',
    chapter_id: entity.chapterId || '',
    topic_id: entity.topicId || null,
    type: entity.type || 'single_choice',
    difficulty: entity.difficulty || 'medium',
    content: entity.content || '',
    correct_answer: entity.correctAnswer || '',
    explanation: entity.explanation || '',
    tags_json: JSON.stringify(entity.tags || []),
    notes: entity.notes || '',
    source: entity.source || '',
    image_url: entity.imageUrl || '',
    status: entity.status || 'new',
    attempt_count: entity.attemptCount ?? 0,
    correct_count: entity.correctCount ?? 0,
    wrong_count: entity.wrongCount ?? 0,
    consecutive_correct_count: entity.consecutiveCorrectCount ?? 0,
    mastery_score: entity.masteryScore ?? 0,
    last_attempted_at: entity.lastAttemptedAt ? new Date(entity.lastAttemptedAt).toISOString() : null,
    is_bookmarked: entity.isBookmarked ? 1 : 0,
    created_at: entity.createdAt ? new Date(entity.createdAt).toISOString() : now,
    updated_at: entity.updatedAt ? new Date(entity.updatedAt).toISOString() : now,
  };
}

export function mapAnswerFromSqlite(dto: SqliteAnswerDTO): Answer {
  return {
    id: dto.id,
    label: dto.label,
    content: dto.content,
    imageUrl: dto.image_url || undefined,
    isCorrect: dto.is_correct === 1,
  };
}

export function mapAnswerToSqlite(questionId: string, answer: Answer): SqliteAnswerDTO {
  return {
    id: answer.id || crypto.randomUUID(),
    question_id: questionId,
    label: answer.label,
    content: answer.content,
    image_url: answer.imageUrl || '',
    is_correct: answer.isCorrect ? 1 : 0,
  };
}

export function mapAttemptFromSqlite(dto: SqliteAttemptDTO, answers: AttemptAnswer[]): Attempt {
  let questionIds: string[] = [];
  let shuffledQuestionIds: string[] = [];
  let shuffledAnswerMap: Record<string, string[]> = {};

  try { questionIds = JSON.parse(dto.question_ids_json || '[]'); } catch { questionIds = []; }
  try { shuffledQuestionIds = JSON.parse(dto.shuffled_question_ids_json || '[]'); } catch { shuffledQuestionIds = []; }
  try { shuffledAnswerMap = JSON.parse(dto.shuffled_answer_map_json || '{}'); } catch { shuffledAnswerMap = {}; }

  return {
    id: dto.id,
    examId: dto.exam_id || '',
    examName: dto.exam_name,
    mode: dto.mode as any,
    subjectId: dto.subject_id || '',
    chapterIds: [],
    questionIds,
    answers,
    totalQuestions: dto.total_questions,
    correctCount: dto.correct_count,
    wrongCount: dto.wrong_count,
    skippedCount: dto.skipped_count,
    score: dto.score,
    percentage: dto.percentage,
    timeSpent: dto.time_spent,
    timeLimit: dto.time_limit,
    isCompleted: dto.is_completed === 1,
    currentIndex: dto.current_index,
    shuffledQuestionIds,
    shuffledAnswerMap,
    startedAt: new Date(dto.started_at),
    completedAt: dto.completed_at ? new Date(dto.completed_at) : null,
  };
}

export function mapAttemptToSqlite(entity: Attempt): SqliteAttemptDTO {
  return {
    id: entity.id,
    exam_id: entity.examId || null,
    exam_name: entity.examName,
    mode: entity.mode,
    subject_id: entity.subjectId || null,
    total_questions: entity.totalQuestions,
    correct_count: entity.correctCount,
    wrong_count: entity.wrongCount,
    skipped_count: entity.skippedCount,
    score: entity.score,
    percentage: entity.percentage,
    time_spent: entity.timeSpent,
    time_limit: entity.timeLimit,
    is_completed: entity.isCompleted ? 1 : 0,
    current_index: entity.currentIndex,
    question_ids_json: JSON.stringify(entity.questionIds || []),
    shuffled_question_ids_json: JSON.stringify(entity.shuffledQuestionIds || []),
    shuffled_answer_map_json: JSON.stringify(entity.shuffledAnswerMap || {}),
    started_at: new Date(entity.startedAt).toISOString(),
    completed_at: entity.completedAt ? new Date(entity.completedAt).toISOString() : null,
  };
}
