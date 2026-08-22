import { describe, it, expect } from 'vitest';
import { parseDocument } from '../services/import-engine/hybrid-parser';
import type { DocxParagraph } from '../services/import-engine/types';

describe('Scratch test 3: Auto-numbered answers', () => {
  it('should parse auto-numbered answers correctly', () => {
    const paragraphs: DocxParagraph[] = [
      {
        text: 'Câu 142. Số công nhân năm kế hoạch là 500 người, lao động quản lý bằng 15% công nhân. Tiền lương bình quân năm kế hoạch của doanh nghiệp là 9 triệu đồng/tháng. Quỹ lương năm kế hoạch của doanh nghiệp là',
        runs: [{ text: 'Câu 142. Số công nhân năm kế hoạch...' }],
      },
      {
        text: '60.816 triệu đồng',
        runs: [{ text: '60.816 triệu đồng' }],
        isListItem: true,
      },
      {
        text: '72.743 triệu đồng',
        runs: [{ text: '72.743 triệu đồng' }],
        isListItem: true,
      },
      {
        text: '62.100 triệu đồng',
        runs: [{ text: '62.100 triệu đồng', highlight: 'yellow', color: 'red' }],
        isListItem: true,
      },
      {
        text: '68.520 triệu đồng',
        runs: [{ text: '68.520 triệu đồng' }],
        isListItem: true,
      }
    ];

    const result = parseDocument(paragraphs);
    console.log(JSON.stringify(result, null, 2));
  });
});
