// ============================================
// EXAM EXPORT SERVICE
// Generates printable Word (.docx), PDF printable layouts, and multi-code test variants
// ============================================
import type { Exam, Question, Answer } from '@/types';

export interface ExportExamConfig {
  title: string; // e.g. "ĐỀ THI KHẢO SÁT CHẤT LƯỢNG NĂM HỌC 2025 - 2026"
  schoolName: string; // e.g. "TRƯỜNG THPT CHUYÊN..."
  subjectName: string; // e.g. "MÔN: TOÁN HỌC"
  timeLimit: number; // minutes, e.g. 50
  codeCount: number; // 1, 2, 4, 8 variants
  baseCode: number; // starting code number, e.g. 101
  includeAnswers: boolean; // whether to highlight answer directly in question
  includeAnswerKeyTable: boolean; // whether to append Answer Grid table at the end
  includeExplanations: boolean; // whether to append detailed solution notes
}

export interface ExamVariant {
  code: string; // e.g. "101"
  questions: {
    index: number;
    id: string;
    content: string;
    answers: { label: string; content: string; isCorrect: boolean }[];
    correctLabel: string;
    explanation: string;
  }[];
  answerKey: { questionNumber: number; correctLabel: string }[];
}

export class ExamExportService {
  /**
   * Generates N shuffled variants of an exam with corresponding answer keys
   */
  public static generateVariants(
    exam: Exam,
    questions: Question[],
    config: ExportExamConfig
  ): ExamVariant[] {
    const variants: ExamVariant[] = [];
    const count = Math.max(1, config.codeCount || 1);

    for (let v = 0; v < count; v++) {
      const code = String((config.baseCode || 101) + v);

      // Create a copy of questions
      let variantQuestions = [...questions];

      // Shuffle question order if multiple codes or if requested
      if (count > 1 || exam.shuffleQuestions) {
        // Deterministic pseudo-random shuffle per variant
        variantQuestions = this.shuffleArray(variantQuestions, v * 7919 + 13);
      }

      const formattedQuestions = variantQuestions.map((q, idx) => {
        let answers = [...q.answers];
        if (count > 1 || exam.shuffleAnswers) {
          answers = this.shuffleArray(answers, v * 6271 + idx * 31);
        }

        // Relabel answers as A, B, C, D...
        const relabeled = answers.map((ans, aIdx) => ({
          label: String.fromCharCode(65 + aIdx),
          content: ans.content,
          isCorrect: ans.isCorrect || q.correctAnswer === ans.label,
        }));

        const correctAns = relabeled.find(a => a.isCorrect);
        const correctLabel = correctAns ? correctAns.label : 'A';

        return {
          index: idx + 1,
          id: q.id,
          content: q.content,
          answers: relabeled,
          correctLabel,
          explanation: q.explanation || '',
        };
      });

      const answerKey = formattedQuestions.map(q => ({
        questionNumber: q.index,
        correctLabel: q.correctLabel,
      }));

      variants.push({
        code,
        questions: formattedQuestions,
        answerKey,
      });
    }

    return variants;
  }

