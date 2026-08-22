import { describe, it, expect } from 'vitest';
import { parseDocument } from '../services/import-engine/hybrid-parser';
import type { DocxParagraph } from '../services/import-engine/types';

describe('Scratch test 6: Explanation with numbers', () => {
  it('should not treat numbered items in explanation as questions if document uses explicit prefix', () => {
    const paragraphs: DocxParagraph[] = [
      {
        text: 'Câu 248: Hàm sản xuất',
        runs: [{ text: 'Câu 248: Hàm sản xuất' }]
      },
      {
        text: 'A. 1', runs: [{ text: 'A. 1' }]
      },
      {
        text: 'B. 2', runs: [{ text: 'B. 2' }]
      },
      {
        text: 'C. 3', runs: [{ text: 'C. 3' }]
      },
      {
        text: 'D. 4', runs: [{ text: 'D. 4' }]
      },
      {
        text: 'Giải thích:', runs: [{ text: 'Giải thích:' }]
      },
      {
        text: '1. Hàm sản xuất', runs: [{ text: '1. Hàm sản xuất' }]
      },
      {
        text: '2. Điều kiện tối ưu', runs: [{ text: '2. Điều kiện tối ưu' }]
      },
      {
        text: 'Câu 249: Câu tiếp theo', runs: [{ text: 'Câu 249: Câu tiếp theo' }]
      }
    ];

    const result = parseDocument(paragraphs);
        console.log(JSON.stringify(result.map(r => r.questionNumber), null, 2));
    expect(result.length).toBe(2);
    expect(result[0].questionNumber).toBe("1");
    expect(result[0].explanation).toContain('2. Điều kiện tối ưu');
    expect(result[1].questionNumber).toBe("2");
  });
});
