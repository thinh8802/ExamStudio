// ============================================
// QUESTION STORE - Question Bank CRUD
// ============================================
import { create } from 'zustand';
import type { Question, QuestionFilter } from '@/types';
import { generateId, recalculateMasteryAndDifficulty } from '@/services/database';
import { questionRepository } from '@/services/repositories/question-repository';

interface QuestionState {
  questions: Question[];
  filteredQuestions: Question[];
  selectedIds: Set<string>;
  filter: QuestionFilter;
  loading: boolean;
  totalCount: number;

  // Pagination
  page: number;
  pageSize: number;

  // Load
  loadQuestions: () => Promise<void>;
  applyFilter: () => void;

  // CRUD
  addQuestion: (data: Partial<Question>) => Promise<Question>;
  updateQuestion: (id: string, data: Partial<Question>) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  deleteMultiple: (ids: string[]) => Promise<void>;
  duplicateQuestion: (id: string) => Promise<Question>;

  // Bulk
  bulkImport: (questions: Partial<Question>[]) => Promise<{ imported: number; errors: string[] }>;
  bulkUpdateChapter: (ids: string[], chapterId: string) => Promise<void>;
  bulkUpdateDifficulty: (ids: string[], difficulty: string) => Promise<void>;
  bulkToggleBookmark: (ids: string[], bookmarked: boolean) => Promise<void>;

  // Selection
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Filter
  setFilter: (filter: Partial<QuestionFilter>) => void;
  resetFilter: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Helpers
  getQuestionById: (id: string) => Question | undefined;
  getQuestionsByChapter: (chapterId: string) => Question[];
  getQuestionCountByChapter: (chapterId: string) => number;
}

