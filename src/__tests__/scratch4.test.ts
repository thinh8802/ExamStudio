import { describe, it, expect } from 'vitest';
import { parseDocument } from '../services/import-engine/hybrid-parser';
import type { DocxParagraph } from '../services/import-engine/types';

describe('Scratch test 4: Correct answer detection with formatting', () => {
  it('should detect bold and colored correct answers', () => {
    const paragraphs: DocxParagraph[] = [
      {
        text: 'Câu 1: Phân tích tình hình',
        runs: [{ text: 'Câu 1: Phân tích tình hình' }]
      },
      {
        text: 'A. Hoàn thành kế hoạch',
        runs: [{ text: 'A. Hoàn thành kế hoạch', bold: true, color: 'FF0000' }]
      },
      {
        text: 'B. Vượt chi',
        runs: [{ text: 'B. Vượt chi' }]
      },
      {
        text: 'C. Tiết kiệm',
        runs: [{ text: 'C. Tiết kiệm' }]
      },
      {
        text: 'D. Sử dụng sai',
        runs: [{ text: 'D. Sử dụng sai' }]
      }
    ];

    const result = parseDocument(paragraphs);
    
    console.log(JSON.stringify(result, null, 2));
    
    expect(result.length).toBe(1);
    expect(result[0].answers.length).toBe(4);
    expect(result[0].correctAnswer).toBe('A');
  });
});
