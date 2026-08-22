// ============================================
// REPOSITORY LAYER TYPE DEFINITIONS & INTERFACES
// ============================================
import type {
  Subject, Chapter, Topic, Question, Answer, Exam, ExamBlueprint,
  Attempt, AttemptAnswer, Bookmark, QuestionReport, AppSettings, QuestionFilter,
} from '@/types';

// DTOs matching SQLite schema (boolean -> 0/1, Date -> ISO string, arrays -> JSON strings)
export interface SqliteSubjectDTO {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SqliteChapterDTO {
  id: string;
  subject_id: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SqliteTopicDTO {
  id: string;
  chapter_id: string;
  subject_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SqliteQuestionDTO {
  id: string;
  subject_id: string;
  chapter_id: string;
  topic_id: string | null;
  type: string;
  difficulty: string;
  content: string;
  correct_answer: string;
  explanation: string;
  tags_json: string;
  notes: string;
  source: string;
  image_url: string;
  status: string;
  attempt_count: number;
  correct_count: number;
  wrong_count: number;
  consecutive_correct_count: number;
  mastery_score: number;
  last_attempted_at: string | null;
  is_bookmarked: number;
  created_at: string;
  updated_at: string;
}

export interface SqliteAnswerDTO {
  id: string;
  question_id: string;
  label: string;
  content: string;
  image_url: string;
  is_correct: number;
}

export interface SqliteAttemptDTO {
  id: string;
  exam_id: string | null;
  exam_name: string;
  mode: string;
  subject_id: string | null;
  total_questions: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  score: number;
  percentage: number;
  time_spent: number;
  time_limit: number;
  is_completed: number;
  current_index: number;
  question_ids_json: string;
  shuffled_question_ids_json: string;
  shuffled_answer_map_json: string;
  started_at: string;
  completed_at: string | null;
}

export interface SqliteAttemptAnswerDTO {
  id?: number;
  attempt_id: string;
  question_id: string;
  selected_answer: string;
  is_correct: number;
  time_spent: number;
  is_marked: number;
}

export interface SqliteBookmarkDTO {
  id: string;
  question_id: string;
  note: string;
  created_at: string;
}

export interface SqliteReportDTO {
  id: string;
  question_id: string;
  type: string;
  description: string;
  is_resolved: number;
  created_at: string;
}

export interface SqliteOwnerAccountDTO {
  id: string;
  username: string;
  password_hash: string;
  salt_hex: string;
  iterations: number;
  algorithm: string;
  created_at: string;
  updated_at: string;
}

export interface SqliteAppMetadataDTO {
  key: string;
  value: string;
  updated_at: string;
}

export interface SqliteMigrationMetadataDTO {
  id?: number;
  version: number;
  source: string;
  status: string;
  record_counts_json: string;
  checksum?: string;
  applied_at: string;
}

export interface SqliteTagDTO {
  id: string;
  name: string;
  color?: string;
  created_at: string;
}

export interface SqliteSettingDTO {
  key: string;
  value: string;
  updated_at?: string;
}

// Cascading Deletion Warning Summary Interface
export interface SubjectDeleteCounts {
  subjectId: string;
  subjectName: string;
  chapterCount: number;
  topicCount: number;
  questionCount: number;
}

export interface ChapterDeleteCounts {
  chapterId: string;
  chapterName: string;
  topicCount: number;
  questionCount: number;
}

// Record Count Summary for Integrity Verification
export interface RecordCounts {
  subjects: number;
  chapters: number;
  topics: number;
  questions: number;
  answers: number;
  attempts: number;
  attemptAnswers: number;
  bookmarks: number;
  reports: number;
  settings: number;
}
