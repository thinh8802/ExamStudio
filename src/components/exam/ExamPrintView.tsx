// ============================================
// EXAM PRINT VIEW
// Clean printable layout with @media print CSS for browser & PDF printing
// ============================================
import React from 'react';
import type { Exam, Question } from '@/types';
import { ExamExportService, type ExportExamConfig, type ExamVariant } from '@/services/exam-export-service';
import { Button } from '@/components/ui';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import { MathRenderer } from '@/components/common/MathRenderer';

interface ExamPrintViewProps {
  exam: Exam;
  questions: Question[];
  config: ExportExamConfig;
  onBack: () => void;
}

export const ExamPrintView: React.FC<ExamPrintViewProps> = ({
  exam,
  questions,
  config,
  onBack,
}) => {
  const variants = React.useMemo(() => {
    return ExamExportService.generateVariants(exam, questions, config);
  }, [exam, questions, config]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    ExamExportService.exportToDocx(exam, questions, config);
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 p-4 md:p-8">
      {/* Top Toolbar (Hidden when printing) */}
      <div className="max-w-4xl mx-auto mb-6 p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-md flex items-center justify-between gap-4 print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] transition-all cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportWord}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition-all cursor-pointer"
          >
            <Download size={14} />
            <span>Tải Word (.doc)</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-bold px-5 py-2 rounded-xl bg-gradient-primary text-white shadow-md transition-all cursor-pointer"
          >
            <Printer size={15} />
            <span>In Đề / Lưu PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto space-y-12 print:space-y-0 print:m-0 print:p-0">
        {variants.map((variant, vIdx) => (
          <div
            key={variant.code}
            className="bg-white text-black p-8 md:p-12 rounded-2xl shadow-lg print:shadow-none print:p-0 print:rounded-none print:break-before-page"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* Header Table */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
              <div className="text-center w-5/12">
                <p className="font-bold text-xs uppercase">{config.schoolName || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO'}</p>
                <p className="font-bold text-sm underline">{config.subjectName || exam.name}</p>
              </div>
              <div className="text-center w-6/12">
                <p className="font-bold text-sm uppercase">{config.title || 'ĐỀ THI KHẢO SÁT CHẤT LƯỢNG'}</p>
                <p className="text-xs">Thời gian làm bài: <b>{config.timeLimit || 50} phút</b> <i>(không kể phát đề)</i></p>
                <div className="mt-2 inline-block border-2 border-black px-3 py-1 font-bold text-xs">
                  MÃ ĐỀ THI: {variant.code}
                </div>
              </div>
            </div>

            <p className="italic text-xs border-b border-black pb-2 mb-6">
              Họ, tên thí sinh: ................................................................... Số báo danh: ............................
            </p>

            {/* Questions List */}
            <div className="space-y-4">
              {variant.questions.map(q => (
                <div key={q.id} className="break-inside-avoid text-sm leading-relaxed">
                  <div className="font-bold">
                    Câu {q.index}: <MathRenderer text={q.content} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1.5 pl-4">
                    {q.answers.map(a => {
                      const isCorrect = a.isCorrect && config.includeAnswers;
                      return (
                        <div key={a.label} className={isCorrect ? 'font-bold underline text-emerald-700' : ''}>
                          <b>{a.label}.</b> <MathRenderer text={a.content} />
                        </div>
                      );
                    })}
                  </div>
                  {config.includeExplanations && q.explanation && (
                    <div className="mt-2 p-2 bg-gray-100 text-xs rounded border-l-2 border-gray-400">
                      <b>💡 Lời giải:</b> <MathRenderer text={q.explanation} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center font-bold text-sm my-8">
              ---------- HẾT ----------
            </div>

            {/* Answer Key Grid */}
            {config.includeAnswerKeyTable && (
              <div className="break-before-page pt-8">
                <h3 className="text-center font-bold text-base uppercase mb-4">
                  BẢNG ĐÁP ÁN MÃ ĐỀ {variant.code}
                </h3>
                <div className="grid grid-cols-5 gap-2 border border-black p-2 text-center text-xs">
                  {variant.answerKey.map(k => (
                    <div key={k.questionNumber} className="flex justify-between border border-gray-300 p-1">
                      <span className="font-bold">{k.questionNumber}</span>
                      <span className="font-bold text-red-600">{k.correctLabel}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
