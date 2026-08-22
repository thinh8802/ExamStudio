import { describe, it, expect } from 'vitest';
import { parseDocument } from '../services/import-engine/hybrid-parser';
import type { DocxParagraph } from '../services/import-engine/types';

describe('Scratch test', () => {
  it('should parse Cau 202 and Cau 203 correctly', () => {
    const paragraphs: DocxParagraph[] = [
      {
        text: 'Câu 202: Lập kế hoạch tăng năng suất lao động không căn cứ vào:',
        runs: [{ text: 'Câu 202: Lập kế hoạch tăng năng suất lao động không căn cứ vào:' }],
      },
      {
        text: 'A. Kế hoạch sản xuất kinh doanh',
        runs: [{ text: 'A. Kế hoạch sản xuất kinh doanh' }],
      },
      {
        text: 'B. Định mức lao động',
        runs: [{ text: 'B. Định mức lao động' }],
      },
      {
        text: 'C. Kế hoạch quỹ tiền lương',
        runs: [{ text: 'C. Kế hoạch quỹ tiền lương', color: 'red', bold: true }],
      },
      {
        text: 'D. Hiện trạng nguồn nhân lực',
        runs: [{ text: 'D. Hiện trạng nguồn nhân lực' }],
      },
      {
        text: 'Câu 203: Số công nhân năm kế hoạch là 500 người, lao động quản lý bằng 15 % công nhân. Tiền lương bình quân năm kế hoạch của doanh nghiệp là 9 triệu đồng/tháng. Quỹ lương năm kế hoạch của doanh nghiệp là:',
        runs: [{ text: 'Câu 203: Số công nhân năm kế hoạch là 500 người, lao động quản lý bằng 15 % công nhân. Tiền lương bình quân năm kế hoạch của doanh nghiệp là 9 triệu đồng/tháng. Quỹ lương năm kế hoạch của doanh nghiệp là:' }],
      },
      {
        text: 'A. 60.816 triệu đồng',
        runs: [{ text: 'A. 60.816 triệu đồng' }],
      },
      {
        text: 'B. 72.742 triệu đồng',
        runs: [{ text: 'B. 72.742 triệu đồng' }],
      },
      {
        text: 'C. 62.100 triệu đồng',
        runs: [{ text: 'C. 62.100 triệu đồng', color: 'red', bold: true }],
      },
      {
        text: 'D. 68.520 triệu đồng',
        runs: [{ text: 'D. 68.520 triệu đồng' }],
      },
    ];

    const result = parseDocument(paragraphs);
    console.log(JSON.stringify(result, null, 2));
  });
});
