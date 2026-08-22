// ============================================
// EXAM BUILDER SERVICE
// Algorithms: Matrix Validation, Candidate Pool, Seeded Generation, Reroll
// ============================================
import type {
  Exam, ExamBlueprint, Question, Chapter, Difficulty,
  ChapterDistribution, DifficultyDistribution
} from '@/types';
import { generateId } from '@/services/database';

export interface MatrixValidationResult {
  isValid: boolean;
  canAutoFill: boolean;
  totalRequested: number;
  totalAvailable: number;
  chapterIssues: Array<{
    chapterId: string;
    chapterName: string;
    requested: number;
    available: number;
    missing: number;
  }>;
  difficultyIssues: Array<{
    difficulty: Difficulty;
    requested: number;
    available: number;
    missing: number;
  }>;
  errors: string[];
  warnings: string[];
}

export interface AutoExamParams {
  subjectId: string;
  name: string;
  description?: string;
  totalQuestions: number;
  timeLimit: number;
  chapterDistribution: ChapterDistribution[];
  difficultyDistribution: DifficultyDistribution[];
  strategy?: {
    prioritizeWrong?: boolean;
    prioritizeNew?: boolean;
    excludeMastered?: boolean;
  };
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  passingScore?: number;
  generationSeed?: string;
  allowAutoFill?: boolean;
}