  private static shuffleArray<T>(array: T[], seed: number): T[] {
    const arr = [...array];
    let s = seed;
    for (let i = arr.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Generates a standard Word document (.doc / .docx compatible HTML package)
   */
  public static exportToDocx(
    exam: Exam,
    questions: Question[],
    config: ExportExamConfig
  ): void {
    const variants = this.generateVariants(exam, questions, config);

    let docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${config.title || exam.name}</title>
        <style>
          @page {
            size: A4;
            margin: 2cm 2cm 2cm 2cm;
            mso-header-margin: 36.0pt;
            mso-footer-margin: 36.0pt;
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 13pt;
            line-height: 1.4;
            color: #000;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .header-table td {
            vertical-align: top;
            padding: 2px 5px;
          }
          .title-bold {
            font-weight: bold;
            text-align: center;
          }
          .exam-code-box {
            border: 1.5pt solid #000;
            padding: 4px 8px;
            display: inline-block;
            font-weight: bold;
          }
          .question-item {
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          .question-stem {
            font-weight: bold;
            margin-bottom: 6px;
          }
          .answers-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
          }
          .answers-grid td {
            padding: 3px 6px;
            vertical-align: top;
          }
          .correct-ans {
            text-decoration: underline;
            font-weight: bold;
          }
          .page-break {
            page-break-before: always;
          }
          .answer-key-table {
            width: 100%;
            border-collapse: collapse;
            text-align: center;
            margin-top: 15px;
          }
          .answer-key-table th, .answer-key-table td {
            border: 1pt solid #000;
            padding: 5px;
            font-size: 11pt;
          }
          .answer-key-table th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .explanation-box {
            background-color: #f9f9f9;
            border-left: 3pt solid #333;
            padding: 6px 12px;
            margin-top: 4px;
            font-size: 11pt;
            color: #444;
          }
        </style>
      </head>
      <body>
    `;

    variants.forEach((variant, vIdx) => {
      if (vIdx > 0) {
        docContent += `<div class='page-break'></div>`;
      }

      // Header Box
      docContent += `
        <table class='header-table'>
          <tr>
            <td style='width: 45%; text-align: center;'>
              <div style='text-transform: uppercase; font-weight: bold;'>${config.schoolName || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO'}</div>
              <div style='font-weight: bold; text-decoration: underline;'>${config.subjectName || exam.name}</div>
            </td>
            <td style='width: 55%; text-align: center;'>
              <div class='title-bold' style='text-transform: uppercase;'>${config.title || 'KỲ THI KHẢO SÁT CHẤT LƯỢNG'}</div>
              <div>Thời gian làm bài: <b>${config.timeLimit || exam.timeLimit || 50} phút</b> <i>(không kể phát đề)</i></div>
              <div style='margin-top: 5px;'>
                <span class='exam-code-box'>MÃ ĐỀ THI: ${variant.code}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan='2' style='padding-top: 15px; border-bottom: 1pt solid #000; padding-bottom: 6px;'>
              <i>Họ, tên thí sinh: ................................................................... Số báo danh: ............................</i>
            </td>
          </tr>
        </table>
      `;

      // Questions List
      variant.questions.forEach(q => {
        docContent += `
          <div class='question-item'>
            <div class='question-stem'>
              <b>Câu ${q.index}:</b> ${q.content}
            </div>
            <table class='answers-grid'>
              <tr>
        `;

        // 2x2 or 4x1 answers
        q.answers.forEach((a, aIdx) => {
          const isCorrect = a.isCorrect && config.includeAnswers;
          const styleClass = isCorrect ? 'correct-ans' : '';

          if (aIdx > 0 && aIdx % 2 === 0) {
            docContent += `</tr><tr>`;
          }

          docContent += `
            <td style='width: 50%;'>
              <span class='${styleClass}'><b>${a.label}.</b> ${a.content}</span>
            </td>
          `;
        });

        docContent += `
              </tr>
            </table>
        `;

        if (config.includeExplanations && q.explanation) {
          docContent += `
            <div class='explanation-box'>
              <b>💡 Lời giải:</b> ${q.explanation}
            </div>
          `;
        }

        docContent += `</div>`;
      });

      docContent += `
        <div style='text-align: center; margin: 25px 0; font-weight: bold;'>
          ---------- HẾT ----------
        </div>
      `;

      // Answer Key Table (if selected)
      if (config.includeAnswerKeyTable) {
        docContent += `
          <div class='page-break'></div>
          <div style='text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 15px; text-transform: uppercase;'>
            BẢNG ĐÁP ÁN MÃ ĐỀ ${variant.code}
          </div>
          <table class='answer-key-table'>
            <tr>
              <th>Câu</th>
              <th>Đáp án</th>
              <th>Câu</th>
              <th>Đáp án</th>
              <th>Câu</th>
              <th>Đáp án</th>
              <th>Câu</th>
              <th>Đáp án</th>
              <th>Câu</th>
              <th>Đáp án</th>
            </tr>
        `;

        const total = variant.answerKey.length;
        const rows = Math.ceil(total / 5);

        for (let r = 0; r < rows; r++) {
          docContent += `<tr>`;
          for (let c = 0; c < 5; c++) {
            const itemIdx = r + c * rows;
            if (itemIdx < total) {
              const item = variant.answerKey[itemIdx];
              docContent += `
                <td style='font-weight: bold; background-color: #f9f9f9;'>${item.questionNumber}</td>
                <td style='font-weight: bold; color: #b91c1c;'>${item.correctLabel}</td>
              `;
            } else {
              docContent += `<td></td><td></td>`;
            }
          }
          docContent += `</tr>`;
        }

        docContent += `</table>`;
      }
    });

    docContent += `</body></html>`;

    // Download blob as .doc/.docx
    const blob = new Blob(['\ufeff' + docContent], {
      type: 'application/msword;charset=utf-8',
    });

    const fileName = `${this.sanitizeFilename(config.title || exam.name)}-MaDe-${variants.map(v => v.code).join('_')}.doc`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private static sanitizeFilename(name: string): string {
    return (name || 'De-Thi')
      .replace(/[\/\\:*?"<>|]/g, '_')
      .replace(/\s+/g, '-');
  }
}
