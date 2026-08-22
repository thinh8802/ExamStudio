import type { ParsedQuestion } from './types';

export function validateQuestion(q: ParsedQuestion): ParsedQuestion {
  const warnings: string[] = [...q.warnings];
  let isValid = true;

  // 1. Question Content
  if (!q.content.trim()) {
    warnings.push('Nội dung câu hỏi bị rỗng');
    isValid = false;
  }

  // 2. Answers
  if (q.answers.length < 2) {
    warnings.push('Câu hỏi phải có ít nhất 2 đáp án');
    isValid = false;
  }

  const hasEmptyAnswer = q.answers.some(a => !a.content.trim());
  if (hasEmptyAnswer) {
    warnings.push('Có đáp án bị rỗng');
    isValid = false;
  }

  const labels = q.answers.map(a => a.label);
  const uniqueLabels = new Set(labels);
  if (labels.length !== uniqueLabels.size) {
    warnings.push('Có đáp án trùng nhãn (vd: nhiều đáp án A)');
    isValid = false;
  }

  // 3. Correct Answer
  if (!q.correctAnswer) {
    if (!warnings.includes('Không xác định được đáp án đúng')) {
      warnings.push('Không xác định được đáp án đúng');
    }
    isValid = false;
  } else {
    // Check if correct answer labels actually exist
    const correctLabels = q.correctAnswer.split(',');
    const allLabelsExist = correctLabels.every(lbl => labels.includes(lbl));
    if (!allLabelsExist) {
      warnings.push(`Đáp án đúng (${q.correctAnswer}) không khớp với các lựa chọn có sẵn`);
      isValid = false;
    }
  }

  // 4. Conflicts
  if (q.confidence === 'conflict') {
    isValid = false;
  }

  return {
    ...q,
    warnings,
    isValid
  };
}

export function validateAll(questions: ParsedQuestion[]): ParsedQuestion[] {
  return questions.map(validateQuestion);
}
