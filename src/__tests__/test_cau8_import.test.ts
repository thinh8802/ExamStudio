import { describe, it, expect } from 'vitest';
import { parseDocument } from '../services/import-engine/hybrid-parser';
import { validateQuestion } from '../services/import-engine/validation';
import type { DocxParagraph } from '../services/import-engine/types';

describe('Cau 8 Import Verification', () => {
  it('should parse Cau 8 with A manual letter and B, C, D as successive paragraphs / Word list items with C highlighted', () => {
    const doc: DocxParagraph[] = [
      {
        text: 'Câu 8. Đường giới hạn khả năng sản xuất là đường:',
        runs: [{ text: 'Câu 8. Đường giới hạn khả năng sản xuất là đường:', bold: true, highlight: 'yellow' }],
      },
      {
        text: 'A. Thể hiện các mức kết hợp tối đa của số lượng các loại sản phẩm có thể sản xuất được khi sử dụng toàn bộ năng lực sẵn có của nền kinh tế',
        runs: [{ text: 'A. Thể hiện các mức kết hợp tối đa của số lượng các loại sản phẩm có thể sản xuất được khi sử dụng toàn bộ năng lực sẵn có của nền kinh tế' }],
      },
      {
        text: 'Phản ánh tập hợp các phương án hiệu quả về mặt kĩ thuật mà nền kinh tế có thể thực hiện được với nguồn lực hiện có và công nghệ nhất định',
        runs: [{ text: 'Phản ánh tập hợp các phương án hiệu quả về mặt kĩ thuật mà nền kinh tế có thể thực hiện được với nguồn lực hiện có và công nghệ nhất định' }],
        isListItem: true,
      },
      {
        text: 'Tất cả các câu trên đều đúng',
        runs: [{ text: 'Tất cả các câu trên đều đúng', bold: true, color: 'FF0000', highlight: 'yellow' }],
        isListItem: true,
      },
      {
        text: 'Thể hiện sự khan hiếm của nguồn lực',
        runs: [{ text: 'Thể hiện sự khan hiếm của nguồn lực' }],
        isListItem: true,
      },
      {
        text: 'Câu 9. Câu nào sau đây thuộc kinh tế học vi mô',
        runs: [{ text: 'Câu 9. Câu nào sau đây thuộc kinh tế học vi mô', bold: true }],
      },
    ];

    const questions = parseDocument(doc).map(validateQuestion);
    expect(questions.length).toBe(2);

    const q8 = questions[0];
    expect(q8.content).toContain('Đường giới hạn khả năng sản xuất là đường:');
    expect(q8.answers.length).toBe(4);
    expect(q8.answers[0].label).toBe('A');
    expect(q8.answers[0].content).toContain('Thể hiện các mức kết hợp tối đa');
    expect(q8.answers[1].label).toBe('B');
    expect(q8.answers[1].content).toContain('Phản ánh tập hợp các phương án');
    expect(q8.answers[2].label).toBe('C');
    expect(q8.answers[2].content).toBe('Tất cả các câu trên đều đúng');
    expect(q8.answers[3].label).toBe('D');
    expect(q8.answers[3].content).toBe('Thể hiện sự khan hiếm của nguồn lực');
    expect(q8.correctAnswer).toBe('C');
    expect(q8.isValid).toBe(true);
  });
});
