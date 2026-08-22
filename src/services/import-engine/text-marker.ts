import type { DocxParagraph } from './types';

// Các pattern nhận diện câu hỏi phong phú
export const QUESTION_START_REGEX = /^(?:Câu|Bài|Question|Q)\s*0*(\d+)[\.\:\)\-\s]?|^0*(\d+)[\.\:\)\-\/](?=\s|$)/i;

// Nhận diện đáp án (A. / B. / C) / D: / (A) / [A] / *A. / [x] A. / ✓ A.)
export const ANSWER_START_REGEX = /^(?:[\*\•\-\+✓✔\[\]xX\(\)]\s*)?([A-H])[\.\)\:\-\]]\s*|^\(([A-H])\)\s*|^\[([A-H])\]\s*/i;

// Regex tìm tất cả các vị trí bắt đầu của đáp án trong cùng 1 dòng (cho inline multi-choice splitter)
export const INLINE_ANSWER_SPLIT_REGEX = /(?:^|\s{2,}|\t|\s+(?=[A-H][\.\)\:\-\]]|\([A-H]\)|\[[A-H]\]))(?:\*|\[[xX]\]|✓|✔)?\s*([A-H])[\.\)\:\-\]]\s*|(?:\s+|^)\(([A-H])\)\s*|(?:\s+|^)\[([A-H])\]\s*/g;

// Phân tích marker đáp án đúng từ text (e.g. "Đáp án đúng: A", "Key: A", "Đ/A: B", "Ans: C")
export function parseExplicitCorrectMarker(text: string): string | null {
  // Loại bỏ các emoji, ký tự thừa ở đầu
  const cleanText = text.replace(/^(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|\s|\👉|\>|\-|\*|\=)*/g, '').trim();
  
  // Dạng 1: Cùng 1 dòng (e.g. "Đáp án đúng: A", "Key: A", "Đ/A: A", "ĐA: A, B", "Ans: C")
  const inlineMatch = cleanText.match(/^(?:đáp\s*án(?:\s*đúng|\s*chính\s*xác)?|đáp\s*án|key|đ\/a|đa|ans|answer|correct(?:\s*answer)?)[\:\-\s\.\)]*([A-H](?:\s*[,+&/\s]\s*[A-H])*)/i);
  if (inlineMatch) {
    return inlineMatch[1].replace(/[\s,+&/]+/g, ',').toUpperCase();
  }
  
  return null;
}

// Kiểm tra dòng có phải là giải thích không
export function isExplanationMarker(text: string): boolean {
  const cleanText = text.replace(/^(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|\s|\👉|\>|\-|\*|\=)*/g, '').trim();
  return /^(?:lời\s*giải(?:\s*thích)?(?:\s*chi\s*tiết)?|giải\s*thích|explanation|hướng\s*dẫn(?:\s*giải)?|hdg?|hd|solution)/i.test(cleanText);
}

// Kiểm tra tiêu đề của Bảng / Khối đáp án ở cuối đề thi
export function isAnswerKeyHeader(text: string): boolean {
  const clean = text.toLowerCase().trim();
  return /^(?:bảng\s*đáp\s*án|phiếu\s*đáp\s*án|đáp\s*án\s*(?:tham\s*khảo|chi\s*tiết|đề\s*thi)?|answer\s*key|key\s*đáp\s*án)/i.test(clean);
}

// Trích xuất bản đồ đáp án từ Bảng Đáp Án cuối file (Map: Câu số -> Đáp án, vd: { "1": "A", "2": "B", ... })
export function parseAnswerKeyGrid(text: string): Record<string, string> {
  const keyMap: Record<string, string> = {};
  
  // Dạng 1: "1.A  2.B  3.C  4.D" hoặc "1-A  2-B" hoặc "1:A  2:B" hoặc "1A  2B  3C"
  const itemRegex = /(?:câu\s*)?0*(\d+)[\.\:\-\s\/]*([A-H])/gi;
  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    const qNum = String(parseInt(match[1], 10));
    const ans = match[2].toUpperCase();
    if (!keyMap[qNum]) {
      keyMap[qNum] = ans;
    }
  }
  
  return keyMap;
}

// Tách các lựa chọn đáp án nằm trên cùng 1 dòng văn bản (Inline Multi-Choice Separator)
export function splitInlineAnswerParagraph(text: string): { label: string; content: string }[] {
  // Tìm tất cả các nhãn A., B., C., D. trên dòng
  const matches: { index: number; label: string; fullMatch: string }[] = [];
  const regex = /(?:^|\s{2,}|\t|\s+(?=[A-H][\.\)\:\-\]]|\([A-H]\)|\[[A-H]\]))(?:\*|\[[xX]\]|✓|✔)?\s*(?:([A-H])[\.\)\:\-\]]|\(([A-H])\)|\b([A-H])\.)\s*/g;
  
  let m;
  while ((m = regex.exec(text)) !== null) {
    const label = (m[1] || m[2] || m[3] || '').toUpperCase();
    if (!label) continue;

    // Kiểm tra xem vị trí này có nằm bên trong một cặp ngoặc đơn (...) chưa đóng không
    // Ví dụ: "... (hoặc phong tỏa tài sản của bà D)" -> D) ở đây là đóng ngoặc của cụm "(hoặc...", không phải đáp án D
    const textBefore = text.slice(0, m.index);
    const openParensCount = (textBefore.match(/\(/g) || []).length;
    const closeParensCount = (textBefore.match(/\)/g) || []).length;
    const isInsideUnclosedParen = openParensCount > closeParensCount;

    // Nếu là dạng D) mà nằm trong ngoặc đơn chưa đóng, bỏ qua vì đây là từ trong câu
    const isExplicitParenLabel = m[0].trim().startsWith('(') || m[0].trim().startsWith('[');
    if (isInsideUnclosedParen && !isExplicitParenLabel) {
      continue;
    }

    matches.push({ index: m.index, label, fullMatch: m[0] });
  }

  // Nếu tìm thấy từ 2 lựa chọn trở lên trên cùng 1 dòng
  if (matches.length >= 2) {
    const results: { label: string; content: string }[] = [];
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const next = matches[i + 1];
      const startContentIndex = current.index + current.fullMatch.length;
      const endContentIndex = next ? next.index : text.length;
      const content = text.slice(startContentIndex, endContentIndex).trim();

      // Nếu có bất kỳ lựa chọn nào bị rỗng hoặc chỉ là dấu ngoặc thừa, toàn bộ dòng không phải là inline valid
      if (!content || content === ')' || content === ']' || content === '.') {
        return [];
      }

      results.push({ label: current.label, content });
    }
    return results;
  }

  return [];
}

// Normalize array of paragraphs into clean text
export function mergeParagraphsToText(paragraphs: DocxParagraph[]): string {
  return paragraphs.map(p => p.text).join('\n').trim();
}

