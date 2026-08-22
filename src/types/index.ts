// ============================================
// QUIZ MANAGEMENT APP - TYPE DEFINITIONS
// ============================================

// --- Enums & Constants ---

export type QuestionType = 'single_choice' | 'multiple_choice' | 'true_false';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'very_hard';
export type QuestionStatus = 'unattempted' | 'new' | 'learning' | 'mastered' | 'needs_review';
export type ExamMode = 'practice' | 'exam' | 'review' | 'random' | 'chapter' | 'custom' | 'smart_wrong' | 'smart_new' | 'smart_weak';
export type Theme = 'light' | 'dark' | 'system';
export type ReportType = 'wrong_answer' | 'wrong_content' | 'missing_info' | 'typo' | 'unclear' | 'other';

export * from './flashcard';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
  very_hard: 'Rất khó',
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: 'Một đáp án',
  multiple_choice: 'Nhiều đáp án',
  true_false: 'Đúng/Sai',
};

export const STATUS_LABELS: Record<QuestionStatus, string> = {
  unattempted: 'Chưa làm',
  new: 'Chưa làm',
  learning: 'Đang học',
  mastered: 'Thành thạo',
  needs_review: 'Cần ôn',
};

export const MODE_LABELS: Record<ExamMode, string> = {
  practice: 'Luyện tập',
  exam: 'Thi thử',
  review: 'Ôn tập câu sai',
  random: 'Ngẫu nhiên',
  chapter: 'Theo chương',
  custom: 'Tùy chỉnh',
  smart_wrong: 'Ôn câu sai',
  smart_new: 'Ôn câu chưa làm',
  smart_weak: 'Ôn câu yếu',
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  wrong_answer: 'Sai đáp án',
  wrong_content: 'Sai nội dung',
  missing_info: 'Thiếu thông tin',
  typo: 'Lỗi chính tả',
  unclear: 'Câu hỏi không rõ',
  other: 'Lỗi khác',
};

// --- Core Entities ---

export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Topic {
  id: string;
  chapterId: string;
  subjectId: string;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Answer {
  id: string;
  label: string; // A, B, C, D...
  content: string;
  imageUrl?: string;
  isCorrect: boolean;
}

export interface Question {
  id: string; // Q-000001 format
  subjectId: string;
  chapterId: string;
  topicId: string;
  type: QuestionType;
  difficulty: Difficulty;
  content: string;
  answers: Answer[];
  correctAnswer: string; // 'A' or 'A,C'
  explanation: string;
  tags: string[];
  notes: string;
  source: string;
  imageUrl: string;
  status: QuestionStatus;
  attemptCount: number;
  correctCount: number;
  wrongCount: number;
  consecutiveCorrectCount?: number;
  masteryScore: number;
  lastAttemptedAt: Date | null;
  isBookmarked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ExamStatus = 'draft' | 'ready' | 'archived';

export interface Exam {
  id: string;
  name: string;
  subjectId: string;
  description: string;
  questionIds: string[];
  questionCount: number;
  timeLimit: number; // minutes, 0 = unlimited
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  passingScore?: number; // 0-10, default 5.0
  blueprintId?: string;
  status?: ExamStatus; // 'draft' | 'ready' | 'archived'
  generationSeed?: string;
  snapshotQuestions?: Question[]; // Immutable copy of questions at creation
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamDraft {
  id: string;
  name: string;
  subjectId: string;
  description: string;
  timeLimit: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  passingScore: number;
  questionIds: string[];
  updatedAt: Date;
}

export interface ExamBlueprint {
  id: string;
  name: string;
  subjectId: string;
  totalQuestions: number;
  timeLimit?: number;
  chapterDistribution: ChapterDistribution[];
  difficultyDistribution: DifficultyDistribution[];
  strategy?: {
    prioritizeWrong?: boolean;
    prioritizeNew?: boolean;
    excludeMastered?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ChapterDistribution {
  chapterId: string;
  count: number;
}

export interface DifficultyDistribution {
  difficulty: Difficulty;
  percentage: number;
}

export interface Attempt {
  id: string;
  examId: string;
  examName: string;
  mode: ExamMode;
  subjectId: string;
  chapterIds: string[];
  questionIds: string[];
  answers: AttemptAnswer[];
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  score: number; // 0-10
  percentage: number; // 0-100
  timeSpent: number; // seconds
  timeLimit: number;
  isCompleted: boolean;
  currentIndex: number;
  shuffledQuestionIds: string[];
  shuffledAnswerMap: Record<string, string[]>; // questionId -> shuffled answer order
  startedAt: Date;
  completedAt: Date | null;
}

export interface AttemptAnswer {
  questionId: string;
  selectedAnswer: string; // 'A', 'B,C' or ''
  isCorrect: boolean;
  timeSpent: number;
  isMarked: boolean;
}

export interface Bookmark {
  id: string;
  questionId: string;
  note: string;
  createdAt: Date;
}

export interface QuestionReport {
  id: string;
  questionId: string;
  type: ReportType;
  description: string;
  isResolved: boolean;
  createdAt: Date;
}

export interface AppSettings {
  key: string;
  value: string;
}

// --- Dashboard & Statistics ---

export interface DashboardStats {
  totalQuestions: number;
  totalSubjects: number;
  totalChapters: number;
  totalExams: number;
  totalAttempts: number;
  averageScore: number;
  overallAccuracy: number;
  newQuestions: number;
  learningQuestions: number;
  wrongQuestions: number;
  masteredQuestions: number;
}

export interface ChapterStats {
  chapterId: string;
  chapterName: string;
  subjectId: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
}

export interface SubjectStats {
  subjectId: string;
  subjectName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  masteredQuestions: number;
  accuracy: number;
}

// --- Import/Export ---

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ImportMapping {
  sourceColumn: string;
  targetField: string;
}

// --- Filter & Search ---

export interface QuestionFilter {
  subjectId: string;
  chapterId: string;
  topicId: string;
  difficulty: Difficulty | '';
  type: QuestionType | '';
  status: QuestionStatus | '';
  isBookmarked: boolean | null;
  hasImage: boolean | null;
  hasExplanation: boolean | null;
  search: string;
  tags: string[];
}

export const DEFAULT_QUESTION_FILTER: QuestionFilter = {
  subjectId: '',
  chapterId: '',
  topicId: '',
  difficulty: '',
  type: '',
  status: '',
  isBookmarked: null,
  hasImage: null,
  hasExplanation: null,
  search: '',
  tags: [],
};

// --- Quiz Setup ---

export interface QuizConfig {
  subjectId: string;
  chapterIds: string[];
  mode: ExamMode;
  questionCount: number;
  timeLimit: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  prioritizeWrong: boolean;
  prioritizeNew: boolean;
  prioritizeWeak: boolean;
  excludeMastered: boolean;
  difficulty: Difficulty | '';
  randomSeed: string;
}

export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  subjectId: '',
  chapterIds: [],
  mode: 'practice',
  questionCount: 20,
  timeLimit: 0,
  shuffleQuestions: true,
  shuffleAnswers: true,
  prioritizeWrong: false,
  prioritizeNew: false,
  prioritizeWeak: false,
  excludeMastered: false,
  difficulty: '',
  randomSeed: '',
};
