// ============================================
// SUBJECT REPOSITORY - Hierarchy CRUD & Cascade Queries
// ============================================
import { db, generateId } from '@/services/database';
import type { Subject, Chapter, Topic } from '@/types';
import type { SubjectDeleteCounts, ChapterDeleteCounts } from './types';

export class SubjectRepository {
  // --- Subjects ---
  async getAllSubjects(): Promise<Subject[]> {
    return db.subjects.orderBy('order').toArray();
  }

  async getSubjectById(id: string): Promise<Subject | undefined> {
    return db.subjects.get(id);
  }

  async addSubject(data: Partial<Subject>): Promise<Subject> {
    const count = await db.subjects.count();
    const subject: Subject = {
      id: generateId(),
      name: data.name || 'Môn học mới',
      description: data.description || '',
      color: data.color || '#3B82F6',
      icon: data.icon || 'BookOpen',
      order: data.order ?? (count + 1),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.subjects.add(subject);
    return subject;
  }

  async updateSubject(id: string, data: Partial<Subject>): Promise<void> {
    await db.subjects.update(id, { ...data, updatedAt: new Date() });
  }

  async querySubjectDeleteCounts(id: string): Promise<SubjectDeleteCounts> {
    const subject = await db.subjects.get(id);
    const chapters = await db.chapters.where('subjectId').equals(id).toArray();
    const chapterIds = chapters.map(c => c.id);

    let topicCount = 0;
    if (chapterIds.length > 0) {
      topicCount = await db.topics.where('chapterId').anyOf(chapterIds).count();
    }
    const questionCount = await db.questions.where('subjectId').equals(id).count();

    return {
      subjectId: id,
      subjectName: subject?.name || 'Môn học',
      chapterCount: chapters.length,
      topicCount,
      questionCount,
    };
  }

  async deleteSubject(id: string): Promise<void> {
    const chapters = await db.chapters.where('subjectId').equals(id).toArray();
    const chapterIds = chapters.map(c => c.id);

    await db.transaction('rw', [db.subjects, db.chapters, db.topics, db.questions, db.bookmarks, db.reports], async () => {
      if (chapterIds.length > 0) {
        await db.topics.where('chapterId').anyOf(chapterIds).delete();
      }
      await db.chapters.where('subjectId').equals(id).delete();
      
      const questionsToDelete = await db.questions.where('subjectId').equals(id).toArray();
      const questionIds = questionsToDelete.map(q => q.id);

      if (questionIds.length > 0) {
        for (const qId of questionIds) {
          await db.bookmarks.where('questionId').equals(qId).delete();
          await db.reports.where('questionId').equals(qId).delete();
        }
      }
      await db.questions.where('subjectId').equals(id).delete();
      await db.subjects.delete(id);
    });
  }

  // --- Chapters ---
  async getAllChapters(): Promise<Chapter[]> {
    return db.chapters.orderBy('order').toArray();
  }

  async getChaptersBySubject(subjectId: string): Promise<Chapter[]> {
    return db.chapters.where('subjectId').equals(subjectId).sortBy('order');
  }

  async addChapter(data: Partial<Chapter>): Promise<Chapter> {
    const subjectId = data.subjectId || '';
    const count = await db.chapters.where('subjectId').equals(subjectId).count();
    const chapter: Chapter = {
      id: generateId(),
      subjectId,
      name: data.name || 'Chương mới',
      description: data.description || '',
      order: data.order ?? (count + 1),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.chapters.add(chapter);
    return chapter;
  }

  async updateChapter(id: string, data: Partial<Chapter>): Promise<void> {
    await db.chapters.update(id, { ...data, updatedAt: new Date() });
  }

  async queryChapterDeleteCounts(id: string): Promise<ChapterDeleteCounts> {
    const chapter = await db.chapters.get(id);
    const topicCount = await db.topics.where('chapterId').equals(id).count();
    const questionCount = await db.questions.where('chapterId').equals(id).count();

    return {
      chapterId: id,
      chapterName: chapter?.name || 'Chương',
      topicCount,
      questionCount,
    };
  }

  async deleteChapter(id: string): Promise<void> {
    await db.transaction('rw', [db.chapters, db.topics, db.questions, db.bookmarks, db.reports], async () => {
      await db.topics.where('chapterId').equals(id).delete();
      const questionsToDelete = await db.questions.where('chapterId').equals(id).toArray();
      const questionIds = questionsToDelete.map(q => q.id);

      if (questionIds.length > 0) {
        for (const qId of questionIds) {
          await db.bookmarks.where('questionId').equals(qId).delete();
          await db.reports.where('questionId').equals(qId).delete();
        }
      }
      await db.questions.where('chapterId').equals(id).delete();
      await db.chapters.delete(id);
    });
  }

  async reorderChapters(_subjectId: string, orderedIds: string[]): Promise<void> {
    const updates = orderedIds.map((id, index) => db.chapters.update(id, { order: index + 1 }));
    await Promise.all(updates);
  }

  // --- Topics ---
  async getAllTopics(): Promise<Topic[]> {
    return db.topics.orderBy('order').toArray();
  }

  async getTopicsByChapter(chapterId: string): Promise<Topic[]> {
    return db.topics.where('chapterId').equals(chapterId).sortBy('order');
  }

  async addTopic(data: Partial<Topic>): Promise<Topic> {
    const chapterId = data.chapterId || '';
    const subjectId = data.subjectId || '';
    const count = await db.topics.where('chapterId').equals(chapterId).count();
    const topic: Topic = {
      id: generateId(),
      chapterId,
      subjectId,
      name: data.name || 'Chủ đề mới',
      order: data.order ?? (count + 1),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.topics.add(topic);
    return topic;
  }

  async updateTopic(id: string, data: Partial<Topic>): Promise<void> {
    await db.topics.update(id, { ...data, updatedAt: new Date() });
  }

  async deleteTopic(id: string): Promise<void> {
    await db.topics.delete(id);
  }
}

export const subjectRepository = new SubjectRepository();