const DEFAULT_FILTER: QuestionFilter = {
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

function sanitizeQuestionAnswers(q: Question): { question: Question; changed: boolean } {
  if (!q.answers || q.answers.length <= 1) return { question: q, changed: false };

  const seen = new Set<string>();
  const uniqueAnswers: typeof q.answers = [];
  let changed = false;

  for (const a of q.answers) {
    const norm = a.content.trim().toLowerCase().replace(/[\s\.\,\;\:\-]+/g, ' ');
    if (!norm) continue;
    if (seen.has(norm)) {
      changed = true;
      continue;
    }
    seen.add(norm);
    uniqueAnswers.push(a);
  }

  if (changed && uniqueAnswers.length >= 2) {
    const hasCorrect = uniqueAnswers.some(a => a.isCorrect);
    if (!hasCorrect && q.answers.some(a => a.isCorrect)) {
      uniqueAnswers[0].isCorrect = true;
    }
    return {
      question: { ...q, answers: uniqueAnswers },
      changed: true,
    };
  }

  return { question: q, changed: false };
}

export const useQuestionStore = create<QuestionState>((set, get) => ({
  questions: [],
  filteredQuestions: [],
  selectedIds: new Set(),
  filter: { ...DEFAULT_FILTER },
  loading: false,
  totalCount: 0,
  page: 1,
  pageSize: 1000000, // Default to "Tất cả"

  loadQuestions: async () => {
    set({ loading: true });
    await recalculateMasteryAndDifficulty();
    const rawQuestions = await questionRepository.getAllQuestions();
    const questions = await Promise.all(rawQuestions.map(async q => {
      const { question, changed } = sanitizeQuestionAnswers(q);
      if (changed) {
        try {
          await questionRepository.updateQuestion(question.id, { answers: question.answers });
        } catch {
          // Ignore persistence errors
        }
      }
      return question;
    }));
    set({ questions, totalCount: questions.length, loading: false });
    get().applyFilter();
  },

  applyFilter: () => {
    const { questions, filter } = get();
    let filtered = [...questions];

    if (filter.subjectId) filtered = filtered.filter(q => q.subjectId === filter.subjectId);
    if (filter.chapterId) filtered = filtered.filter(q => q.chapterId === filter.chapterId);
    if (filter.topicId) filtered = filtered.filter(q => q.topicId === filter.topicId);
    if (filter.difficulty) filtered = filtered.filter(q => q.difficulty === filter.difficulty);
    if (filter.type) filtered = filtered.filter(q => q.type === filter.type);
    if (filter.status) filtered = filtered.filter(q => q.status === filter.status);
    if (filter.isBookmarked === true) filtered = filtered.filter(q => q.isBookmarked);
    if (filter.isBookmarked === false) filtered = filtered.filter(q => !q.isBookmarked);
    if (filter.hasImage === true) filtered = filtered.filter(q => q.imageUrl);
    if (filter.hasExplanation === true) filtered = filtered.filter(q => q.explanation);
    if (filter.tags.length > 0) {
      filtered = filtered.filter(q => filter.tags.some(t => q.tags.includes(t)));
    }
    if (filter.search) {
      const search = filter.search.toLowerCase();
      filtered = filtered.filter(q =>
        q.content.toLowerCase().includes(search) ||
        q.id.toLowerCase().includes(search) ||
        q.answers.some(a => a.content.toLowerCase().includes(search)) ||
        q.tags.some(t => t.toLowerCase().includes(search))
      );
    }
    
    // Sort naturally by ID
    filtered.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    set({ filteredQuestions: filtered });
  },

  addQuestion: async (data) => {
    const question = await questionRepository.addQuestion(data);
    set(s => ({
      questions: [question, ...s.questions],
      totalCount: s.totalCount + 1,
    }));
    get().applyFilter();
    return question;
  },

  updateQuestion: async (id, data) => {
    await questionRepository.updateQuestion(id, data);
    set(s => ({
      questions: s.questions.map(q => q.id === id ? { ...q, ...data } as Question : q),
    }));
    get().applyFilter();
  },

  deleteQuestion: async (id) => {
    await questionRepository.deleteQuestion(id);
    set(s => ({
      questions: s.questions.filter(q => q.id !== id),
      totalCount: s.totalCount - 1,
      selectedIds: new Set([...s.selectedIds].filter(sid => sid !== id)),
    }));
    get().applyFilter();
  },

  deleteMultiple: async (ids) => {
    await questionRepository.deleteMultiple(ids);
    set(s => ({
      questions: s.questions.filter(q => !ids.includes(q.id)),
      totalCount: s.totalCount - ids.length,
      selectedIds: new Set(),
    }));
    get().applyFilter();
  },

  duplicateQuestion: async (id) => {
    const original = get().questions.find(q => q.id === id);
    if (!original) throw new Error('Không tìm thấy câu hỏi');
    const newQuestion = await get().addQuestion({
      ...original,
      id: undefined,
      notes: `Nhân bản từ ${original.id}`,
    });
    return newQuestion;
  },

  bulkImport: async (questions) => {
    const errors: string[] = [];
    const validQuestions: Partial<Question>[] = [];
    
    // Validate first
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.content) {
        errors.push(`Dòng ${i + 1}: Thiếu nội dung câu hỏi`);
        continue;
      }
      if (!q.answers || q.answers.length < 2) {
        errors.push(`Dòng ${i + 1}: Cần ít nhất 2 đáp án`);
        continue;
      }
      validQuestions.push(q);
    }
    
    // Atomic insert
    if (validQuestions.length > 0) {
      try {
        await questionRepository.bulkCreate(validQuestions);
        await get().loadQuestions();
      } catch (err) {
        errors.push(`Lỗi khi lưu vào CSDL: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
        return { imported: 0, errors };
      }
    }
    
    return { imported: validQuestions.length, errors };
  },

  bulkUpdateChapter: async (ids, chapterId) => {
    await questionRepository.bulkUpdateChapter(ids, chapterId);
    set(s => ({
      questions: s.questions.map(q => ids.includes(q.id) ? { ...q, chapterId, updatedAt: new Date() } : q),
    }));
    get().applyFilter();
  },

  bulkUpdateDifficulty: async (ids, difficulty) => {
    await questionRepository.bulkUpdateDifficulty(ids, difficulty);
    set(s => ({
      questions: s.questions.map(q => ids.includes(q.id) ? { ...q, difficulty: difficulty as any, updatedAt: new Date() } : q),
    }));
    get().applyFilter();
  },

  bulkToggleBookmark: async (ids, bookmarked) => {
    await questionRepository.bulkToggleBookmark(ids, bookmarked);
    set(s => ({
      questions: s.questions.map(q => ids.includes(q.id) ? { ...q, isBookmarked: bookmarked } : q),
    }));
    get().applyFilter();
  },

  toggleSelect: (id) => set(s => {
    const newSet = new Set(s.selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    return { selectedIds: newSet };
  }),

  selectAll: () => set(s => ({
    selectedIds: new Set(s.filteredQuestions.map(q => q.id)),
  })),

  clearSelection: () => set({ selectedIds: new Set() }),

  setFilter: (filter) => {
    set(s => ({ filter: { ...s.filter, ...filter }, page: 1 }));
    get().applyFilter();
  },

  resetFilter: () => {
    set({ filter: { ...DEFAULT_FILTER }, page: 1 });
    get().applyFilter();
  },

  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),

  getQuestionById: (id) => get().questions.find(q => q.id === id),
  getQuestionsByChapter: (chapterId) => get().questions.filter(q => q.chapterId === chapterId),
  getQuestionCountByChapter: (chapterId) => get().questions.filter(q => q.chapterId === chapterId).length,
}));

