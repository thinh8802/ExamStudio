import { create } from 'zustand';
import type {
  Attempt, AttemptAnswer, Question, ExamMode, QuizConfig, QuestionStatus,
  Exam, ExamDraft, ExamBlueprint
} from '@/types';
import { db, generateId } from '@/services/database';
import { useQuestionStore } from './question-store';
import { attemptRepository } from '@/services/repositories/attempt-repository';
import { useAppStore } from './app-store';
import { useSubjectStore } from './subject-store';
import { selectQuestions, shuffleAnswerLabels } from '@/services/randomization';
import { ExamBuilderService } from '@/services/exam-builder-service';

interface ExamState {
  // Current session
  currentAttempt: Attempt | null;
  currentQuestions: Question[];
  currentIndex: number;
  isSubmitting: boolean;
  isPaused: boolean;
  elapsedTime: number;

  // In-progress exam recovery
  hasUnfinishedAttempt: boolean;

  // Exam repository state
  exams: Exam[];
  blueprints: ExamBlueprint[];
  currentDraft: ExamDraft | null;

  // Actions
  startQuiz: (config: QuizConfig) => Promise<void>;
  startExamById: (examId: string, options?: { shuffleQuestions?: boolean; shuffleAnswers?: boolean; mode?: ExamMode }) => Promise<void>;
  answerQuestion: (questionId: string, selectedAnswer: string) => void;
  markQuestion: (questionId: string) => void;
  navigateTo: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  submitQuiz: () => Promise<Attempt>;
  tick: () => void;
  pauseQuiz: () => void;
  resumeQuiz: () => void;
  abandonQuiz: () => void;
  checkUnfinishedAttempt: () => Promise<void>;
  resumeUnfinishedAttempt: () => Promise<void>;
  autoSave: () => Promise<void>;

