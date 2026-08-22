// ============================================
// RANDOMIZATION SERVICE
// ============================================
import type { Question, QuizConfig, Difficulty } from '@/types';
import { db } from './database';

/**
 * Seeded random number generator (Mulberry32)
 * Cho phép tái tạo cùng kết quả với cùng seed
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

/**
 * Fisher-Yates shuffle với optional seed
 */
export function shuffle<T>(array: T[], seed?: string): T[] {
  const result = [...array];
  const rng = seed ? seededRandom(hashString(seed)) : Math.random;
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor((typeof rng === 'function' ? rng() : Math.random()) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Trộn thứ tự đáp án cho một câu hỏi
 * Trả về mảng labels đã trộn (e.g., ['C', 'A', 'D', 'B'])
 */
export function shuffleAnswerLabels(answerCount: number, seed?: string): string[] {
  const labels = Array.from({ length: answerCount }, (_, i) =>
    String.fromCharCode(65 + i)
  );
  return shuffle(labels, seed);
}

/**
 * Lấy câu hỏi từ database theo config
 */
export async function selectQuestions(config: QuizConfig): Promise<Question[]> {
  let questions: Question[];

  // 1. Fetch candidate pool
  if (config.chapterIds && config.chapterIds.length > 0) {
    questions = await db.questions
      .where('chapterId')
      .anyOf(config.chapterIds)
      .toArray();
  } else if (config.subjectId) {
    questions = await db.questions
      .where('subjectId')
      .equals(config.subjectId)
      .toArray();
  } else {
    questions = await db.questions.toArray();
  }

  if (questions.length === 0) {
    return [];
  }

  // 2. Strict Review Mode candidate filtering
  if (config.mode === 'review' || config.mode === 'smart_wrong') {
    questions = questions.filter(
      q => (q.wrongCount ?? 0) > 0 && q.status !== 'mastered'
    );
  }

  // 3. Filter out mastered questions if requested
  if (config.excludeMastered) {
    questions = questions.filter(q => q.status !== 'mastered');
  }

  // 4. Filter by difficulty
  if (config.difficulty) {
    questions = questions.filter(q => q.difficulty === config.difficulty);
  }

  // Return empty array if candidate pool is empty
  if (questions.length === 0) {
    return [];
  }

  // 5. Priority Sorting & Priority-Aware Bucketed Shuffling
  const hasPriority = config.prioritizeWrong || config.prioritizeNew || config.prioritizeWeak;

  if (hasPriority) {
    // Multi-criteria stable sort
    questions.sort((a, b) => {
      if (config.prioritizeWrong) {
        const diff = (b.wrongCount || 0) - (a.wrongCount || 0);
        if (diff !== 0) return diff;
      }
      if (config.prioritizeNew) {
        const diff = (a.attemptCount || 0) - (b.attemptCount || 0);
        if (diff !== 0) return diff;
      }
      if (config.prioritizeWeak) {
        const diff = (a.masteryScore || 0) - (b.masteryScore || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

    if (config.shuffleQuestions) {
      // Group items with identical priority keys into buckets
      const buckets: Question[][] = [];
      let currentBucket: Question[] = [];
      let currentKey = '';

      for (const q of questions) {
        const keyParts: string[] = [];
        if (config.prioritizeWrong) keyParts.push(`w:${q.wrongCount || 0}`);
        if (config.prioritizeNew) keyParts.push(`a:${q.attemptCount || 0}`);
        if (config.prioritizeWeak) keyParts.push(`m:${q.masteryScore || 0}`);
        const key = keyParts.join('|');

        if (currentBucket.length === 0 || key === currentKey) {
          currentBucket.push(q);
          currentKey = key;
        } else {
          buckets.push(currentBucket);
          currentBucket = [q];
          currentKey = key;
        }
      }
      if (currentBucket.length > 0) {
        buckets.push(currentBucket);
      }

      // Intra-bucket shuffling preserves inter-bucket priority order
      questions = buckets.flatMap(bucket => shuffle(bucket, config.randomSeed || undefined));
    }
  } else if (config.shuffleQuestions) {
    // Pure shuffle when no priority flags are active
    questions = shuffle(questions, config.randomSeed || undefined);
  }

  // 6. Return sliced pool
  const count = Math.min(config.questionCount, questions.length);
  return questions.slice(0, count);
}

/**
 * Tạo đề thi tự động từ blueprint
 */
export async function generateExamFromBlueprint(
  subjectId: string,
  chapterDistribution: { chapterId: string; count: number }[],
  difficultyDistribution?: { difficulty: Difficulty; percentage: number }[],
  shuffleEnabled: boolean = true,
  seed?: string
): Promise<{ questions: Question[]; warnings: string[] }> {
  const warnings: string[] = [];
  const selectedQuestions: Question[] = [];

  for (const dist of chapterDistribution) {
    let chapterQuestions = await db.questions
      .where('chapterId')
      .equals(dist.chapterId)
      .toArray();

    // Áp dụng phân bổ theo mức độ nếu có
    if (difficultyDistribution && difficultyDistribution.length > 0) {
      const byDiff: Question[] = [];
      for (const dd of difficultyDistribution) {
        const count = Math.round(dist.count * dd.percentage / 100);
        const filtered = chapterQuestions.filter(q => q.difficulty === dd.difficulty);
        const shuffled = shuffle(filtered, seed);
        byDiff.push(...shuffled.slice(0, count));
      }
      chapterQuestions = byDiff;
    } else {
      chapterQuestions = shuffle(chapterQuestions, seed);
    }

    if (chapterQuestions.length < dist.count) {
      warnings.push(
        `Chương "${dist.chapterId}": Yêu cầu ${dist.count} câu, chỉ có ${chapterQuestions.length} câu khả dụng.`
      );
    }

    selectedQuestions.push(
      ...chapterQuestions.slice(0, dist.count)
    );
  }

  // Loại bỏ trùng lặp
  const uniqueMap = new Map<string, Question>();
  for (const q of selectedQuestions) {
    uniqueMap.set(q.id, q);
  }

  let finalQuestions = Array.from(uniqueMap.values());

  if (shuffleEnabled) {
    finalQuestions = shuffle(finalQuestions, seed);
  }

  return { questions: finalQuestions, warnings };
}

/**
 * Kiểm tra số lượng câu hỏi khả dụng
 */
export async function getAvailableQuestionCount(
  subjectId: string,
  chapterIds: string[],
  difficulty?: Difficulty
): Promise<number> {
  let query;
  if (chapterIds.length > 0) {
    query = db.questions.where('chapterId').anyOf(chapterIds);
  } else if (subjectId) {
    query = db.questions.where('subjectId').equals(subjectId);
  } else {
    query = db.questions.toCollection();
  }

  if (difficulty) {
    return (await query.toArray()).filter(q => q.difficulty === difficulty).length;
  }

  return query.count();
}
