// ============================================
// EXAM LIST PAGE - Kho & Quản Lý Đề Thi
// ============================================
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '@/stores/exam-store';
import { useSubjectStore } from '@/stores/subject-store';
import { useQuestionStore } from '@/stores/question-store';
import { Card, CardContent, Badge, Button, Modal, ConfirmDialog } from '@/components/ui';
import { ExamBuilderService } from '@/services/exam-builder-service';
import type { Exam, Question } from '@/types';
import toast from 'react-hot-toast';
import {
  ListChecks, PlusCircle, Shuffle, Search, Filter, Play,
  Copy, Trash2, Archive, Download, Eye, Clock, CheckCircle2,
  Award, BookOpen, AlertCircle, LayoutGrid, Table as TableIcon,
  ChevronRight, Sparkles, FileText, ArrowRight, Printer
} from 'lucide-react';
import { ExamExportModal } from '@/components/exam/ExamExportModal';
import { ExamPrintView } from '@/components/exam/ExamPrintView';
import { MathRenderer } from '@/components/common/MathRenderer';
import type { ExportExamConfig } from '@/services/exam-export-service';

export const ExamListPage: React.FC = () => {
  const navigate = useNavigate();
  const { exams, loadExams, deleteExam, duplicateExam, archiveExam, startExamById, loadAttemptHistory } = useExamStore();
  const { subjects } = useSubjectStore();
  const { questions: allQuestions } = useQuestionStore();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // 'all', 'ready', 'archived'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Stats from attempts
  const [attemptStats, setAttemptStats] = useState<{
    totalAttempts: number;
    avgScore: number;
    examAttemptMap: Record<string, { count: number; maxScore: number; lastDate?: string }>;
  }>({
    totalAttempts: 0,
    avgScore: 0,
    examAttemptMap: {},
  });

  // Preview modal state
  const [previewExam, setPreviewExam] = useState<Exam | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);

  // Export modal & Print preview state
  const [exportExam, setExportExam] = useState<Exam | null>(null);
  const [printViewConfig, setPrintViewConfig] = useState<{
    config: ExportExamConfig;
    questions: Question[];
    exam: Exam;
  } | null>(null);

  // Delete confirm dialog
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await loadExams();
        const attempts = await loadAttemptHistory();
        const map: Record<string, { count: number; maxScore: number; lastDate?: string }> = {};
        let scoreSum = 0;
        let completedCount = 0;

        attempts.forEach(att => {
          if (att.examId) {
            if (!map[att.examId]) {
              map[att.examId] = { count: 0, maxScore: 0 };
            }
            map[att.examId].count++;
            if (att.score > map[att.examId].maxScore) {
              map[att.examId].maxScore = att.score;
            }
            map[att.examId].lastDate = att.completedAt ? new Date(att.completedAt).toLocaleDateString('vi-VN') : undefined;
          }
          if (att.isCompleted) {
            scoreSum += att.score;
            completedCount++;
          }
        });

        setAttemptStats({
          totalAttempts: attempts.length,
          avgScore: completedCount > 0 ? scoreSum / completedCount : 0,
          examAttemptMap: map,
        });
      } catch (err) {
        console.error(err);
        toast.error('Lỗi khi tải danh sách đề thi');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchSubject = !selectedSubjectId || e.subjectId === selectedSubjectId;
      const matchStatus = selectedStatus === 'all'
        ? (e.status !== 'archived')
        : (selectedStatus === 'archived' ? e.status === 'archived' : e.status === selectedStatus);
      return matchSearch && matchSubject && matchStatus;
    });
  }, [exams, searchQuery, selectedSubjectId, selectedStatus]);

  const subjectMap = useMemo(() => {
    return new Map(subjects.map(s => [s.id, s.name]));
  }, [subjects]);

  // Actions
  const handleStartExam = async (examId: string, mode: 'exam' | 'practice' = 'exam') => {
    try {
      await startExamById(examId, { mode });
      navigate('/quiz/session');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi bắt đầu làm bài thi');
    }
  };

  const handleDuplicate = async (examId: string) => {
    try {
      const dup = await duplicateExam(examId);
      toast.success(`Đã nhân bản đề thi: "${dup.name}"`);
    } catch {
      toast.error('Lỗi khi nhân bản đề thi');
    }
  };

  const handleArchive = async (examId: string) => {
    try {
      await archiveExam(examId);
      toast.success('Đã cập nhật trạng thái lưu trữ');
    } catch {
      toast.error('Lỗi khi lưu trữ đề thi');
    }
  };

  const handleDelete = async () => {
    if (!deletingExamId) return;
    try {
      await deleteExam(deletingExamId);
      toast.success('Đã xóa đề thi');
      setDeletingExamId(null);
    } catch {
      toast.error('Lỗi khi xóa đề thi');
    }
  };

  const handleExport = (exam: Exam) => {
    const questions = exam.snapshotQuestions && exam.snapshotQuestions.length > 0
      ? exam.snapshotQuestions
      : allQuestions.filter(q => exam.questionIds.includes(q.id));
    const jsonStr = ExamBuilderService.exportExamJSON(exam, questions);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam_${exam.name.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file đề thi JSON');
  };

  const handleOpenPreview = (exam: Exam) => {
    setPreviewExam(exam);
    const qs = exam.snapshotQuestions && exam.snapshotQuestions.length > 0
      ? exam.snapshotQuestions
      : exam.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean) as Question[];
    setPreviewQuestions(qs);
  };

  if (printViewConfig) {
    return (
      <ExamPrintView
        exam={printViewConfig.exam}
        questions={printViewConfig.questions}
        config={printViewConfig.config}
        onBack={() => setPrintViewConfig(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[hsl(var(--foreground))] flex items-center gap-2.5">
            <ListChecks className="text-[hsl(var(--primary))] w-8 h-8" />
            <span>Kho & Quản Lý Đề Thi</span>
          </h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Tạo đề thi tùy chỉnh, thi thử chuẩn format phòng thi và theo dõi tiến độ điểm số.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            icon={<PlusCircle size={16} />}
            onClick={() => navigate('/exams/new')}
            className="rounded-2xl"
          >
            Tạo thủ công
          </Button>
          <Button
            variant="gradient"
            icon={<Shuffle size={16} />}
            onClick={() => navigate('/exams/auto')}
            className="rounded-2xl"
          >
            Tạo tự động
          </Button>
        </div>
      </div>

      {/* 2. Top Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 sm:p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Tổng đề thi</span>
            <div className="w-8 h-8 rounded-xl bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-[hsl(var(--foreground))]">{exams.length}</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))] block mt-0.5">Đề đã tạo trong kho</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500/80">Lượt đã thi</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-500">{attemptStats.totalAttempts}</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))] block mt-0.5">Tổng số lần làm đề</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500/80">Điểm trung bình</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-amber-500">
              {attemptStats.avgScore > 0 ? `${attemptStats.avgScore.toFixed(1)}/10` : '—'}
            </span>
            <span className="text-xs text-[hsl(var(--muted-foreground))] block mt-0.5">Điểm các bài đã thi</span>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-500/80">Chế độ</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-cyan-500">100%</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))] block mt-0.5">Offline & Tự động lưu</span>
          </div>
        </div>
      </div>

      {/* 3. Control & Filter Bar */}
      <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Tìm kiếm đề thi..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs sm:text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.4)]"
              />
            </div>

            {/* Filters & View Toggle */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
              {/* Subject Filter */}
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="py-2 px-3 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none"
              >
                <option value="">Tất cả môn học</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="py-2 px-3 rounded-xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none"
              >
                <option value="all">Đang hoạt động</option>
                <option value="ready">Sẵn sàng (Ready)</option>
                <option value="archived">Đã lưu trữ (Archived)</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-xs font-bold' : 'text-[hsl(var(--muted-foreground))]'}`}
                  title="Dạng lưới"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${viewMode === 'table' ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-xs font-bold' : 'text-[hsl(var(--muted-foreground))]'}`}
                  title="Dạng bảng"
                >
                  <TableIcon size={16} />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Exam Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-56 rounded-3xl bg-[hsl(var(--muted)/0.4)] border border-[hsl(var(--border))]" />
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-4 text-center rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center mx-auto">
            <ListChecks className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">
              {searchQuery || selectedSubjectId ? 'Không tìm thấy đề thi phù hợp' : 'Chưa có đề thi nào trong kho'}
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {searchQuery || selectedSubjectId
                ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc để xem các đề khác.'
                : 'Hãy bắt đầu tạo đề thi đầu tiên bằng cách chọn câu hỏi thủ công hoặc sinh tự động theo ma trận.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              icon={<PlusCircle size={15} />}
              onClick={() => navigate('/exams/new')}
              className="rounded-2xl"
            >
              Tạo đề thủ công
            </Button>
            <Button
              variant="gradient"
              icon={<Shuffle size={15} />}
              onClick={() => navigate('/exams/auto')}
              className="rounded-2xl"
            >
              Tạo đề tự động
            </Button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map(exam => {
            const subjectName = subjectMap.get(exam.subjectId) || 'Tổng hợp';
            const stats = attemptStats.examAttemptMap[exam.id] || { count: 0, maxScore: 0 };

            return (
              <div
                key={exam.id}
                className="p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.4)] shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 group"
              >
                {/* Top badges */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] truncate max-w-[160px]">
                      {subjectName}
                    </span>
                    {exam.status === 'archived' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-500/15 text-zinc-500 border border-zinc-500/20">
                        Đã lưu trữ
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-1">
                      {exam.name}
                    </h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 mt-0.5">
                      {exam.description || `Đề thi môn ${subjectName} gồm ${exam.questionCount} câu hỏi.`}
                    </p>
                  </div>
                </div>

                {/* Metrics Chips */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-[11px]">
                  <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
                    <FileText size={13} className="text-[hsl(var(--primary))]" />
                    <span className="font-semibold text-[hsl(var(--foreground))]">{exam.questionCount} câu</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
                    <Clock size={13} className="text-amber-500" />
                    <span className="font-semibold text-[hsl(var(--foreground))]">
                      {exam.timeLimit > 0 ? `${exam.timeLimit} phút` : 'Tự do'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span>{stats.count > 0 ? `${stats.count} lượt thi` : 'Chưa thi'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
                    <Award size={13} className="text-cyan-500" />
                    <span className={stats.maxScore >= 8 ? 'text-emerald-500 font-bold' : ''}>
                      {stats.count > 0 ? `Cao: ${stats.maxScore.toFixed(1)}` : 'Điểm: —'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-[hsl(var(--border))] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenPreview(exam)}
                      className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                      title="Xem trước câu hỏi"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(exam.id)}
                      className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                      title="Nhân bản đề"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => setExportExam(exam)}
                      className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-indigo-500 hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                      title="In đề & Xuất Word/PDF"
                    >
                      <Printer size={15} />
                    </button>
                    <button
                      onClick={() => handleExport(exam)}
                      className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                      title="Xuất file JSON"
                    >
                      <Download size={15} />
                    </button>
                    <button
                      onClick={() => handleArchive(exam.id)}
                      className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-amber-500 hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                      title={exam.status === 'archived' ? 'Bỏ lưu trữ' : 'Lưu trữ đề'}
                    >
                      <Archive size={15} />
                    </button>
                    <button
                      onClick={() => setDeletingExamId(exam.id)}
                      className="p-2 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-rose-500 hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                      title="Xóa đề"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <Button
                    variant="gradient"
                    size="sm"
                    icon={<Play size={13} className="fill-current" />}
                    onClick={() => handleStartExam(exam.id, 'exam')}
                    className="rounded-xl font-bold px-3 py-1.5 text-xs"
                  >
                    Vào thi
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="rounded-3xl border border-[hsl(var(--border))] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-bold">
                  <th className="py-3.5 pl-4">Tên đề thi</th>
                  <th className="py-3.5">Môn học</th>
                  <th className="py-3.5">Quy mô</th>
                  <th className="py-3.5">Thời gian</th>
                  <th className="py-3.5">Lượt thi</th>
                  <th className="py-3.5">Điểm cao nhất</th>
                  <th className="py-3.5 text-right pr-4">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filteredExams.map(exam => {
                  const subjectName = subjectMap.get(exam.subjectId) || 'Tổng hợp';
                  const stats = attemptStats.examAttemptMap[exam.id] || { count: 0, maxScore: 0 };

                  return (
                    <tr key={exam.id} className="hover:bg-[hsl(var(--muted)/0.2)] transition-colors">
                      <td className="py-3 pl-4">
                        <div className="font-bold text-[hsl(var(--foreground))] text-sm line-clamp-1">{exam.name}</div>
                        <div className="text-[11px] text-[hsl(var(--muted-foreground))] line-clamp-1">{exam.description}</div>
                      </td>
                      <td className="py-3">
                        <span className="font-semibold px-2 py-0.5 rounded-md bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]">
                          {subjectName}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-[hsl(var(--foreground))]">{exam.questionCount} câu</td>
                      <td className="py-3 font-semibold text-[hsl(var(--foreground))]">
                        {exam.timeLimit > 0 ? `${exam.timeLimit} phút` : 'Tự do'}
                      </td>
                      <td className="py-3 text-[hsl(var(--muted-foreground))]">{stats.count} lượt</td>
                      <td className="py-3 font-bold text-[hsl(var(--foreground))]">
                        {stats.count > 0 ? `${stats.maxScore.toFixed(1)}/10` : '—'}
                      </td>
                      <td className="py-3 text-right pr-4">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setExportExam(exam)}
                            className="rounded-xl text-xs py-1 flex items-center gap-1"
                            title="In & Xuất Word/PDF"
                          >
                            <Printer size={12} />
                            <span>In/Xuất</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPreview(exam)}
                            className="rounded-xl text-xs py-1"
                          >
                            Xem
                          </Button>
                          <Button
                            variant="gradient"
                            size="sm"
                            icon={<Play size={12} className="fill-current" />}
                            onClick={() => handleStartExam(exam.id, 'exam')}
                            className="rounded-xl font-bold text-xs py-1"
                          >
                            Vào thi
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Preview Modal */}
      <Modal
        open={Boolean(previewExam)}
        onClose={() => setPreviewExam(null)}
        title={`Xem trước đề thi: ${previewExam?.name || ''}`}
        size="lg"
      >
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="p-3 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] flex items-center justify-between text-xs">
            <span>Tổng số: <strong>{previewQuestions.length} câu hỏi</strong></span>
            <span>Thời gian: <strong>{previewExam?.timeLimit ? `${previewExam.timeLimit} phút` : 'Không giới hạn'}</strong></span>
          </div>

          <div className="space-y-3">
            {previewQuestions.map((q, idx) => (
              <div key={q.id || idx} className="p-3.5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-[hsl(var(--primary))]">Câu {idx + 1}</span>
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                    {q.difficulty}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-[hsl(var(--foreground))]">
                  <MathRenderer text={q.content} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {q.answers.map((a, aIdx) => (
                    <div
                      key={a.id || aIdx}
                      className={`p-2 rounded-xl text-xs border ${
                        a.isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-300 font-semibold'
                          : 'bg-[hsl(var(--muted)/0.2)] border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'
                      }`}
                    >
                      <span className="font-bold mr-1.5">{String.fromCharCode(65 + aIdx)}.</span>
                      <MathRenderer text={a.content} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border))]">
            <Button
              variant="outline"
              size="sm"
              icon={<Printer size={14} />}
              onClick={() => {
                if (previewExam) {
                  setExportExam(previewExam);
                }
              }}
              className="rounded-xl text-xs"
            >
              In / Xuất Word & PDF
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewExam(null)}
                className="rounded-xl text-xs"
              >
                Đóng
              </Button>
              <Button
                variant="gradient"
                size="sm"
                icon={<Play size={13} className="fill-current" />}
                onClick={() => {
                  if (previewExam) {
                    handleStartExam(previewExam.id, 'exam');
                  }
                }}
                className="rounded-xl font-bold text-xs"
              >
                Bắt đầu thi
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <ExamExportModal
        exam={exportExam}
        isOpen={Boolean(exportExam)}
        onClose={() => setExportExam(null)}
        onPrintPreview={(config, questions) => {
          if (exportExam) {
            setPrintViewConfig({ config, questions, exam: exportExam });
            setExportExam(null);
          }
        }}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(deletingExamId)}
        onClose={() => setDeletingExamId(null)}
        onConfirm={handleDelete}
        title="Xóa đề thi này?"
        description="Đề thi sẽ bị xóa khỏi kho lưu trữ. Lịch sử các bài thi bạn đã hoàn thành trước đó vẫn được bảo toàn nguyên vẹn."
        confirmText="Xóa đề thi"
        variant="destructive"
      />
    </div>
  );
};
