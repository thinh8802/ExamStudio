// ============================================
// QUESTION REPOSITORY - Question CRUD & Bulk Operations
// ============================================
import { db, generateQuestionId, generateId, resetQuestionCounter } from '@/services/database';
import type { Question } from '@/types';

export class QuestionRepository {
  async getAllQuestions(): Promise<Question[]> {
    return db.questions.orderBy('createdAt').reverse().toArray();
  }

  async getQuestionById(id: string): Promise<Question | undefined> {
    return db.questions.get(id);
  }

  async addQuestion(data: Partial<Question>): Promise<Question> {
    const id = data.id || (await generateQuestionId());
    const question: Question = {
      id,
      subjectId: data.subjectId || '',
      chapterId: data.chapterId || '',
      topicId: data.topicId || '',
      type: data.type || 'single_choice',
      difficulty: data.difficulty || 'medium',
      content: data.content || '',
      answers: data.answers || [
        { id: generateId(), label: 'A', content: '', isCorrect: false },
        { id: generateId(), label: 'B', content: '', isCorrect: false },
        { id: generateId(), label: 'C', content: '', isCorrect: false },
        { id: generateId(), label: 'D', content: '', isCorrect: false },
      ],
      correctAnswer: data.correctAnswer || '',
      explanation: data.explanation || '',
      tags: data.tags || [],
      notes: data.notes || '',
      source: data.source || '',
      imageUrl: data.imageUrl || '',
      status: data.status || 'new',
      attemptCount: data.attemptCount || 0,
      correctCount: data.correctCount || 0,
      wrongCount: data.wrongCount || 0,
      masteryScore: data.masteryScore || 0,
      lastAttemptedAt: data.lastAttemptedAt || null,
      isBookmarked: data.isBookmarked || false,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    };
    await db.questions.add(question);
    return question;
  }

  async bulkCreate(questionsData: Partial<Question>[]): Promise<Question[]> {
    const questions: Question[] = [];
    
    // Prepare all questions
    for (const data of questionsData) {
      const id = data.id || (await generateQuestionId());
      const question: Question = {
        id,
        subjectId: data.subjectId || '',
        chapterId: data.chapterId || '',
        topicId: data.topicId || '',
        type: data.type || 'single_choice',
        difficulty: data.difficulty || 'medium',
        content: data.content || '',
        answers: data.answers || [
          { id: generateId(), label: 'A', content: '', isCorrect: false },
          { id: generateId(), label: 'B', content: '', isCorrect: false },
          { id: generateId(), label: 'C', content: '', isCorrect: false },
          { id: generateId(), label: 'D', content: '', isCorrect: false },
        ],
        correctAnswer: data.correctAnswer || '',
        explanation: data.explanation || '',
        tags: data.tags || [],
        notes: data.notes || '',
        source: data.source || '',
        imageUrl: data.imageUrl || '',
        status: data.status || 'new',
        attemptCount: data.attemptCount || 0,
        correctCount: data.correctCount || 0,
        wrongCount: data.wrongCount || 0,
        masteryScore: data.masteryScore || 0,
        lastAttemptedAt: data.lastAttemptedAt || null,
        isBookmarked: data.isBookmarked || false,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
      };
      questions.push(question);
    }
    
    // Atomic insert
    await db.transaction('rw', db.questions, async () => {
      await db.questions.bulkPut(questions);
    });
    
    resetQuestionCounter();
    return questions;
  }

  async updateQuestion(id: string, data: Partial<Question>): Promise<void> {
    const updated = { ...data, updatedAt: new Date() };
    await db.questions.update(id, updated);
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.transaction('rw', [db.questions, db.bookmarks, db.reports], async () => {
      await db.questions.delete(id);
      await db.bookmarks.where('questionId').equals(id).delete();
      await db.reports.where('questionId').equals(id).delete();
    });
    resetQuestionCounter();
  }

  async deleteMultiple(ids: string[]): Promise<void> {
    await db.transaction('rw', [db.questions, db.bookmarks, db.reports], async () => {
      await db.questions.bulkDelete(ids);
      for (const id of ids) {
        await db.bookmarks.where('questionId').equals(id).delete();
        await db.reports.where('questionId').equals(id).delete();
      }
    });
    resetQuestionCounter();
  }

  async bulkUpdateChapter(ids: string[], chapterId: string): Promise<void> {
    await Promise.all(ids.map(id => db.questions.update(id, { chapterId, updatedAt: new Date() })));
  }

  async bulkUpdateDifficulty(ids: string[], difficulty: string): Promise<void> {
    await Promise.all(ids.map(id => db.questions.update(id, { difficulty: difficulty as any, updatedAt: new Date() })));
  }

  async bulkToggleBookmark(ids: string[], bookmarked: boolean): Promise<void> {
    await Promise.all(ids.map(id => db.questions.update(id, { isBookmarked: bookmarked })));
  }
}

export const questionRepository = new QuestionRepository();
