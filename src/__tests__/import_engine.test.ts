import { describe, it, expect } from 'vitest';
import { parseDocument } from '../services/import-engine/hybrid-parser';
import { validateQuestion } from '../services/import-engine/validation';
import type { DocxParagraph } from '../services/import-engine/types';

function createParagraph(text: string, format?: { bold?: boolean; underline?: boolean; highlight?: string }): DocxParagraph {
  return {
    text,
    runs: [{
      text,
      ...format
    }]
  };
}

describe('Import Engine - Hybrid Parser', () => {
  it('TEST 1 — TEXT MARKER', () => {
    const doc: DocxParagraph[] = [
      createParagraph('Câu 1: Noi dung cau hoi'),
      createParagraph('A. normal A'),
      createParagraph('B. normal B'),
      createParagraph('C. normal C'),
      createParagraph('D. normal D'),
      createParagraph('👉 Đáp án đúng: B'),
      createParagraph('👉 Lời giải thích chi tiết: Giải thích test 1')
    ];
    
    const questions = parseDocument(doc).map(validateQuestion);
    expect(questions).toHaveLength(1);
    
    const q = questions[0];
    if (!q.isValid) console.log(q.warnings);
    expect(q.correctAnswer).toBe('B');
    expect(q.explanation).toContain('Giải thích test 1');
    expect(q.answerDetectionSource).toBe('text-marker');
    expect(q.isValid).toBe(true);
  });

  it('TEST 2 — TEXT MARKER TÁCH DÒNG', () => {
    const doc: DocxParagraph[] = [
      createParagraph('Câu 2: content'),
      createParagraph('A. ans A'),
      createParagraph('B. ans B'),
      createParagraph('C. ans C'),
      createParagraph('👉 Đáp án đúng:'),
      createParagraph('C')
    ];
    
    const questions = parseDocument(doc).map(validateQuestion);
    const q = questions[0];
    expect(q.correctAnswer).toBe('C');
  });

  it('TEST 3 — FORMATTING (BOLD)', () => {
    const doc: DocxParagraph[] = [
      createParagraph('Câu 3: content'),
      createParagraph('A. normal'),
      createParagraph('B. normal'),
      createParagraph('C. BOLD', { bold: true }),
      createParagraph('D. normal'),
    ];
    
    const questions = parseDocument(doc).map(validateQuestion);
    const q = questions[0];
    expect(q.correctAnswer).toBe('C');
    expect(q.answerDetectionSource).toBe('formatting');
    expect(q.confidence).toBe('high');
  });

  it('TEST 4 — UNDERLINE', () => {
    const doc: DocxParagraph[] = [
      createParagraph('Câu 4: content'),
      createParagraph('A. normal'),
      createParagraph('B. UNDERLINE', { underline: true }),
      createParagraph('C. normal'),
      createParagraph('D. normal'),
    ];
    
    const questions = parseDocument(doc).map(validateQuestion);
    const q = questions[0];
    expect(q.correctAnswer).toBe('B');
  });

  it('TEST 5 — HIGHLIGHT', () => {
    const doc: DocxParagraph[] = [
      createParagraph('Câu 5: content'),
      createParagraph('A. normal'),
      createParagraph('B. normal'),
      createParagraph('C. HIGHLIGHT', { highlight: 'yellow' }),
      createParagraph('D. normal'),
    ];
    
    const questions = parseDocument(doc).map(validateQuestion);
    const q = questions[0];
    expect(q.correctAnswer).toBe('C');
  });

  it('TEST 6 — COMBINED', () => {
    const doc: DocxParagraph[] = [
      createParagraph('Câu 6: content'),
      createParagraph('A. normal'),
      createParagraph('B. BOLD+UNDERLINE', { bold: true, underline: true }),
    ];
    
    const questions = parseDocument(doc).map(validateQuestion);
    const q = questions[0];
    expect(q.correctAnswer).toBe('B');
    expect(q.confidence).toBe('very_high'); // score is 2
  });

  it('TEST 7 — BOTH MARKER + FORMATTING', () => {
    const doc: DocxParagraph[] = [
      createParagraph('Câu 7: content'),
      createParagraph('A. normal'),
      createParagraph('C. BOLD', { bold: true }),
      createParagraph('👉 Đáp án đúng: C')
    ];
    
    const questions = parseDocument(doc).map(validateQuestion);
    const q = questions[0];
    expect(q.correctAnswer).toBe('C');
    expect(q.answerDetectionSource).toBe('combined');
    expect(q.confidence).toBe('very_high');
  });

  it('TEST 8 — CONFLICT', () => {
    const doc: DocxParagraph[] = [
      createParagraph('Câu 8: content'),
      createParagraph('A. normal'),
      createParagraph('C. BOLD', { bold: true }),
      createParagraph('👉 Đáp án đúng: B')
    ];
    
    const questions = parseDocument(doc).map(validateQuestion);
    const q = questions[0];
    expect(q.isValid).toBe(false);
    expect(q.confidence).toBe('conflict');
  });

  it('TEST 9 — NO ANSWER INFORMATION', () => {
    const doc: DocxParagraph[] = [
      createParagraph('Câu 9: content'),
      createParagraph('A. 1'),
      createParagraph('B. 2'),
      createParagraph('C. 3'),
      createParagraph('D. 4'),
    ];
    
    const questions = parseDocument(doc).map(validateQuestion);
    const q = questions[0];
    expect(q.correctAnswer).toBeNull();
    expect(q.isValid).toBe(false);
    expect(q.warnings).toContain('Không xác định được đáp án đúng');
  });

  it('TEST 10 — QUESTION ORDER', () => {
    const doc: DocxParagraph[] = [
      createParagraph('Câu 1: content'),
      createParagraph('A. 1'),
      createParagraph('B. 2'),
      createParagraph('Câu 2: content'),
      createParagraph('A. 1'),
      createParagraph('B. 2'),
      createParagraph('Câu 3: content'),
      createParagraph('A. 1'),
      createParagraph('B. 2'),
      createParagraph('Câu 4: content'),
      createParagraph('A. 1'),
      createParagraph('B. 2'),
    ];
    
    const questions = parseDocument(doc);
    expect(questions.map(q => q.sourceIndex)).toEqual([1, 2, 3, 4]);
  });

  it('TEST 11 — PARENTHETICAL ENDING WITH LETTER D NOT RECOGNIZED AS OPTION D', () => {
    const doc: DocxParagraph[] = [
      createParagraph('Câu 70. Ông C gửi đơn khởi kiện đến Tòa án yêu cầu bà D trả nợ số tiền 500 triệu đồng. Sau khi Tòa án thụ lý vụ án, ông C phát hiện bà D đang tẩu tán tài sản để trốn tránh nghĩa vụ trả nợ. Biện pháp khẩn cấp tạm thời nào sau đây là phù hợp nhất để ông C yêu cầu Tòa án áp dụng?'),
      createParagraph('• A. Kê biên tài sản của người thân bà D'),
      createParagraph('• B. Tất cả các đáp án đều đúng'),
      createParagraph('• C. Phong tỏa tài khoản ngân hàng của bà D (hoặc phong tỏa tài sản của bà D)', { highlight: 'yellow' }),
      createParagraph('• D. Cấm bà D xuất cảnh'),
    ];
    
    const questions = parseDocument(doc).map(validateQuestion);
    expect(questions).toHaveLength(1);
    const q = questions[0];
    expect(q.answers).toHaveLength(4);
    expect(q.answers.map(a => a.label)).toEqual(['A', 'B', 'C', 'D']);
    expect(q.answers[2].content).toBe('Phong tỏa tài khoản ngân hàng của bà D (hoặc phong tỏa tài sản của bà D)');
    expect(q.answers[3].content).toBe('Cấm bà D xuất cảnh');
    expect(q.correctAnswer).toBe('C');
    expect(q.isValid).toBe(true);
  });
});
