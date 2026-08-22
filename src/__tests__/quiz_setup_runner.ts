// Standalone Test Runner for QuizSetupPage Boundary Conditions
import type { Question, Difficulty, QuizConfig } from '../types';
import fs from 'fs';
import path from 'path';

function computeAvailableCount(
  questions: Question[],
  subjectId: string,
  chapterIds: string[],
  mode: QuizConfig['mode'],
  difficulty: Difficulty | '',
  excludeMastered: boolean
): number {
  if (!subjectId || chapterIds.length === 0) return 0;

  let qs = questions.filter(q => q.subjectId === subjectId && chapterIds.includes(q.chapterId));

  if (mode === 'review') {
    qs = qs.filter(q => q.wrongCount > 0 || q.status === 'needs_review');
  }
  if (difficulty) {
    qs = qs.filter(q => q.difficulty === difficulty);
  }
  if (excludeMastered) {
    qs = qs.filter(q => q.status !== 'mastered');
  }
  return qs.length;
}

function createMockQuestions(count: number, options: Partial<Question> = {}): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q-${i + 1}`,
    subjectId: 'sub-1',
    chapterId: `chap-${(i % 5) + 1}`,
    content: `Question ${i + 1}`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 0,
    difficulty: (['easy', 'medium', 'hard', 'very_hard'][i % 4]) as Difficulty,
    wrongCount: options.wrongCount ?? 0,
    correctCount: options.correctCount ?? 0,
    attemptCount: options.attemptCount ?? 0,
    status: options.status ?? 'unattempted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...options,
  })) as any;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ TEST PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('=== STARTING EMPIRICAL BOUNDARY & LOGIC TESTS ===\n');

  const mockSubjectId = 'sub-1';
  const mockChapterIds = ['chap-1', 'chap-2', 'chap-3', 'chap-4', 'chap-5'];

  // Test 1: 0 questions
  const q0: Question[] = [];
  const c0 = computeAvailableCount(q0, mockSubjectId, mockChapterIds, 'practice', '', false);
  assert(c0 === 0, `0 questions available expected 0, got ${c0}`);

  // Test 2: 1000 questions
  const q1000 = createMockQuestions(1000);
  const c1000 = computeAvailableCount(q1000, mockSubjectId, mockChapterIds, 'practice', '', false);
  assert(c1000 === 1000, `1000 questions available expected 1000, got ${c1000}`);

  // Test 3: 0 chapters selected
  const q100 = createMockQuestions(100);
  const cNoChap = computeAvailableCount(q100, mockSubjectId, [], 'practice', '', false);
  assert(cNoChap === 0, `0 chapters selected expected 0, got ${cNoChap}`);

  // Test 4: All chapters vs Partial chapters selected
  const cAllChap = computeAvailableCount(q100, mockSubjectId, mockChapterIds, 'practice', '', false);
  assert(cAllChap === 100, `All chapters selected expected 100, got ${cAllChap}`);
  const cPartChap = computeAvailableCount(q100, mockSubjectId, ['chap-1', 'chap-2'], 'practice', '', false);
  assert(cPartChap === 40, `2/5 chapters selected expected 40, got ${cPartChap}`);

  // Test 5: Review mode empty state (0 wrong questions)
  const qNoWrong = createMockQuestions(50, { wrongCount: 0, status: 'unattempted' });
  const cReviewEmpty = computeAvailableCount(qNoWrong, mockSubjectId, mockChapterIds, 'review', '', false);
  assert(cReviewEmpty === 0, `Review mode with 0 wrong questions expected 0, got ${cReviewEmpty}`);

  // Test 6: Check exact string presence in QuizSetupPage.tsx
  const pageContent = fs.readFileSync(path.resolve('./src/pages/QuizSetupPage.tsx'), 'utf-8');
  const expectedText = '🎉 Bạn không có câu nào cần ôn lại.';
  assert(
    pageContent.includes(expectedText),
    `QuizSetupPage.tsx should contain exact string "${expectedText}"`
  );

  // Test 7: Exclude Mastered filter in Review mode
  const qMix = [
    ...createMockQuestions(10, { wrongCount: 1, status: 'needs_review' }),
    ...createMockQuestions(10, { wrongCount: 2, status: 'mastered' }),
  ];
  const cWithMastered = computeAvailableCount(qMix, mockSubjectId, mockChapterIds, 'review', '', false);
  assert(cWithMastered === 20, `Review mode including mastered expected 20, got ${cWithMastered}`);
  const cWithoutMastered = computeAvailableCount(qMix, mockSubjectId, mockChapterIds, 'review', '', true);
  assert(cWithoutMastered === 10, `Review mode excluding mastered expected 10, got ${cWithoutMastered}`);

  console.log('\n=== ALL 7 EMPIRICAL TESTS PASSED SUCCESSFULLY ===');
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
