// ============================================
// SUBJECT STORE - Subjects, Chapters, Topics
// ============================================
import { create } from 'zustand';
import type { Subject, Chapter, Topic } from '@/types';
import { subjectRepository } from '@/services/repositories/subject-repository';

interface SubjectState {
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  loading: boolean;

  // Load
  loadAll: () => Promise<void>;
  loadChapters: (subjectId: string) => Promise<void>;
  loadTopics: (chapterId: string) => Promise<void>;

  // Subjects
  addSubject: (data: Partial<Subject>) => Promise<Subject>;
  updateSubject: (id: string, data: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;

  // Chapters
  addChapter: (data: Partial<Chapter>) => Promise<Chapter>;
  updateChapter: (id: string, data: Partial<Chapter>) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;
  reorderChapters: (subjectId: string, orderedIds: string[]) => Promise<void>;

  // Topics
  addTopic: (data: Partial<Topic>) => Promise<Topic>;
  updateTopic: (id: string, data: Partial<Topic>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;

  // Helpers
  getSubjectById: (id: string) => Subject | undefined;
  getChapterById: (id: string) => Chapter | undefined;
  getChaptersBySubject: (subjectId: string) => Chapter[];
  getTopicsByChapter: (chapterId: string) => Topic[];
}

export const useSubjectStore = create<SubjectState>((set, get) => ({
  subjects: [],
  chapters: [],
  topics: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true });
    const [subjects, chapters, topics] = await Promise.all([
      subjectRepository.getAllSubjects(),
      subjectRepository.getAllChapters(),
      subjectRepository.getAllTopics(),
    ]);
    set({ subjects, chapters, topics, loading: false });
  },

  loadChapters: async (subjectId) => {
    const chapters = await subjectRepository.getChaptersBySubject(subjectId);
    set(s => ({
      chapters: [...s.chapters.filter(c => c.subjectId !== subjectId), ...chapters],
    }));
  },

  loadTopics: async (chapterId) => {
    const topics = await subjectRepository.getTopicsByChapter(chapterId);
    set(s => ({
      topics: [...s.topics.filter(t => t.chapterId !== chapterId), ...topics],
    }));
  },

  // --- Subjects ---
  addSubject: async (data) => {
    const subject = await subjectRepository.addSubject(data);
    set(s => ({ subjects: [...s.subjects, subject] }));
    return subject;
  },

  updateSubject: async (id, data) => {
    await subjectRepository.updateSubject(id, data);
    set(s => ({
      subjects: s.subjects.map(sub => sub.id === id ? { ...sub, ...data } : sub),
    }));
  },

  deleteSubject: async (id) => {
    const chapters = get().chapters.filter(c => c.subjectId === id);
    const chapterIds = chapters.map(c => c.id);
    await subjectRepository.deleteSubject(id);
    set(s => ({
      subjects: s.subjects.filter(sub => sub.id !== id),
      chapters: s.chapters.filter(c => c.subjectId !== id),
      topics: s.topics.filter(t => !chapterIds.includes(t.chapterId)),
    }));
  },

  // --- Chapters ---
  addChapter: async (data) => {
    const chapter = await subjectRepository.addChapter(data);
    set(s => ({ chapters: [...s.chapters, chapter] }));
    return chapter;
  },

  updateChapter: async (id, data) => {
    await subjectRepository.updateChapter(id, data);
    set(s => ({
      chapters: s.chapters.map(ch => ch.id === id ? { ...ch, ...data } : ch),
    }));
  },

  deleteChapter: async (id) => {
    await subjectRepository.deleteChapter(id);
    set(s => ({
      chapters: s.chapters.filter(ch => ch.id !== id),
      topics: s.topics.filter(t => t.chapterId !== id),
    }));
  },

  reorderChapters: async (subjectId, orderedIds) => {
    await subjectRepository.reorderChapters(subjectId, orderedIds);
    set(s => ({
      chapters: s.chapters.map(ch => {
        const idx = orderedIds.indexOf(ch.id);
        return idx >= 0 ? { ...ch, order: idx + 1 } : ch;
      }),
    }));
  },

  // --- Topics ---
  addTopic: async (data) => {
    const topic = await subjectRepository.addTopic(data);
    set(s => ({ topics: [...s.topics, topic] }));
    return topic;
  },

  updateTopic: async (id, data) => {
    await subjectRepository.updateTopic(id, data);
    set(s => ({
      topics: s.topics.map(t => t.id === id ? { ...t, ...data } : t),
    }));
  },

  deleteTopic: async (id) => {
    await subjectRepository.deleteTopic(id);
    set(s => ({ topics: s.topics.filter(t => t.id !== id) }));
  },

  // --- Helpers ---
  getSubjectById: (id) => get().subjects.find(s => s.id === id),
  getChapterById: (id) => get().chapters.find(c => c.id === id),
  getChaptersBySubject: (subjectId) => get().chapters.filter(c => c.subjectId === subjectId).sort((a, b) => a.order - b.order),
  getTopicsByChapter: (chapterId) => get().topics.filter(t => t.chapterId === chapterId).sort((a, b) => a.order - b.order),
}));