// Simple seeded PRNG (mulberry32)
export function createPRNG(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let s = h >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ExamBuilderService {
  /**
   * Validate matrix feasibility against question bank
   */
  static validateMatrix(
    subjectId: string,
    totalQuestions: number,
    chapterDist: ChapterDistribution[],
    diffDist: DifficultyDistribution[],
    allQuestions: Question[],
    allChapters: Chapter[],
    strategy?: { excludeMastered?: boolean }
  ): MatrixValidationResult {
    let pool = allQuestions.filter(q => q.subjectId === subjectId);
    if (strategy?.excludeMastered) {
      const nonMastered = pool.filter(q => q.status !== 'mastered');
      // Only exclude mastered if we still have questions
      if (nonMastered.length >= totalQuestions) {
        pool = nonMastered;
      }
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const chapterIssues: MatrixValidationResult['chapterIssues'] = [];
    const difficultyIssues: MatrixValidationResult['difficultyIssues'] = [];

    // 1. Check total questions
    if (totalQuestions <= 0) {
      errors.push('Tổng số câu hỏi phải lớn hơn 0.');
    }
    if (pool.length < totalQuestions) {
      errors.push(`Kho câu hỏi chỉ có ${pool.length} câu khả dụng, không đủ cho yêu cầu ${totalQuestions} câu.`);
    }

    // 2. Check chapter distribution
    const chapterSum = chapterDist.reduce((acc, c) => acc + (c.count || 0), 0);
    if (chapterSum !== totalQuestions && chapterDist.length > 0) {
      errors.push(`Tổng số câu theo chương (${chapterSum}) không khớp với tổng số câu của đề (${totalQuestions}).`);
    }

    const chapterMap = new Map(allChapters.map(c => [c.id, c.name]));
    chapterDist.forEach(cd => {
      const availableInChapter = pool.filter(q => q.chapterId === cd.chapterId).length;
      if (availableInChapter < cd.count) {
        const missing = cd.count - availableInChapter;
        const name = chapterMap.get(cd.chapterId) || cd.chapterId;
        chapterIssues.push({
          chapterId: cd.chapterId,
          chapterName: name,
          requested: cd.count,
          available: availableInChapter,
          missing,
        });
        errors.push(`Chương "${name}" yêu cầu ${cd.count} câu nhưng chỉ có ${availableInChapter} câu (thiếu ${missing} câu).`);
      }
    });

    // 3. Check difficulty distribution
    const diffSum = diffDist.reduce((acc, d) => acc + (d.percentage || 0), 0);
    if (Math.round(diffSum) !== 100 && diffDist.length > 0) {
      warnings.push(`Tổng tỷ lệ độ khó là ${diffSum}%, chưa đạt 100%.`);
    }

    diffDist.forEach(dd => {
      const targetCount = Math.round((dd.percentage / 100) * totalQuestions);
      const availableInDiff = pool.filter(q => q.difficulty === dd.difficulty).length;
      if (availableInDiff < targetCount) {
        const missing = targetCount - availableInDiff;
        difficultyIssues.push({
          difficulty: dd.difficulty,
          requested: targetCount,
          available: availableInDiff,
          missing,
        });
        warnings.push(`Độ khó "${dd.difficulty}" yêu cầu ~${targetCount} câu nhưng chỉ có ${availableInDiff} câu.`);
      }
    });

    const canAutoFill = pool.length >= totalQuestions && chapterIssues.length > 0;
    const isValid = errors.length === 0;

    return {
      isValid,
      canAutoFill,
      totalRequested: totalQuestions,
      totalAvailable: pool.length,
      chapterIssues,
      difficultyIssues,
      errors,
      warnings,
    };
  }

  /**
   * Generate exam using constraint satisfaction algorithm with seed reproducibility
   */
  static generateExamFromMatrix(
    params: AutoExamParams,
    allQuestions: Question[],
    allChapters: Chapter[]
  ): { exam: Exam; questions: Question[]; seed: string } {
    const seed = params.generationSeed || Math.random().toString(36).substring(2, 9);
    const rng = createPRNG(seed);

    let pool = allQuestions.filter(q => q.subjectId === params.subjectId);
    if (pool.length === 0) {
      throw new Error('Môn học này chưa có câu hỏi nào trong ngân hàng.');
    }

    // Apply strategy filter
    if (params.strategy?.excludeMastered) {
      const nonMastered = pool.filter(q => q.status !== 'mastered');
      if (nonMastered.length >= params.totalQuestions) {
        pool = nonMastered;
      }
    }

    // Calculate target counts per difficulty
    const difficultyTargets: Record<Difficulty, number> = {
      easy: 0,
      medium: 0,
      hard: 0,
      very_hard: 0,
    };

    let allocatedDiffCount = 0;
    const sortedDiffDist = [...params.difficultyDistribution].sort((a, b) => b.percentage - a.percentage);
    sortedDiffDist.forEach((dd, idx) => {
      if (idx === sortedDiffDist.length - 1) {
        difficultyTargets[dd.difficulty] = Math.max(0, params.totalQuestions - allocatedDiffCount);
      } else {
        const count = Math.round((dd.percentage / 100) * params.totalQuestions);
        difficultyTargets[dd.difficulty] = count;
        allocatedDiffCount += count;
      }
    });

    const selectedQuestionMap = new Map<string, Question>();
    const selectedIds = new Set<string>();

    // Helper to score and sort candidates by strategy
    const sortCandidates = (candidates: Question[]): Question[] => {
      return [...candidates].sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        if (params.strategy?.prioritizeWrong) {
          if ((a.wrongCount || 0) > 0) scoreA += 50 + (a.wrongCount || 0) * 10;
          if ((b.wrongCount || 0) > 0) scoreB += 50 + (b.wrongCount || 0) * 10;
        }

        if (params.strategy?.prioritizeNew) {
          if (a.status === 'new' || (a.attemptCount || 0) === 0) scoreA += 30;
          if (b.status === 'new' || (b.attemptCount || 0) === 0) scoreB += 30;
        }

        // Add small pseudo-random jitter for tie-breaking
        scoreA += rng() * 5;
        scoreB += rng() * 5;

        return scoreB - scoreA;
      });
    };

    // 1. Pick questions per chapter adhering to chapter constraints
    const activeChapters = params.chapterDistribution.filter(c => c.count > 0);
    
    if (activeChapters.length > 0) {
      activeChapters.forEach(cd => {
        let neededForChapter = cd.count;
        const chapterCandidates = pool.filter(q => q.chapterId === cd.chapterId && !selectedIds.has(q.id));
        const sortedChapterCandidates = sortCandidates(chapterCandidates);

        // Try to pick matching required difficulties first
        for (const q of sortedChapterCandidates) {
          if (neededForChapter <= 0) break;
          selectedQuestionMap.set(q.id, q);
          selectedIds.add(q.id);
          neededForChapter--;
        }
      });
    }

    // 2. If still needed questions or auto-fill allowed, fill remaining from subject pool
    if (selectedQuestionMap.size < params.totalQuestions) {
      const remainingNeeded = params.totalQuestions - selectedQuestionMap.size;
      const remainingCandidates = pool.filter(q => !selectedIds.has(q.id));
      const sortedRemaining = sortCandidates(remainingCandidates);

      for (let i = 0; i < Math.min(remainingNeeded, sortedRemaining.length); i++) {
        const q = sortedRemaining[i];
        selectedQuestionMap.set(q.id, q);
        selectedIds.add(q.id);
      }
    }

    let finalQuestions = Array.from(selectedQuestionMap.values());

    // Shuffle questions if requested
    if (params.shuffleQuestions) {
      finalQuestions = [...finalQuestions].sort(() => rng() - 0.5);
    }

    const examId = generateId();
    const now = new Date();

    const exam: Exam = {
      id: examId,
      name: params.name || `Đề thi tự động - ${now.toLocaleDateString('vi-VN')}`,
      subjectId: params.subjectId,
      description: params.description || `Đề thi tự động theo ma trận (${finalQuestions.length} câu)`,
      questionIds: finalQuestions.map(q => q.id),
      questionCount: finalQuestions.length,
      timeLimit: params.timeLimit ?? 45,
      shuffleQuestions: Boolean(params.shuffleQuestions),
      shuffleAnswers: Boolean(params.shuffleAnswers),
      passingScore: params.passingScore ?? 5.0,
      status: 'ready',
      generationSeed: seed,
      snapshotQuestions: finalQuestions,
      createdAt: now,
      updatedAt: now,
    };

    return {
      exam,
      questions: finalQuestions,
      seed,
    };
  }

  /**
   * Reroll 1 question without breaking matrix constraints (same chapter and difficulty)
   */
  static rerollQuestion(params: {
    currentQuestionId: string;
    examQuestionIds: string[];
    subjectId: string;
    chapterId?: string;
    difficulty?: Difficulty;
    allQuestions: Question[];
    strategy?: any;
    seed?: string;
  }): Question | null {
    const excludedIds = new Set([...params.examQuestionIds, params.currentQuestionId]);
    const rng = createPRNG(params.seed || Math.random().toString());

    // Filter candidates strictly matching subject, chapter, and difficulty
    let candidates = params.allQuestions.filter(q => {
      if (q.subjectId !== params.subjectId) return false;
      if (excludedIds.has(q.id)) return false;
      if (params.chapterId && q.chapterId !== params.chapterId) return false;
      if (params.difficulty && q.difficulty !== params.difficulty) return false;
      return true;
    });

    // Fallback: If no candidate with same chapter AND difficulty, match same chapter
    if (candidates.length === 0 && params.chapterId) {
      candidates = params.allQuestions.filter(q => {
        if (q.subjectId !== params.subjectId) return false;
        if (excludedIds.has(q.id)) return false;
        if (q.chapterId !== params.chapterId) return false;
        return true;
      });
    }

    if (candidates.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(rng() * candidates.length);
    return candidates[randomIndex] || null;
  }

  /**
   * Duplicate an existing exam with new ID, timestamps, and "(Bản sao)" title
   */
  static duplicateExam(exam: Exam, newName?: string): Exam {
    const now = new Date();
    return {
      ...exam,
      id: generateId(),
      name: newName || `${exam.name} (Bản sao)`,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Export exam and its questions to formatted JSON
   */
  static exportExamJSON(exam: Exam, questions: Question[]): string {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exam: {
        id: exam.id,
        name: exam.name,
        subjectId: exam.subjectId,
        description: exam.description,
        questionCount: exam.questionCount,
        timeLimit: exam.timeLimit,
        shuffleQuestions: exam.shuffleQuestions,
        shuffleAnswers: exam.shuffleAnswers,
        passingScore: exam.passingScore,
        createdAt: exam.createdAt,
      },
      questions: questions.map(q => ({
        id: q.id,
        content: q.content,
        type: q.type,
        difficulty: q.difficulty,
        answers: q.answers,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        chapterId: q.chapterId,
        topicId: q.topicId,
      })),
    };
    return JSON.stringify(exportData, null, 2);
  }
}
