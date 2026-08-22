// ============================================
// EXAM EXPORT MODAL
// Configuration modal for exporting exams to Word and PDF
// ============================================
import React, { useState, useEffect } from 'react';
import type { Exam, Question } from '@/types';
import { db } from '@/services/database';
import { ExamExportService, type ExportExamConfig } from '@/services/exam-export-service';
import { X, FileText, Printer, Download, Sparkles, CheckSquare, Layers } from 'lucide-react';
import toast from 'react-hot-toast';

interface ExamExportModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  onPrintPreview: (config: ExportExamConfig, questions: Question[]) => void;
}

export const ExamExportModal: React.FC<ExamExportModalProps> = ({
  exam,
  isOpen,
  onClose,
  onPrintPreview,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [schoolName, setSchoolName] = useState('SỞ GIÁO DỤC VÀ ĐÀO TẠO');
  const [subjectName, setSubjectName] = useState('');
  const [timeLimit, setTimeLimit] = useState(50);
  const [codeCount, setCodeCount] = useState(1);
  const [baseCode, setBaseCode] = useState(101);
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [includeAnswerKeyTable, setIncludeAnswerKeyTable] = useState(true);
  const [includeExplanations, setIncludeExplanations] = useState(false);

  useEffect(() => {
    if (exam && isOpen) {
      setTitle(exam.name || 'ĐỀ THI KHẢO SÁT CHẤT LƯỢNG');
      setTimeLimit(exam.timeLimit || 50);
      loadQuestions();
    }
  }, [exam, isOpen]);

  const loadQuestions = async () => {
    if (!exam) return;
    setLoading(true);
    try {
      let loaded: Question[] = [];
      if (exam.snapshotQuestions && exam.snapshotQuestions.length > 0) {
        loaded = exam.snapshotQuestions;
      } else if (exam.questionIds && exam.questionIds.length > 0) {
        loaded = await db.questions.where('id').anyOf(exam.questionIds).toArray();
      }
      setQuestions(loaded);

      // Try to load subject name
      if (exam.subjectId) {
        const sub = await db.subjects.get(exam.subjectId);
        if (sub) setSubjectName(sub.name);
      }
    } catch (e) {
      console.error('Failed to load questions for export:', e);
      toast.error('Không thể tải danh sách câu hỏi của đề thi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !exam) return null;

  const getConfig = (): ExportExamConfig => ({
    title,
    schoolName,
    subjectName: subjectName || exam.name,
    timeLimit,
    codeCount,
    baseCode,
    includeAnswers,
    includeAnswerKeyTable,
    includeExplanations,
  });

  const handleExportWord = () => {
    if (questions.length === 0) {
      toast.error('Đề thi chưa có câu hỏi để xuất');
      return;
    }
    try {
      ExamExportService.exportToDocx(exam, questions, getConfig());
      toast.success('Đã xuất file Word thành công!');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Lỗi khi xuất file Word');
    }
  };

  const handlePrintPreview = () => {
    if (questions.length === 0) {
      toast.error('Đề thi chưa có câu hỏi để in');
      return;
    }
    onPrintPreview(getConfig(), questions);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-primary text-white shadow-sm">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[hsl(var(--foreground))]">
                Xuất Đề Thi Ra Word & PDF
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Tạo tài liệu đề thi chuẩn in ấn, đa mã đề xáo trộn và phiếu đáp án.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar text-xs text-[hsl(var(--foreground))]">
          {/* Title & School */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-[hsl(var(--muted-foreground))]">Tên đơn vị / Trường:</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-xs focus:border-[hsl(var(--primary))] outline-none font-medium"
                placeholder="VD: TRƯỜNG THPT CHUYÊN..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-[hsl(var(--muted-foreground))]">Tên môn thi:</label>
              <input
                type="text"
                value={subjectName}
                onChange={e => setSubjectName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-xs focus:border-[hsl(var(--primary))] outline-none font-medium"
                placeholder="VD: TOÁN HỌC"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-[hsl(var(--muted-foreground))]">Tiêu đề kỳ thi:</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-xs focus:border-[hsl(var(--primary))] outline-none font-medium"
              placeholder="VD: ĐỀ THI KHẢO SÁT CHẤT LƯỢNG HỌC KỲ 2"
            />
          </div>

          {/* Time Limit & Multi-Code Variants */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="font-semibold text-[hsl(var(--muted-foreground))]">Thời gian (phút):</label>
              <input
                type="number"
                min="5"
                max="300"
                value={timeLimit}
                onChange={e => setTimeLimit(parseInt(e.target.value) || 50)}
                className="w-full px-3 py-2 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-xs focus:border-[hsl(var(--primary))] outline-none font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-[hsl(var(--muted-foreground))]">Số lượng mã đề:</label>
              <select
                value={codeCount}
                onChange={e => setCodeCount(parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-xs focus:border-[hsl(var(--primary))] outline-none font-medium"
              >
                <option value={1}>1 mã đề gốc</option>
                <option value={2}>2 mã đề xáo trộn</option>
                <option value={4}>4 mã đề xáo trộn</option>
                <option value={8}>8 mã đề xáo trộn</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-[hsl(var(--muted-foreground))]">Mã đề bắt đầu:</label>
              <input
                type="number"
                min="100"
                max="999"
                value={baseCode}
                onChange={e => setBaseCode(parseInt(e.target.value) || 101)}
                className="w-full px-3 py-2 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))] text-xs focus:border-[hsl(var(--primary))] outline-none font-medium"
              />
            </div>
          </div>

          {/* Export Options */}
          <div className="p-3.5 rounded-2xl bg-[hsl(var(--muted)/0.25)] border border-[hsl(var(--border))] space-y-2.5">
            <span className="font-bold text-[hsl(var(--foreground))] block">Tùy chọn nội dung xuất:</span>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAnswers}
                onChange={e => setIncludeAnswers(e.target.checked)}
                className="rounded accent-indigo-500 cursor-pointer"
              />
              <span>Gạch chân & in đậm đáp án đúng trong đề (Bản dành cho Giáo viên)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAnswerKeyTable}
                onChange={e => setIncludeAnswerKeyTable(e.target.checked)}
                className="rounded accent-indigo-500 cursor-pointer"
              />
              <span>Tạo bảng đáp án trắc nghiệm ở cuối trang (Answer Key Grid)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeExplanations}
                onChange={e => setIncludeExplanations(e.target.checked)}
                className="rounded accent-indigo-500 cursor-pointer"
              />
              <span>Kèm lời giải thích chi tiết dưới mỗi câu hỏi</span>
            </label>
          </div>

          <div className="text-[11px] text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <Layers size={13} className="text-indigo-500" />
            <span>Tổng cộng: <strong>{questions.length} câu hỏi</strong> sẽ được xuất.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleExportWord}
            disabled={loading || questions.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-xs font-semibold text-[hsl(var(--foreground))] border border-[hsl(var(--border))] transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} />
            <span>Tải Word (.doc)</span>
          </button>
          <button
            onClick={handlePrintPreview}
            disabled={loading || questions.length === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-primary text-white text-xs font-bold shadow-md hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            <Printer size={14} />
            <span>In / Lưu PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