  // Exam CRUD & Operations
  loadExams: (subjectId?: string) => Promise<Exam[]>;
  getExamById: (id: string) => Promise<Exam | undefined>;
  createExam: (examData: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'> | Exam) => Promise<Exam>;
  updateExam: (id: string, updates: Partial<Exam>) => Promise<Exam>;
  deleteExam: (id: string) => Promise<void>;
  duplicateExam: (id: string, newName?: string) => Promise<Exam>;
  archiveExam: (id: string) => Promise<void>;

  // Draft Autosave & Recovery
  loadDraft: (draftId?: string) => Promise<ExamDraft | null>;
  saveDraft: (draft: Partial<ExamDraft>) => Promise<void>;
  clearDraft: (draftId?: string) => Promise<void>;

  // Blueprint Templates
  loadBlueprints: (subjectId?: string) => Promise<ExamBlueprint[]>;
  saveBlueprint: (bp: Omit<ExamBlueprint, 'id' | 'createdAt' | 'updatedAt'> | ExamBlueprint) => Promise<ExamBlueprint>;
  deleteBlueprint: (id: string) => Promise<void>;

  // History
  loadAttemptHistory: () => Promise<Attempt[]>;
  getAttemptById: (id: string) => Promise<Attempt | undefined>;
  deleteAttempt: (id: string) => Promise<void>;
}

const DRAFT_STORAGE_KEY = 'exam_manual_draft';

export const useExamStore = create<ExamState>((set, get) => ({
  currentAttempt: null,
  currentQuestions: [],
  currentIndex: 0,
  isSubmitting: false,
  isPaused: false,
  elapsedTime: 0,
  hasUnfinishedAttempt: false,
  exams: [],
  blueprints: [],
  currentDraft: null,

  startQuiz: async (config) => {
    const questions = await selectQuestions(config);
    if (questions.length === 0) {
      throw new Error('Không đủ câu hỏi để tạo bài thi. Vui lòng kiểm tra lại bộ lọc.');
    }

    // Tạo shuffled answer map nếu cần
    const shuffledAnswerMap: Record<string, string[]> = {};
    if (config.shuffleAnswers) {
      questions.forEach(q => {
        shuffledAnswerMap[q.id] = shuffleAnswerLabels(q.answers.length, config.randomSeed || undefined);
      });
    }

    let chapterText = '';
    const allChapters = useSubjectStore.getState().chapters;
    const selectedChapters = allChapters.filter(c => config.chapterIds.includes(c.id));
    if (selectedChapters.length === 1) {
      chapterText = `: ${selectedChapters[0].name}`;
    } else if (selectedChapters.length >= 2) {
      chapterText = `: Ôn tập ${selectedChapters.length} chương`;
    }

    const modeText = config.mode === 'practice' ? 'Luyện tập' : (config.mode === 'exam' ? 'Thi thử' : 'Ôn tập');
    const examName = `${modeText}${chapterText} - ${new Date().toLocaleDateString('vi-VN')}`;

    const attempt: Attempt = {
      id: generateId(),
      examId: '',
      examName,
      mode: config.mode,
      subjectId: config.subjectId,
      chapterIds: config.chapterIds,
      questionIds: questions.map(q => q.id),
      answers: questions.map(q => ({
        questionId: q.id,
        selectedAnswer: '',
        isCorrect: false,
        timeSpent: 0,
        isMarked: false,
      })),
      totalQuestions: questions.length,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: questions.length,
      score: 0,
      percentage: 0,
      timeSpent: 0,
      timeLimit: config.timeLimit * 60, // convert to seconds
      isCompleted: false,
      currentIndex: 0,
      shuffledQuestionIds: questions.map(q => q.id),
      shuffledAnswerMap,
      startedAt: new Date(),
      completedAt: null,
    };

    set({
      currentAttempt: attempt,
      currentQuestions: questions,
      currentIndex: 0,
      elapsedTime: 0,
      isPaused: false,
      isSubmitting: false,
    });

    // Auto save
    await get().autoSave();
  },

  answerQuestion: (questionId, selectedAnswer) => {
    const { currentAttempt, currentQuestions } = get();
    if (!currentAttempt) return;

    const question = currentQuestions.find(q => q.id === questionId);
    if (!question) return;

    const isCorrect = selectedAnswer === question.correctAnswer;

    const updatedAnswers = currentAttempt.answers.map(a =>
      a.questionId === questionId
        ? { ...a, selectedAnswer, isCorrect }
        : a
    );

    set({
      currentAttempt: {
        ...currentAttempt,
        answers: updatedAnswers,
      },
    });

    // Auto-save debounced
    get().autoSave();
  },

  markQuestion: (questionId) => {
    const { currentAttempt } = get();
    if (!currentAttempt) return;

    const updatedAnswers = currentAttempt.answers.map(a =>
      a.questionId === questionId
        ? { ...a, isMarked: !a.isMarked }
        : a
    );

    set({
      currentAttempt: { ...currentAttempt, answers: updatedAnswers },
    });
  },

  navigateTo: (index) => {
    const { currentAttempt } = get();
    if (!currentAttempt) return;
    if (index < 0 || index >= currentAttempt.totalQuestions) return;
    set({ currentIndex: index });
    set(s => ({
      currentAttempt: s.currentAttempt
        ? { ...s.currentAttempt, currentIndex: index }
        : null,
    }));
  },

  nextQuestion: () => {
    const { currentIndex, currentAttempt } = get();
    if (!currentAttempt) return;
    if (currentIndex < currentAttempt.totalQuestions - 1) {
      get().navigateTo(currentIndex + 1);
    }
  },

  prevQuestion: () => {
    const { currentIndex } = get();
    if (currentIndex > 0) {
      get().navigateTo(currentIndex - 1);
    }
  },

  tick: () => {
    const { currentAttempt, isPaused, currentIndex } = get();
    if (!currentAttempt || isPaused) return;

    const currentQuestionId = get().currentQuestions[currentIndex]?.id;
    let updatedAnswers = currentAttempt.answers;

    const isPracticeMode = currentAttempt.mode === 'practice' 
      || currentAttempt.mode === 'smart_wrong' 
      || currentAttempt.mode === 'smart_new' 
      || currentAttempt.mode === 'smart_weak';

    if (currentQuestionId && updatedAnswers) {
      updatedAnswers = updatedAnswers.map(ans => {
        if (ans.questionId === currentQuestionId) {
          // Chế độ Luyện tập: Đóng băng thời gian ngay khi đã chọn đáp án (đọc giải thích không bị tính thêm)
          // Chế độ Bài kiểm tra: Tiếp tục đếm thời gian thực tế người dùng suy nghĩ/làm việc trên câu hỏi
          if (!isPracticeMode || !ans.selectedAnswer) {
            return { ...ans, timeSpent: (ans.timeSpent || 0) + 1 };
          }
        }
        return ans;
      });
    }

    set(s => ({
      elapsedTime: s.elapsedTime + 1,
      currentAttempt: {
        ...currentAttempt,
        timeSpent: s.elapsedTime + 1,
        answers: updatedAnswers,
      },
    }));
  },

  pauseQuiz: () => set({ isPaused: true }),
  resumeQuiz: () => set({ isPaused: false }),

  submitQuiz: async () => {
    const { currentAttempt, currentQuestions, elapsedTime } = get();
    if (!currentAttempt) throw new Error('Không có bài thi đang làm');

    set({ isSubmitting: true });

    // Answer normalization helper for robust comparison
    const normalize = (val: string) =>
      val.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).sort().join(',');

    // Re-verify correctness for all attempt answers
    const updatedAnswers = currentAttempt.answers.map(ans => {
      if (!ans.selectedAnswer) return { ...ans, isCorrect: false };
      const q = currentQuestions.find(item => item.id === ans.questionId);
      const isCorrect = q ? normalize(ans.selectedAnswer) === normalize(q.correctAnswer) : false;
      return { ...ans, isCorrect };
    });

    const correctCount = updatedAnswers.filter(a => a.isCorrect && a.selectedAnswer).length;
    const answeredCount = updatedAnswers.filter(a => a.selectedAnswer).length;
    const wrongCount = answeredCount - correctCount;
    const skippedCount = currentAttempt.totalQuestions - answeredCount;
    const score = (correctCount / currentAttempt.totalQuestions) * 10;
    const percentage = (correctCount / currentAttempt.totalQuestions) * 100;

    const completedAttempt: Attempt = {
      ...currentAttempt,
      answers: updatedAnswers,
      correctCount,
      wrongCount,
      skippedCount,
      score,
      percentage,
      timeSpent: elapsedTime,
      isCompleted: true,
      completedAt: new Date(),
    };

    // Prepare batch update structures with safe fallbacks
    const updatedQuestionsMap = new Map<string, Question>();
    const questionUpdates: { id: string; changes: Partial<Question> }[] = [];

    for (const ans of completedAttempt.answers) {
      if (!ans.selectedAnswer) continue; // Skip unanswered questions
      const question = currentQuestions.find(q => q.id === ans.questionId);
      if (!question) continue;

      const currentAttemptCount = Number.isFinite(question.attemptCount) ? (question.attemptCount as number) : 0;
      const currentCorrectCount = Number.isFinite(question.correctCount) ? (question.correctCount as number) : 0;
      const currentWrongCount = Number.isFinite(question.wrongCount) ? (question.wrongCount as number) : 0;
      const currentConsecutive = Number.isFinite(question.consecutiveCorrectCount) ? (question.consecutiveCorrectCount as number) : 0;

      const newAttemptCount = currentAttemptCount + 1;
      const newCorrectCount = currentCorrectCount + (ans.isCorrect ? 1 : 0);
      const newWrongCount = currentWrongCount + (ans.isCorrect ? 0 : 1);
      const consecutiveCorrectCount = ans.isCorrect ? currentConsecutive + 1 : 0;
      const masteryScore = Math.round((newCorrectCount / newAttemptCount) * 100);

      let status: QuestionStatus;
      const { masteryScoreThreshold, easyDifficultyThreshold, hardDifficultyThreshold } = useAppStore.getState();
      
      if (ans.isCorrect) {
        if (consecutiveCorrectCount >= 2 || (masteryScore >= masteryScoreThreshold && newAttemptCount >= 3)) {
          status = 'mastered';
        } else {
          status = 'learning';
        }
      } else {
        status = 'needs_review';
      }

      // Adaptive difficulty: adjust based on performance history
      let adaptedDifficulty = question.difficulty;
      if (newAttemptCount >= 3) {
        const correctRatio = Math.round((newCorrectCount / newAttemptCount) * 100);
        const wrongRatio = Math.round((newWrongCount / newAttemptCount) * 100);
        
        if (correctRatio >= easyDifficultyThreshold) {
          adaptedDifficulty = 'easy';
        } else if (wrongRatio >= hardDifficultyThreshold) {
          adaptedDifficulty = wrongRatio > 80 ? 'very_hard' : 'hard';
        } else {
          adaptedDifficulty = 'medium';
        }
      }

      const changes: Partial<Question> = {
        attemptCount: newAttemptCount,
        correctCount: newCorrectCount,
        wrongCount: newWrongCount,
        consecutiveCorrectCount,
        masteryScore,
        status,
        difficulty: adaptedDifficulty,
        lastAttemptedAt: new Date(),
        updatedAt: new Date(),
      };

      Object.assign(question, changes);
      questionUpdates.push({ id: ans.questionId, changes });
      updatedQuestionsMap.set(ans.questionId, { ...question });
    }

    // Single atomic transaction for full persistence guarantee
    await attemptRepository.submitQuizTransaction(completedAttempt, questionUpdates);

    // Clean auto-save storage
    await attemptRepository.clearUnfinishedAttempt();

    // Update in-memory state in exam store
    const updatedCurrentQuestions = currentQuestions.map(q => updatedQuestionsMap.get(q.id) || q);

    // Reload global question store
    await useQuestionStore.getState().loadQuestions();

    set({
      currentAttempt: completedAttempt,
      currentQuestions: updatedCurrentQuestions,
      isSubmitting: false,
    });

    return completedAttempt;
  },

  abandonQuiz: () => {
    attemptRepository.clearUnfinishedAttempt();
    set({
      currentAttempt: null,
      currentQuestions: [],
      currentIndex: 0,
      elapsedTime: 0,
      isPaused: false,
      hasUnfinishedAttempt: false,
    });
  },

  autoSave: async () => {
    const { currentAttempt, elapsedTime, currentIndex } = get();
    if (!currentAttempt || currentAttempt.isCompleted) return;
    await attemptRepository.saveUnfinishedAttempt({ ...currentAttempt, currentIndex }, elapsedTime);
  },

  checkUnfinishedAttempt: async () => {
    const res = await attemptRepository.getUnfinishedAttempt();
    set({ hasUnfinishedAttempt: !!res });
  },

  resumeUnfinishedAttempt: async () => {
    const res = await attemptRepository.getUnfinishedAttempt();
    if (!res) return;

    try {
      const { attempt, elapsedTime } = res;
      const allQs = await db.questions.toArray();
      const questions = allQs.filter(q => attempt.questionIds.includes(q.id));

      const orderedQuestions = attempt.shuffledQuestionIds
        .map(id => questions.find(q => q.id === id))
        .filter(Boolean) as Question[];

      set({
        currentAttempt: attempt,
        currentQuestions: orderedQuestions,
        currentIndex: attempt.currentIndex,
        elapsedTime,
        isPaused: false,
        hasUnfinishedAttempt: false,
      });
    } catch {
      await attemptRepository.clearUnfinishedAttempt();
      set({ hasUnfinishedAttempt: false });
    }
  },

  startExamById: async (examId, options) => {
    const exam = await db.exams.get(examId);
    if (!exam) {
      throw new Error('Không tìm thấy đề thi.');
    }

    let questions: Question[] = [];
    if (exam.snapshotQuestions && exam.snapshotQuestions.length > 0) {
      questions = [...exam.snapshotQuestions];
    } else {
      const qs = await db.questions.where('id').anyOf(exam.questionIds).toArray();
      questions = exam.questionIds
        .map(id => qs.find(q => q.id === id))
        .filter(Boolean) as Question[];
    }

    if (questions.length === 0) {
      throw new Error('Đề thi này chưa có câu hỏi hoặc các câu hỏi không khả dụng.');
    }

    const shouldShuffleQuestions = options?.shuffleQuestions ?? exam.shuffleQuestions;
    const shouldShuffleAnswers = options?.shuffleAnswers ?? exam.shuffleAnswers;

    let orderedQuestions = [...questions];
    if (shouldShuffleQuestions) {
      orderedQuestions = orderedQuestions.sort(() => Math.random() - 0.5);
    }

    const shuffledAnswerMap: Record<string, string[]> = {};
    if (shouldShuffleAnswers) {
      orderedQuestions.forEach(q => {
        shuffledAnswerMap[q.id] = shuffleAnswerLabels(q.answers.length);
      });
    }

    const mode: ExamMode = options?.mode || 'exam';
    const attempt: Attempt = {
      id: generateId(),
      examId: exam.id,
      examName: exam.name,
      mode,
      subjectId: exam.subjectId,
      chapterIds: Array.from(new Set(questions.map(q => q.chapterId).filter(Boolean))),
      questionIds: orderedQuestions.map(q => q.id),
      answers: orderedQuestions.map(q => ({
        questionId: q.id,
        selectedAnswer: '',
        isCorrect: false,
        timeSpent: 0,
        isMarked: false,
      })),
      totalQuestions: orderedQuestions.length,
      correctCount: 0,
      wrongCount: 0,
      skippedCount: orderedQuestions.length,
      score: 0,
      percentage: 0,
      timeSpent: 0,
      timeLimit: (exam.timeLimit || 0) * 60,
      isCompleted: false,
      currentIndex: 0,
      shuffledQuestionIds: orderedQuestions.map(q => q.id),
      shuffledAnswerMap,
      startedAt: new Date(),
      completedAt: null,
    };

    set({
      currentAttempt: attempt,
      currentQuestions: orderedQuestions,
      currentIndex: 0,
      elapsedTime: 0,
      isPaused: false,
      hasUnfinishedAttempt: false,
    });
  },

  // Exam CRUD & Operations
  loadExams: async (subjectId?: string) => {
    let list: Exam[] = [];
    if (subjectId) {
      list = await db.exams.where('subjectId').equals(subjectId).toArray();
    } else {
      list = await db.exams.toArray();
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    set({ exams: list });
    return list;
  },

  getExamById: async (id: string) => {
    return db.exams.get(id);
  },

  createExam: async (examData) => {
    const now = new Date();
    const id = (examData as Exam).id || generateId();
    const exam: Exam = {
      ...examData,
      id,
      status: examData.status || 'ready',
      passingScore: examData.passingScore ?? 5.0,
      createdAt: (examData as Exam).createdAt || now,
      updatedAt: now,
    };
    await db.exams.put(exam);
    const exams = [exam, ...get().exams.filter(e => e.id !== exam.id)];
    set({ exams });
    return exam;
  },

  updateExam: async (id: string, updates: Partial<Exam>) => {
    const existing = await db.exams.get(id);
    if (!existing) throw new Error('Không tìm thấy đề thi cần cập nhật.');
    const updated: Exam = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    await db.exams.put(updated);
    const exams = get().exams.map(e => (e.id === id ? updated : e));
    set({ exams });
    return updated;
  },

  deleteExam: async (id: string) => {
    await db.exams.delete(id);
    set({ exams: get().exams.filter(e => e.id !== id) });
  },

  duplicateExam: async (id: string, newName?: string) => {
    const existing = await db.exams.get(id);
    if (!existing) throw new Error('Không tìm thấy đề thi để nhân bản.');
    const duplicated = ExamBuilderService.duplicateExam(existing, newName);
    await db.exams.put(duplicated);
    set({ exams: [duplicated, ...get().exams] });
    return duplicated;
  },

  archiveExam: async (id: string) => {
    const existing = await db.exams.get(id);
    if (!existing) return;
    const newStatus = existing.status === 'archived' ? 'ready' : 'archived';
    const updated: Exam = { ...existing, status: newStatus, updatedAt: new Date() };
    await db.exams.put(updated);
    set({ exams: get().exams.map(e => (e.id === id ? updated : e)) });
  },

  // Draft Autosave & Recovery
  loadDraft: async (draftId = DRAFT_STORAGE_KEY) => {
    try {
      const raw = localStorage.getItem(draftId);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      set({ currentDraft: draft });
      return draft;
    } catch {
      return null;
    }
  },

  saveDraft: async (draft) => {
    const now = new Date();
    const fullDraft: ExamDraft = {
      id: draft.id || DRAFT_STORAGE_KEY,
      name: draft.name || '',
      subjectId: draft.subjectId || '',
      description: draft.description || '',
      timeLimit: draft.timeLimit ?? 45,
      shuffleQuestions: Boolean(draft.shuffleQuestions),
      shuffleAnswers: Boolean(draft.shuffleAnswers),
      passingScore: draft.passingScore ?? 5.0,
      questionIds: draft.questionIds || [],
      updatedAt: now,
    };
    localStorage.setItem(fullDraft.id, JSON.stringify(fullDraft));
    set({ currentDraft: fullDraft });
  },

  clearDraft: async (draftId = DRAFT_STORAGE_KEY) => {
    localStorage.removeItem(draftId);
    set({ currentDraft: null });
  },

  // Blueprint Templates
  loadBlueprints: async (subjectId?: string) => {
    let list: ExamBlueprint[] = [];
    if (subjectId) {
      list = await db.blueprints.where('subjectId').equals(subjectId).toArray();
    } else {
      list = await db.blueprints.toArray();
    }
    set({ blueprints: list });
    return list;
  },

  saveBlueprint: async (bp) => {
    const now = new Date();
    const id = (bp as ExamBlueprint).id || generateId();
    const blueprint: ExamBlueprint = {
      ...bp,
      id,
      createdAt: (bp as ExamBlueprint).createdAt || now,
      updatedAt: now,
    };
    await db.blueprints.put(blueprint);
    set({ blueprints: [blueprint, ...get().blueprints.filter(b => b.id !== blueprint.id)] });
    return blueprint;
  },

  deleteBlueprint: async (id: string) => {
    await db.blueprints.delete(id);
    set({ blueprints: get().blueprints.filter(b => b.id !== id) });
  },

  loadAttemptHistory: async () => {
    return attemptRepository.loadAttemptHistory();
  },

  getAttemptById: async (id) => {
    return attemptRepository.getAttemptById(id);
  },

  deleteAttempt: async (id) => {
    await attemptRepository.deleteAttempt(id);
  },
}));

