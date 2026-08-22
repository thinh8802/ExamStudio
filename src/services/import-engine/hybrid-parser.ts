import type { DocxParagraph, QuestionBlock, ParsedQuestion, ParsedAnswer } from './types';
import {
  QUESTION_START_REGEX,
  ANSWER_START_REGEX,
  parseExplicitCorrectMarker,
  isExplanationMarker,
  mergeParagraphsToText,
  splitInlineAnswerParagraph,
  isAnswerKeyHeader,
  parseAnswerKeyGrid,
} from './text-marker';

// Helper: Kiểm tra tỷ lệ format của đáp án
function getFormattingScore(paragraphs: DocxParagraph[]): { isBold: boolean; isUnderline: boolean; isHighlight: boolean; isColored: boolean; score: number } {
  let totalChars = 0;
  let boldChars = 0;
  let underlineChars = 0;
  let highlightChars = 0;
  let colorChars = 0;

  for (const p of paragraphs) {
    for (const run of p.runs) {
      const len = run.text.trim().length;
      if (len === 0) continue;
      
      totalChars += len;
      if (run.bold) boldChars += len;
      if (run.underline) underlineChars += len;
      if (run.highlight) highlightChars += len;
      if (run.color && run.color !== '000000' && run.color !== 'auto') colorChars += len;
    }
  }

  if (totalChars === 0) return { isBold: false, isUnderline: false, isHighlight: false, isColored: false, score: 0 };

  const isBold = boldChars > 0;
  const isUnderline = underlineChars > 0;
  const isHighlight = highlightChars > 0;
  const isColored = colorChars > 0;

  // Weighted score: Colors and highlights are very strong indicators (weight 3)
  // Bold and underline are weaker indicators (weight 1)
  const score = (isBold ? 1 : 0) + (isUnderline ? 1 : 0) + (isHighlight ? 3 : 0) + (isColored ? 3 : 0);

  return { isBold, isUnderline, isHighlight, isColored, score };
}

