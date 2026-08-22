import { describe, it, expect } from 'vitest';
import { parseDocument } from '../services/import-engine/hybrid-parser';
import type { DocxParagraph } from '../services/import-engine/types';

describe('Scratch test 5: Auto-numbered list with number at start', () => {
  it('should not treat auto-numbered answer starting with a number as a question', () => {
    const paragraphs: DocxParagraph[] = [
      {
        text: 'Câu 144. Số công nhân năm kế hoạch là 450 người. Quỹ lương là:',
        runs: [{ text: 'Câu 144. Số công nhân năm kế hoạch là 450 người. Quỹ lương là:' }]
      },
      {
        text: '30. 816 triệu đồng',
        runs: [{ text: '30. 816 triệu đồng' }],
        isListItem: true
      },
      {
        text: '51.408 triệu đồng',
        runs: [{ text: '51.408 triệu đồng' }],
        isListItem: true
      },
      {
        text: '34.668 triệu đồng',
        runs: [{ text: '34.668 triệu đồng' }],
        isListItem: true
      },
      {
        text: '38.520 triệu đồng',
        runs: [{ text: '38.520 triệu đồng' }],
        isListItem: true
      }
    ];

    const result = parseDocument(paragraphs);
    
    console.log(JSON.stringify(result, null, 2));
    
    expect(result.length).toBe(1);
    expect(result[0].answers.length).toBe(4);
    expect(result[0].answers[0].content).toBe('30. 816 triệu đồng');
  });
});