function isImplicitExplanation(p: DocxParagraph): boolean {
  const text = p.text.trim();
  if (!text) return false;
  if (text.startsWith('(') && text.endsWith(')') && text.length > 8) return true;
  if (/^[\(\[\*]?\s*(?:lời\s*giải|giải\s*thích|hướng\s*dẫn|ghi\s*chú|note|hdg?|solution|explanation)[\:\-\s]/i.test(text)) return true;
  
  const textRuns = p.runs.filter(r => r.text.trim().length > 0);
  if (textRuns.length === 0) return false;
  
  let italicChars = 0;
  let totalChars = 0;
  
  for (const r of textRuns) {
    totalChars += r.text.length;
    if (r.italic) italicChars += r.text.length;
  }
  
  // Chỉ coi là giải thích ngầm nếu chữ nghiêng chiếm đa số và có định dạng/từ khóa giải thích
  if (totalChars > 30 && italicChars / totalChars >= 0.8 && (text.startsWith('(') || text.startsWith('*') || text.startsWith('=>'))) {
    return true;
  }
  
  return false;
}

export function parseDocument(paragraphs: DocxParagraph[]): ParsedQuestion[] {
  const blocks: QuestionBlock[] = [];
  let currentBlock: QuestionBlock | null = null;
  let currentSection: 'content' | 'answer' | 'explanation' | 'marker' = 'content';
  let currentAnswerLabel: string | null = null;

  let sourceIndex = 1;
  let documentUsesExplicitPrefix = false;
  let globalAnswerKeyMap: Record<string, string> = {};
  let inAnswerKeySection = false;
  let answerKeyText = '';

  // Bước 1: Cô lập các khối câu hỏi (Isolate Question Blocks)
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = p.text.trim();
    if (!text) continue;

    // Kiểm tra xem có bắt đầu phần BẢNG ĐÁP ÁN ở cuối file không
    if (isAnswerKeyHeader(text)) {
      inAnswerKeySection = true;
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      answerKeyText += '\n' + text;
      continue;
    }

    if (inAnswerKeySection) {
      answerKeyText += '\n' + text;
      continue;
    }

    // Detect new question
    let isQuestionStart = QUESTION_START_REGEX.test(text);
    const hasExplicitPrefix = /^(?:Câu|Bài|Question|Q)/i.test(text);
    
    if (isQuestionStart && hasExplicitPrefix) {
      documentUsesExplicitPrefix = true;
    }

    // Ignore auto-numbered list items that look like questions (e.g. "30. 816") unless they actually start with "Câu"/"Question"
    if (isQuestionStart && p.isListItem && !hasExplicitPrefix) {
      isQuestionStart = false;
    }

    // Protect explanation blocks and implicit numbers inside explicitly numbered documents
    if (isQuestionStart && !hasExplicitPrefix && currentBlock) {
      if (documentUsesExplicitPrefix) {
        // The document uses "Câu X", so any "2. " is just a numbered list item, NOT a new question
        isQuestionStart = false;
      }
    }

    if (isQuestionStart) {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        sourceIndex: sourceIndex++,
        contentParagraphs: [p],
        answerParagraphs: [],
        explanationParagraphs: [],
      };
      currentSection = 'content';
      continue;
    }

    if (!currentBlock) continue; // Skip text outside any question

    // Kiểm tra xem dòng này có chứa NHIỀU ĐÁP ÁN CÙNG 1 DÒNG không (Inline multi-choice)
    const inlineChoices = splitInlineAnswerParagraph(text);
    if (inlineChoices.length >= 2) {
      currentSection = 'answer';
      for (const choice of inlineChoices) {
        const choiceLabel = choice.label.toUpperCase();
        currentAnswerLabel = choiceLabel;
        
        // Tạo đoạn paragraph đại diện cho choice
        const choiceParagraph: DocxParagraph = {
          text: `${choice.label}. ${choice.content}`,
          runs: [{ text: `${choice.label}. ${choice.content}` }],
        };

        currentBlock.answerParagraphs.push({
          label: choiceLabel,
          paragraphs: [choiceParagraph],
        });
      }
      continue;
    }

    // Detect Single Answer Start (A. / B. / C. / D. / *A. / [x] A.)
    const answerMatch = text.match(ANSWER_START_REGEX);
    if (answerMatch) {
      currentSection = 'answer';
      const rawMatch = answerMatch[0].trim();
      currentAnswerLabel = (answerMatch[1] || answerMatch[2] || answerMatch[3] || '').toUpperCase();
      
      if (rawMatch.startsWith('*') || rawMatch.startsWith('[x]') || rawMatch.startsWith('✓') || rawMatch.startsWith('✔')) {
        if (!currentBlock.explicitCorrectMarker) {
          currentBlock.explicitCorrectMarker = currentAnswerLabel;
        } else if (!currentBlock.explicitCorrectMarker.includes(currentAnswerLabel)) {
          currentBlock.explicitCorrectMarker += ',' + currentAnswerLabel;
        }
      }

      currentBlock.answerParagraphs.push({
        label: currentAnswerLabel,
        paragraphs: [p],
      });
      continue;
    }

    // Detect Explanation
    if (!text.match(ANSWER_START_REGEX) && (isExplanationMarker(text) || (currentSection === 'answer' && isImplicitExplanation(p)))) {
      currentSection = 'explanation';
      currentBlock.explanationParagraphs.push(p);
      continue;
    }

    // Detect Explicit Marker
    const explicitMatch = parseExplicitCorrectMarker(text);
    if (explicitMatch) {
      currentBlock.explicitCorrectMarker = explicitMatch;
      currentSection = 'marker';
      
      // Marker could be spread to next line
      if (i + 1 < paragraphs.length) {
         const nextText = paragraphs[i+1].text.trim();
         if (/^[A-H](?:\s*[,+&/\s]\s*[A-H])*$/.test(nextText)) {
            currentBlock.explicitCorrectMarker = nextText.replace(/[\s,+&/]+/g, ',').toUpperCase();
            i++; // skip next
         }
      }
      continue;
    }

    // Handle marker when only the label "Đáp án đúng:" is on the line
    const cleanText = text.replace(/^(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|\s|\👉|\>|\-|\*|\=)*/g, '').trim();
    if (/^(?:đáp\s*án(?:\s*đúng|\s*chính\s*xác)?|đáp\s*án|key|đ\/a|đa|ans|answer|correct(?:\s*answer)?)[\:\-\s\.\)]*$/i.test(cleanText)) {
      currentSection = 'marker';
      if (i + 1 < paragraphs.length) {
         const nextText = paragraphs[i+1].text.trim();
         if (/^[A-H](?:\s*[,+&/\s]\s*[A-H])*$/.test(nextText)) {
            currentBlock.explicitCorrectMarker = nextText.replace(/[\s,+&/]+/g, ',').toUpperCase();
            i++;
         }
      }
      continue;
    }

    // Nhận diện đáp án tiếp theo dạng Word Auto-Numbering (hoặc các dòng đáp án liên tiếp B, C, D không có chữ cái đầu)
    if (currentSection === 'answer' && currentBlock.answerParagraphs.length >= 1 && currentBlock.answerParagraphs.length < 8) {
      const isExplanation = isExplanationMarker(text) || isImplicitExplanation(p);
      const isMarker = parseExplicitCorrectMarker(text) !== null;

      if (!isExplanation && !isMarker) {
        const isLikelyNextChoice = p.isListItem || currentBlock.answerParagraphs.length < 4 || /^[A-Z0-9\u00C0-\u1EF9]/.test(text);
        if (isLikelyNextChoice) {
          const nextLabel = String.fromCharCode(65 + currentBlock.answerParagraphs.length);
          currentAnswerLabel = nextLabel;
          currentBlock.answerParagraphs.push({
            label: nextLabel,
            paragraphs: [p],
          });
          continue;
        }
      }
    }

    // Append to current section
    if (currentSection === 'content') {
      currentBlock.contentParagraphs.push(p);
    } else if (currentSection === 'answer' && currentAnswerLabel) {
      const lastAnswer = currentBlock.answerParagraphs[currentBlock.answerParagraphs.length - 1];
      lastAnswer.paragraphs.push(p);
    } else if (currentSection === 'explanation') {
      currentBlock.explanationParagraphs.push(p);
    }
  }
  if (currentBlock) blocks.push(currentBlock);

  // Bước 2: Phân tích Formatting và Resolving
  const parsedQuestions: ParsedQuestion[] = blocks.map(block => {
    // Phân tích content
    const rawContent = mergeParagraphsToText(block.contentParagraphs);
    const questionNumberMatch = rawContent.match(QUESTION_START_REGEX);
    let questionNumber = questionNumberMatch ? questionNumberMatch[0].trim() : undefined;
    let isExplicitlyNumbered = false;
    
    if (questionNumber) {
      isExplicitlyNumbered = /^(?:Câu|Question)\s*/i.test(questionNumber);
      questionNumber = questionNumber.replace(/^(?:Câu|Question)\s*/i, '').replace(/[\.\:\)]+$/, '');
    }
    // Fallback: If no answers were detected (or only 1), maybe they were auto-numbered list items left in contentParagraphs!
    if (block.answerParagraphs.length < 2) {
      let foundListItems = false;
      let listEndIndex = -1;
      let listStartIndex = -1;

      for (let i = block.contentParagraphs.length - 1; i >= 0; i--) {
        // KHÔNG BAO GIỜ lấy đoạn văn đầu tiên của block (vì đó chắc chắn là nội dung câu hỏi)
        if (i === 0) {
          break;
        }

        if (block.contentParagraphs[i].isListItem) {
          if (!foundListItems) {
            foundListItems = true;
            listEndIndex = i;
          }
          listStartIndex = i;
        } else {
          if (foundListItems) break;
        }
      }

      if (foundListItems && (listEndIndex - listStartIndex + 1) >= 2) {
        const listItems = block.contentParagraphs.slice(listStartIndex, listEndIndex + 1);
        const extraExplanations = listEndIndex < block.contentParagraphs.length - 1 
          ? block.contentParagraphs.slice(listEndIndex + 1) 
          : [];

        // Xóa phần answers và phần giải thích thừa khỏi content
        block.contentParagraphs.splice(listStartIndex, block.contentParagraphs.length - listStartIndex);

        const newAnswers = listItems.map((li, idx) => ({
          label: String.fromCharCode(65 + idx),
          paragraphs: [li]
        }));
        
        // Prepend because these were found in contentParagraphs (before any manual answers)
        block.answerParagraphs.unshift(...newAnswers);
        
        // Re-label all answers sequentially A, B, C, D...
        block.answerParagraphs.forEach((ans, idx) => {
          ans.label = String.fromCharCode(65 + idx);
        });

        if (extraExplanations.length > 0) {
          block.explanationParagraphs.unshift(...extraExplanations);
        }
      } else if (!foundListItems && block.contentParagraphs.length >= 5) {
        // Heuristic: If no list items, but the last 4 paragraphs (ignoring a possible explanation paragraph) are short
        // This handles cases where user typed plain text "10 triệu", "20 triệu" without A, B, C, D and without Auto-Numbering.
        let endIdx = block.contentParagraphs.length - 1;
        let extraExplanations: DocxParagraph[] = [];
        
        // Check if the very last paragraph looks like an explanation (long text or starts with parentheses)
        const lastP = block.contentParagraphs[endIdx];
        if (lastP.text.length > 80 || isImplicitExplanation(lastP)) {
          extraExplanations.push(lastP);
          endIdx--;
        }

        if (endIdx >= 4) {
          const possibleAnswers = block.contentParagraphs.slice(endIdx - 3, endIdx + 1);
          // Check if they are all relatively short (options are usually short)
          const allShort = possibleAnswers.every(p => p.text.length < 150);
          
          if (allShort) {
            const listItems = possibleAnswers;
            block.contentParagraphs.splice(endIdx - 3, block.contentParagraphs.length - (endIdx - 3));
            
            const newAnswers = listItems.map((li, idx) => ({
              label: String.fromCharCode(65 + idx),
              paragraphs: [li]
            }));
            
            block.answerParagraphs.unshift(...newAnswers);
            block.answerParagraphs.forEach((ans, idx) => {
              ans.label = String.fromCharCode(65 + idx);
            });

            if (extraExplanations.length > 0) {
              block.explanationParagraphs.unshift(...extraExplanations);
            }
          }
        }
      }
    }
    const content = mergeParagraphsToText(block.contentParagraphs).replace(QUESTION_START_REGEX, '').trim();

    // Phân tích answers & formatting
    let maxScore = 0;
    const formattedCorrectLabels: string[] = [];

    const rawAnswers: ParsedAnswer[] = block.answerParagraphs.map((ans, idx, arr) => {
      let answerParagraphs = ans.paragraphs;
      let extraExplanationParagraphs: DocxParagraph[] = [];

      // Theo yêu cầu: Dòng bất kỳ nằm dưới đáp án cuối cùng (D) sẽ được coi là giải thích
      const isLastAnswer = idx === arr.length - 1;
      if (isLastAnswer && ans.paragraphs.length > 1) {
        answerParagraphs = [ans.paragraphs[0]];
        extraExplanationParagraphs = ans.paragraphs.slice(1);
      }

      const format = getFormattingScore(answerParagraphs);
      // Remove A., B. from content
      let ansContent = mergeParagraphsToText(answerParagraphs);
      ansContent = ansContent.replace(ANSWER_START_REGEX, '').trim();
      
      if (format.isBold || format.isUnderline || format.isHighlight || format.isColored) {
        if (format.score > maxScore) {
          maxScore = format.score;
          formattedCorrectLabels.length = 0; // Clear previous labels with lower scores
          formattedCorrectLabels.push(ans.label);
        } else if (format.score === maxScore) {
          formattedCorrectLabels.push(ans.label);
        }
      }
      
      if (extraExplanationParagraphs.length > 0) {
        block.explanationParagraphs.unshift(...extraExplanationParagraphs);
      }
      
      return { label: ans.label, content: ansContent };
    });

    // Deduplicate extra duplicate answers (ví dụ: option thứ 5 (E) trùng nội dung với option (B) trước đó)
    const answers: ParsedAnswer[] = [];
    const seenContents = new Map<string, string>(); // normalizedContent -> originalLabel
    const seenLabels = new Set<string>();

    for (let idx = 0; idx < rawAnswers.length; idx++) {
      const ans = rawAnswers[idx];
      const norm = ans.content.trim().toLowerCase().replace(/[\s\.\,\;\:\-]+/g, ' ');
      
      // Nếu có > 4 đáp án và đáp án sau lặp lại nội dung đáp án trước, hoặc trùng cả nhãn và nội dung
      const isDuplicateExtra = (rawAnswers.length > 4 && idx >= 4 && seenContents.has(norm)) || (seenLabels.has(ans.label) && seenContents.has(norm));
      
      if (isDuplicateExtra) {
        const originalLabel = seenContents.get(norm)!;
        if (formattedCorrectLabels.includes(ans.label) && !formattedCorrectLabels.includes(originalLabel)) {
          formattedCorrectLabels.push(originalLabel);
        }
        const dupIdx = formattedCorrectLabels.indexOf(ans.label);
        if (dupIdx !== -1) formattedCorrectLabels.splice(dupIdx, 1);
        continue;
      }
      
      seenLabels.add(ans.label);
      if (norm) seenContents.set(norm, ans.label);
      answers.push(ans);
    }

    // Conflict Resolution
    let finalCorrectAnswer: string | null = null;
    let confidence: ParsedQuestion['confidence'] = 'unresolved';
    let source: ParsedQuestion['answerDetectionSource'] = 'unresolved';
    const warnings: string[] = [];

    const explicitMarker = block.explicitCorrectMarker;
    let formattedMarker = maxScore > 0 && formattedCorrectLabels.length > 0 ? formattedCorrectLabels.join(',') : null;

    // Nếu TẤT CẢ các đáp án đều có cùng điểm format (ví dụ: tất cả đều in đậm), thì format này vô giá trị để phân biệt!
    if (formattedMarker && formattedCorrectLabels.length === answers.length && answers.length > 1) {
      formattedMarker = null;
    }

    if (explicitMarker && formattedMarker) {
      // Có cả 2
      const explicitSorted = explicitMarker.split(',').sort().join(',');
      const formattedSorted = formattedMarker.split(',').sort().join(',');
      
      if (explicitSorted === formattedSorted) {
        finalCorrectAnswer = explicitMarker;
        source = 'combined';
        confidence = 'very_high';
      } else {
        // Conflict
        source = 'conflict';
        confidence = 'conflict';
        warnings.push(`Xung đột: Text Marker (${explicitMarker}) vs Formatting (${formattedMarker})`);
      }
    } else if (explicitMarker) {
      finalCorrectAnswer = explicitMarker;
      source = 'text-marker';
      confidence = 'high';
    } else if (formattedMarker) {
      finalCorrectAnswer = formattedMarker;
      source = 'formatting';
      confidence = maxScore > 1 ? 'very_high' : 'high';
    } else {
      warnings.push('Không xác định được đáp án đúng');
    }

    // Explanation
    let explanation = mergeParagraphsToText(block.explanationParagraphs);
    explanation = explanation.replace(/^(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\s|\👉)*(?:lời\s*giải\s*thích(?:\s*chi\s*tiết)?|giải\s*thích|explanation|hướng\s*dẫn(?:\s*giải)?|hdg?)[\:\s]*/i, '').trim();

    return {
      sourceIndex: block.sourceIndex,
      questionNumber,
      isExplicitlyNumbered,
      content,
      answers,
      correctAnswer: finalCorrectAnswer,
      explanation,
      answerDetectionSource: source,
      confidence,
      warnings,
      isValid: false, // will be validated next
    };
  });

  // Bước 3: Hậu xử lý (Post-processing) - Ghép phần "Đáp án / Giải thích" ở cuối file vào các câu hỏi ở trên
  if (answerKeyText.trim()) {
    globalAnswerKeyMap = parseAnswerKeyGrid(answerKeyText);
  }

  const finalQuestions: ParsedQuestion[] = [];
  const questionMap = new Map<string, ParsedQuestion>();

  for (const q of parsedQuestions) {
    // Nếu chưa có đáp án nhưng tìm thấy trong Bảng Đáp Án Cuối Tài Liệu (Answer Key Matrix)
    if (!q.correctAnswer && q.questionNumber && globalAnswerKeyMap[q.questionNumber]) {
      q.correctAnswer = globalAnswerKeyMap[q.questionNumber];
      q.answerDetectionSource = 'answer-key-table';
      q.confidence = 'very_high';
      q.warnings = q.warnings.filter(w => !w.toLowerCase().includes('không xác định được đáp án đúng'));
    }

    if (q.questionNumber && questionMap.has(q.questionNumber)) {
      const original = questionMap.get(q.questionNumber)!;
      
      // Nếu block này không có đáp án nào (khả năng cao là Answer Key hoặc Giải thích chi tiết)
      if (q.answers.length === 0) {
        const cleanContent = q.content.replace(/[\.\:\)]/g, '').trim().toUpperCase();
        
        // Nếu nội dung chỉ là 1 chữ A, B, C, D (Đáp án)
        if (/^[A-H]$/.test(cleanContent)) {
          // Nếu câu hỏi gốc chưa xác định được đáp án, hoặc mình ghi đè luôn
          original.correctAnswer = cleanContent;
          original.answerDetectionSource = 'text-marker';
          
          // Xóa cảnh báo thiếu đáp án
          original.warnings = original.warnings.filter(w => !w.toLowerCase().includes('không xác định được đáp án đúng'));
          original.isValid = original.warnings.length === 0 && original.answers.length >= 2;
        } else {
          // Nếu nội dung dài, thì đây là lời giải thích!
          original.explanation = original.explanation 
            ? original.explanation + '\n\n' + q.content 
            : q.content;
        }
        
        // Bỏ qua không add block lỗi này vào list hiển thị
        continue;
      }
    }

    finalQuestions.push(q);
    if (q.questionNumber && q.answers.length > 0) {
      questionMap.set(q.questionNumber, q);
    }
  }

  // Bước 4: Sequential Renumbering & Garbage Collection
  // Đánh số lại toàn bộ các câu hỏi từ 1 đến N theo thứ tự xuất hiện.
  // Đồng thời, nếu có khối rác (không đủ 2 đáp án, ví dụ: giải thích dính chữ "Câu"),
  // tự động gộp nội dung của nó vào ô Giải thích của câu hỏi hợp lệ ngay trước đó.
  const renumberedQuestions: ParsedQuestion[] = [];
  let currentValidQuestion: ParsedQuestion | null = null;
  let counter = 1;

  for (const q of finalQuestions) {
    // Khối hợp lệ nếu: có >= 2 đáp án HOẶC được đánh số rõ ràng bằng chữ "Câu/Question" trong file gốc 
    // (nhằm bỏ qua các khối rác vô tình sinh ra do đánh số thứ tự như "1.", "2." trong lời giải)
    if (q.answers.length >= 2 || q.isExplicitlyNumbered) {
      // Câu hỏi hợp lệ cơ bản
      q.questionNumber = counter.toString();
      counter++;
      renumberedQuestions.push(q);
      currentValidQuestion = q;
    } else {
      // Khối rác (không phải câu trắc nghiệm)
      if (currentValidQuestion) {
        const extraTextParts = [q.content];
        q.answers.forEach(a => extraTextParts.push(a.label + '. ' + a.content));
        if (q.explanation) extraTextParts.push(q.explanation);
        
        const extraText = extraTextParts.filter(Boolean).join('\n').trim();
        if (extraText) {
          currentValidQuestion.explanation = currentValidQuestion.explanation 
            ? currentValidQuestion.explanation + '\n\n' + extraText
            : extraText;
        }
      }
      // Khối rác bị loại bỏ khỏi danh sách hiển thị
    }
  }

  // Cập nhật lại trạng thái hợp lệ
  for (const q of renumberedQuestions) {
    q.isValid = q.warnings.length === 0;
  }

  return renumberedQuestions;
}
