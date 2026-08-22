import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Card, CardContent, CardHeader, CardTitle,
  Select, Badge, ConfirmDialog, EmptyState, Modal, Input
} from '@/components/ui';
import { useQuestionStore } from '@/stores/question-store';
import { useSubjectStore } from '@/stores/subject-store';
import type { Question } from '@/types';
import {
  Upload, FileText, CheckCircle2, AlertCircle, Save, X, Table2, ArrowLeft,
  Download, Plus, Trash2, Edit3, Sparkles, RefreshCw, FileCheck2,
  FileCode, Layers, Info, Check, AlertTriangle, HelpCircle, ChevronDown,
  ChevronUp, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  readDocxFile,
  readPdfFile,
  readTextFile,
  parseDocument,
  validateAll,
  type ParsedQuestion,
  type ParsedAnswer,
  SAMPLE_TXT_TEMPLATE,
  SAMPLE_JSON_TEMPLATE,
  SAMPLE_CSV_TEMPLATE,
  downloadFile
} from '@/services/import-engine';
import { cn } from '@/utils';

export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { bulkImport } = useQuestionStore();
  const { subjects, chapters, addSubject, addChapter } = useSubjectStore();

  // Mode: 'file' or 'text'
  const [mode, setMode] = React.useState<'file' | 'text'>('file');
  const [textInput, setTextInput] = React.useState('');
  const [parsedQuestions, setParsedQuestions] = React.useState<ParsedQuestion[]>([]);
  const [subjectId, setSubjectId] = React.useState('');
  const [chapterId, setChapterId] = React.useState('');
  const [importing, setImporting] = React.useState(false);
  const [parsing, setParsing] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [filter, setFilter] = React.useState<'all' | 'valid' | 'missing_answers' | 'errors'>('all');
  
  // File details state
  const [uploadedFile, setUploadedFile] = React.useState<{ name: string; size: string; count: number } | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  // In-line editing modal / state
  const [editingQuestionIdx, setEditingQuestionIdx] = React.useState<number | null>(null);
  const [editingContent, setEditingContent] = React.useState('');
  const [editingExplanation, setEditingExplanation] = React.useState('');
  const [editingAnswers, setEditingAnswers] = React.useState<ParsedAnswer[]>([]);
  const [editingCorrectAnswer, setEditingCorrectAnswer] = React.useState<string | null>(null);
  const [lastEditedQuestionIdx, setLastEditedQuestionIdx] = React.useState<number | null>(null);

  // Quick New Subject / Chapter Modal
  const [showNewSubjectModal, setShowNewSubjectModal] = React.useState(false);
  const [newSubjectName, setNewSubjectName] = React.useState('');
  const [showNewChapterModal, setShowNewChapterModal] = React.useState(false);
  const [newChapterName, setNewChapterName] = React.useState('');

  const availableChapters = subjectId ? chapters.filter(c => c.subjectId === subjectId) : [];
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Helper format file size
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Process Raw File
  const processFile = async (file: File) => {
    setParsing(true);
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      let questions: ParsedQuestion[] = [];

      if (ext === 'docx') {
        const paragraphs = await readDocxFile(file);
        questions = parseDocument(paragraphs);
      } else if (ext === 'pdf') {
        const paragraphs = await readPdfFile(file);
        questions = parseDocument(paragraphs);
      } else if (ext === 'txt') {
        const text = await file.text();
        const paragraphs = readTextFile(text);
        questions = parseDocument(paragraphs);
      } else if (ext === 'json') {
        const text = await file.text();
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            questions = parsed.map((item, idx) => ({
              sourceIndex: idx + 1,
              questionNumber: String(idx + 1),
              content: item.content || item.question || '',
              answers: Array.isArray(item.answers) 
                ? item.answers.map((a: any, aIdx: number) => ({
                    label: a.label || String.fromCharCode(65 + aIdx),
                    content: typeof a === 'string' ? a : (a.content || a.text || '')
                  }))
                : [],
              correctAnswer: item.correctAnswer || item.correct || null,
              explanation: item.explanation || item.explain || '',
              answerDetectionSource: 'text-marker',
              confidence: 'very_high',
              warnings: [],
              isValid: true,
            }));
          }
        } catch {
          throw new Error('File JSON không đúng định dạng danh sách câu hỏi');
        }
      } else if (ext === 'csv') {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length > 1) {
          // Skip header if contains 'câu hỏi' or 'question'
          const startIdx = lines[0].toLowerCase().includes('câu hỏi') || lines[0].toLowerCase().includes('question') ? 1 : 0;
          questions = lines.slice(startIdx).map((line, idx) => {
            const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
            return {
              sourceIndex: idx + 1,
              questionNumber: String(idx + 1),
              content: cols[0] || '',
              answers: [
                { label: 'A', content: cols[1] || '' },
                { label: 'B', content: cols[2] || '' },
                { label: 'C', content: cols[3] || '' },
                { label: 'D', content: cols[4] || '' },
              ].filter(a => Boolean(a.content)),
              correctAnswer: cols[5] || null,
              explanation: cols[6] || '',
              answerDetectionSource: 'text-marker',
              confidence: 'high',
              warnings: [],
              isValid: true,
            };
          });
        }
      } else {
        toast.error('Định dạng file không được hỗ trợ. Vui lòng chọn .DOCX, .PDF, .TXT, .JSON hoặc .CSV');
        setParsing(false);
        return;
      }

      const validated = validateAll(questions);
      setParsedQuestions(validated);
      setFilter('all');
      setUploadedFile({
        name: file.name,
        size: formatSize(file.size),
        count: validated.length
      });

      if (validated.length === 0) {
        toast.error('Không tìm thấy câu hỏi trắc nghiệm hợp lệ nào trong file');
      } else {
        toast.success(`🎉 Phân tích thành công ${validated.length} câu hỏi từ ${file.name}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi khi đọc file: ' + err.message);
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Text Mode live parse
  React.useEffect(() => {
    if (mode === 'text') {
      if (!textInput.trim()) {
        setParsedQuestions([]);
        return;
      }
      const timer = setTimeout(() => {
        try {
          const paragraphs = readTextFile(textInput);
          const questions = parseDocument(paragraphs);
          const validated = validateAll(questions);
          setParsedQuestions(validated);
        } catch (err) {
          console.error(err);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [textInput, mode]);

  // Click to toggle/set answer
  const handleSelectAnswer = (qIndex: number, label: string) => {
    setParsedQuestions(prev => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      
      if (q.correctAnswer === label) {
        q.correctAnswer = '';
      } else {
        q.correctAnswer = label;
      }
      
      if (q.correctAnswer) {
        q.warnings = q.warnings.filter(w => {
          const lower = w.toLowerCase();
          return !lower.includes('đáp án đúng') && 
                 !lower.includes('formatting') && 
                 !lower.includes('mâu thuẫn');
        });
        q.isValid = q.warnings.length === 0 && q.answers.length >= 2;
        q.answerDetectionSource = 'manual';
        q.confidence = 'very_high';
      } else {
        if (!q.warnings.includes('Không xác định được đáp án đúng')) {
          q.warnings.push('Không xác định được đáp án đúng');
        }
        q.isValid = false;
      }
      
      next[qIndex] = q;
      return next;
    });
  };

  // Delete single question
  const handleDeleteQuestion = (indexToDelete: number) => {
    setParsedQuestions(prev => prev.filter((_, idx) => idx !== indexToDelete));
    toast.success('Đã xóa câu hỏi khỏi danh sách');
  };

  // Open Inline Edit Modal
  const handleOpenEdit = (qIndex: number) => {
    const q = parsedQuestions[qIndex];
    if (!q) return;
    setEditingQuestionIdx(qIndex);
    setEditingContent(q.content);
    setEditingExplanation(q.explanation || '');
    setEditingAnswers(q.answers.map(a => ({ ...a })));
    setEditingCorrectAnswer(q.correctAnswer || null);
  };

  // Delete answer choice in modal
  const handleDeleteEditingAnswer = (aIdx: number) => {
    setEditingAnswers(prev => {
      const filtered = prev.filter((_, idx) => idx !== aIdx);
      return filtered.map((a, idx) => ({
        ...a,
        label: String.fromCharCode(65 + idx),
      }));
    });
  };

  // Add new answer choice in modal
  const handleAddEditingAnswer = () => {
    setEditingAnswers(prev => [
      ...prev,
      {
        label: String.fromCharCode(65 + prev.length),
        content: '',
      }
    ]);
  };

  // Save In-line Edit
  const handleSaveEdit = () => {
    if (editingQuestionIdx === null) return;
    setParsedQuestions(prev => {
      const next = [...prev];
      const q = { ...next[editingQuestionIdx] };
      q.content = editingContent.trim();
      q.explanation = editingExplanation.trim();
      
      // Auto-prune empty answers and relabel
      const nonEmptyAnswers = editingAnswers
        .filter(a => a.content.trim().length > 0)
        .map((a, idx) => ({
          ...a,
          label: String.fromCharCode(65 + idx),
          content: a.content.trim(),
        }));
      
      q.answers = nonEmptyAnswers;

      // Check if selected editingCorrectAnswer still exists
      const hasCorrect = nonEmptyAnswers.some(a => a.label === editingCorrectAnswer);
      q.correctAnswer = hasCorrect ? editingCorrectAnswer : (q.correctAnswer && nonEmptyAnswers.some(a => a.label === q.correctAnswer) ? q.correctAnswer : null);
      if (editingCorrectAnswer && hasCorrect) {
        q.answerDetectionSource = 'manual';
      }

      // Re-validate
      const revalidated = validateAll([q])[0];
      next[editingQuestionIdx] = revalidated;
      return next;
    });
    setLastEditedQuestionIdx(editingQuestionIdx);
    setEditingQuestionIdx(null);
    toast.success('Đã lưu chỉnh sửa câu hỏi (Đang hiển thị xem trước)');
  };

  // Auto-Fix All Questions
  const handleAutoFixAll = () => {
    setParsedQuestions(prev => {
      return prev.map(q => {
        const nextQ = { ...q };
        // If question has no correct answer but has answers, default to A if only 1 option
        if (!nextQ.correctAnswer && nextQ.answers.length >= 2) {
          nextQ.correctAnswer = 'A';
          nextQ.answerDetectionSource = 'manual';
        }
        // Remove empty answers
        nextQ.answers = nextQ.answers.filter(a => Boolean(a.content.trim()));
        nextQ.warnings = [];
        nextQ.isValid = nextQ.answers.length >= 2 && Boolean(nextQ.content.trim()) && Boolean(nextQ.correctAnswer);
        return nextQ;
      });
    });
    toast.success('Đã tự động tối ưu hóa và chuẩn hóa toàn bộ câu hỏi');
  };

  // Remove all invalid questions
  const handleRemoveInvalid = () => {
    const invalidCount = parsedQuestions.filter(q => !q.isValid).length;
    setParsedQuestions(prev => prev.filter(q => q.isValid));
    toast.success(`Đã loại bỏ ${invalidCount} câu hỏi lỗi`);
  };

  // Quick Create Subject
  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) {
      toast.error('Vui lòng nhập tên môn học');
      return;
    }
    try {
      const created = await addSubject({ name: newSubjectName.trim() });
      setSubjectId(created.id);
      setShowNewSubjectModal(false);
      setNewSubjectName('');
      toast.success(`Đã tạo môn học "${created.name}"`);
    } catch {
      toast.error('Lỗi khi tạo môn học');
    }
  };

  // Quick Create Chapter
  const handleCreateChapter = async () => {
    if (!chapterSubjectIdTarget || !newChapterName.trim()) {
      toast.error('Vui lòng chọn môn học và nhập tên chương');
      return;
    }
    try {
      const created = await addChapter({
        subjectId: chapterSubjectIdTarget,
        name: newChapterName.trim(),
        order: availableChapters.length + 1
      });
      setChapterId(created.id);
      setShowNewChapterModal(false);
      setNewChapterName('');
      toast.success(`Đã tạo chương "${created.name}"`);
    } catch {
      toast.error('Lỗi khi tạo chương');
    }
  };

  const [chapterSubjectIdTarget, setChapterSubjectIdTarget] = React.useState('');

  // Bulk Import Submit
  const handleImport = async () => {
    if (!subjectId || !chapterId) {
      toast.error('Vui lòng chọn môn học và chương đích');
      setShowConfirm(false);
      return;
    }

    const validQuestions = parsedQuestions.filter(q => q.isValid);
    if (validQuestions.length === 0) {
      toast.error('Không có câu hỏi hợp lệ nào để import');
      setShowConfirm(false);
      return;
    }

    setImporting(true);
    
    try {
      const questionsToImport: Partial<Question>[] = validQuestions.map(q => ({
        content: q.content,
        subjectId,
        chapterId,
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        type: (q.correctAnswer && q.correctAnswer.includes(',')) ? 'multiple_choice' : 'single_choice',
        difficulty: 'medium',
        answers: q.answers.map((a) => ({
          id: '', 
          label: a.label,
          content: a.content,
          isCorrect: q.correctAnswer?.split(',').includes(a.label) || false
        }))
      }));

      const result = await bulkImport(questionsToImport);
      
      if (result.errors.length > 0) {
        toast.error(`Import hoàn tất nhưng có lỗi: ${result.errors[0]}`);
      } else {
        toast.success(`🎉 Đã nạp thành công ${result.imported} câu hỏi vào Ngân hàng!`);
        setParsedQuestions([]);
        setTextInput('');
        setUploadedFile(null);
        // Ensure fresh reload and select the target subject in question bank
        await useQuestionStore.getState().loadQuestions();
        await useSubjectStore.getState().loadAll();
        useQuestionStore.getState().setFilter({ subjectId, chapterId: undefined, search: '' });
        navigate('/questions');
      }
    } catch (err: any) {
      toast.error('Lỗi khi lưu dữ liệu: ' + err.message);
    } finally {
      setImporting(false);
      setShowConfirm(false);
    }
  };

  // Filter questions (and always keep recently edited question visible for instant preview)
  const filteredQuestions = parsedQuestions.filter((q, idx) => {
    if (lastEditedQuestionIdx === idx) return true;
    if (filter === 'valid') return q.isValid;
    if (filter === 'missing_answers') return !q.correctAnswer;
    if (filter === 'errors') return !q.isValid;
    return true;
  });

  const validCount = parsedQuestions.filter(q => q.isValid).length;
  const errorCount = parsedQuestions.filter(q => !q.isValid).length;
  const missingAnswerCount = parsedQuestions.filter(q => !q.correctAnswer).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 animate-fade-in">
      
      {/* 1. Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-2xl bg-[hsl(var(--muted)/0.6)] hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-all cursor-pointer shrink-0"
            title="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[hsl(var(--foreground))] tracking-tight">
                Nhập Dữ Liệu & Khởi Tạo Đề Thi
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]">
                Import Studio Pro V2
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
              Hỗ trợ tự động bóc tách từ file Word, PDF, Text, JSON và CSV với cơ chế nhận diện đáp án thông minh.
            </p>
          </div>
        </div>

        {/* Quick Sample Download Toolbar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className="text-xs font-semibold text-[hsl(var(--muted-foreground))] hidden lg:inline">Tải file mẫu:</span>
          <button
            onClick={() => downloadFile('De_Thi_Mau_ExamPrepStudio.txt', SAMPLE_TXT_TEMPLATE, 'text/plain;charset=utf-8')}
            className="px-3 py-1.5 rounded-xl bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] text-xs font-bold border border-[hsl(var(--border))] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Tải mẫu file Text .TXT"
          >
            <FileText size={13} className="text-blue-500" />
            <span>Mẫu Text (.txt)</span>
          </button>
          <button
            onClick={() => downloadFile('De_Thi_Mau_ExamPrepStudio.json', SAMPLE_JSON_TEMPLATE, 'application/json;charset=utf-8')}
            className="px-3 py-1.5 rounded-xl bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] text-xs font-bold border border-[hsl(var(--border))] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Tải mẫu file JSON"
          >
            <FileCode size={13} className="text-emerald-500" />
            <span>Mẫu JSON (.json)</span>
          </button>
          <button
            onClick={() => downloadFile('De_Thi_Mau_ExamPrepStudio.csv', SAMPLE_CSV_TEMPLATE, 'text/csv;charset=utf-8')}
            className="px-3 py-1.5 rounded-xl bg-[hsl(var(--muted)/0.5)] hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] text-xs font-bold border border-[hsl(var(--border))] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Tải mẫu file CSV"
          >
            <Table2 size={13} className="text-amber-500" />
            <span>Mẫu CSV (.csv)</span>
          </button>
        </div>
      </div>

      {/* 2. Step 1: Destination Selector (Target Subject & Chapter) */}
      <div className="p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-white font-black text-xs flex items-center justify-center">
              1
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-[hsl(var(--foreground))]">
              Chọn Đích Lưu Trữ (Môn Học & Chương)
            </h2>
          </div>
          <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Bắt buộc để lưu câu hỏi</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Subject Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <label className="text-[hsl(var(--foreground))]">Môn học <span className="text-rose-500">*</span></label>
              <button
                type="button"
                onClick={() => setShowNewSubjectModal(true)}
                className="text-[11px] text-[hsl(var(--primary))] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Plus size={12} /> Tạo môn mới
              </button>
            </div>
            <Select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setChapterId('');
              }}
              options={subjects.map(s => ({ value: s.id, label: s.name }))}
              placeholder="-- Chọn môn học đích --"
            />
          </div>

          {/* Chapter Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <label className="text-[hsl(var(--foreground))]">Chương <span className="text-rose-500">*</span></label>
              {subjectId && (
                <button
                  type="button"
                  onClick={() => {
                    setChapterSubjectIdTarget(subjectId);
                    setShowNewChapterModal(true);
                  }}
                  className="text-[11px] text-[hsl(var(--primary))] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus size={12} /> Tạo chương mới
                </button>
              )}
            </div>
            <Select
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              options={availableChapters.map(c => ({ value: c.id, label: c.name }))}
              placeholder={subjectId ? "-- Chọn chương đích --" : "Vui lòng chọn môn học trước"}
              disabled={!subjectId}
            />
          </div>
        </div>
      </div>

      {/* 3. Step 2: Smart Input Engine (Dropzone Pro vs Live Text) */}
      <div className="p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-white font-black text-xs flex items-center justify-center">
              2
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-[hsl(var(--foreground))]">
              Nạp Dữ Liệu Câu Hỏi
            </h2>
          </div>

          {/* Mode Switcher Pills */}
          <div className="flex p-1 rounded-2xl bg-[hsl(var(--muted)/0.6)] border border-[hsl(var(--border))] text-xs font-bold shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setMode('file')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-xl transition-all cursor-pointer',
                mode === 'file'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-xs'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <Upload size={14} />
              <span>Tải file thông minh (.docx, .pdf, .txt, .json, .csv)</span>
            </button>
            <button
              onClick={() => setMode('text')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-xl transition-all cursor-pointer',
                mode === 'text'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--primary))] shadow-xs'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              <FileText size={14} />
              <span>Soạn thảo / Dán văn bản trực tiếp</span>
            </button>
          </div>
        </div>

        {/* Mode File: Dropzone Pro */}
        {mode === 'file' && (
          <div className="space-y-4">
            {!uploadedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 relative overflow-hidden group',
                  isDragOver
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] scale-[1.01]'
                    : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.6)] bg-[hsl(var(--muted)/0.15)] hover:bg-[hsl(var(--muted)/0.3)]'
                )}
              >
                <div className="w-16 h-16 rounded-3xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[hsl(var(--primary))] group-hover:text-white transition-all shadow-xs">
                  <Upload size={28} className="animate-pulse" />
                </div>

                <h3 className="text-base sm:text-lg font-black text-[hsl(var(--foreground))] mb-1">
                  Kéo thả file vào đây hoặc <span className="text-[hsl(var(--primary))] underline underline-offset-4">Chọn từ máy tính</span>
                </h3>
                <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] max-w-md mb-4">
                  Hệ thống tự động phân tích câu hỏi, đáp án in đậm/gạch chân, text marker và bảng đáp án ở cuối file.
                </p>

                {/* Format Badges */}
                <div className="flex items-center gap-2 flex-wrap justify-center text-[11px] font-mono font-bold">
                  <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">.DOCX (Word)</span>
                  <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">.PDF</span>
                  <span className="px-2.5 py-1 rounded-xl bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/25">.TXT (Văn bản)</span>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">.JSON</span>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">.CSV</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".docx,.pdf,.txt,.json,.csv"
                  onChange={handleFileUpload}
                />
              </div>
            ) : (
              /* Uploaded File Info Card */
              <div className="p-4 rounded-2xl bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.25)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0">
                    <FileCheck2 size={22} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[hsl(var(--foreground))] truncate max-w-sm">
                      {uploadedFile.name}
                    </h4>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      Dung lượng: <strong>{uploadedFile.size}</strong> • Đã bóc tách: <strong className="text-emerald-500">{uploadedFile.count} câu hỏi</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      setParsedQuestions([]);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--foreground))] border border-[hsl(var(--border))] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw size={13} />
                    <span>Đổi file khác</span>
                  </button>
                </div>
              </div>
            )}

            {parsing && (
              <div className="p-4 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-center text-xs font-bold text-[hsl(var(--primary))] flex items-center justify-center gap-2 animate-pulse">
                <RefreshCw size={16} className="animate-spin" />
                <span>Đang phân tích cấu trúc tài liệu và tự động nhận diện đáp án...</span>
              </div>
            )}
          </div>
        )}

        {/* Mode Text: Live Text Editor */}
        {mode === 'text' && (
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <Info size={14} className="text-blue-500" /> Cú pháp nhận diện:
              </span>
              <span>• Câu: <code>Câu 1:</code> hoặc <code>1.</code></span>
              <span>• Đáp án: <code>A.</code> <code>B.</code> (hoặc <code>*A.</code> cho đáp án đúng)</span>
              <span>• Marker: <code>Đáp án đúng: A</code> hoặc <code>Key: A</code></span>
              <span>• Giải thích: <code>Lời giải: ...</code></span>
            </div>

            <textarea
              className="w-full h-56 p-4 resize-y outline-none font-mono text-xs sm:text-sm leading-relaxed rounded-2xl bg-[hsl(var(--muted)/0.2)] border border-[hsl(var(--border))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)] text-[hsl(var(--foreground))]"
              placeholder={`Dán hoặc soạn đề thi tại đây...&#10;&#10;Ví dụ:&#10;Câu 1: Kinh tế học vi mô nghiên cứu điều gì?&#10;A. Hành vi của cá nhân và doanh nghiệp&#10;B. Tổng sản phẩm quốc nội GDP&#10;C. Tỷ lệ lạm phát&#10;D. Chính sách tiền tệ&#10;Đáp án đúng: A&#10;Giải thích: Nghiên cứu hành vi của từng chủ thể đơn lẻ.`}
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* 4. Step 3: Live Question Inspector & Batch Tools */}
      {parsedQuestions.length > 0 && (
        <div className="p-5 rounded-3xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[hsl(var(--primary))] text-white font-black text-xs flex items-center justify-center">
                3
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-[hsl(var(--foreground))]">
                  Kiểm Duyệt & Tinh Chỉnh Câu Hỏi ({parsedQuestions.length} câu)
                </h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Nhấp trực tiếp vào đáp án A, B, C, D để đổi đáp án đúng hoặc nhấn Sửa để biên tập câu chữ.
                </p>
              </div>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAutoFixAll}
                className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Tự động gán đáp án và chuẩn hóa các câu thiếu"
              >
                <Zap size={13} />
                <span>Tự động sửa lỗi</span>
              </button>

              {errorCount > 0 && (
                <button
                  type="button"
                  onClick={handleRemoveInvalid}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Xóa toàn bộ các câu hỏi không hợp lệ"
                >
                  <Trash2 size={13} />
                  <span>Xóa {errorCount} câu lỗi</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs & KPI Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex p-1 rounded-2xl bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border))] text-xs font-bold overflow-x-auto">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  'px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap',
                  filter === 'all'
                    ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-xs'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                )}
              >
                Tất cả ({parsedQuestions.length})
              </button>
              <button
                onClick={() => setFilter('valid')}
                className={cn(
                  'px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap',
                  filter === 'valid'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-emerald-500'
                )}
              >
                Hợp lệ ({validCount})
              </button>
              <button
                onClick={() => setFilter('missing_answers')}
                className={cn(
                  'px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap',
                  filter === 'missing_answers'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-amber-500'
                )}
              >
                Cần chọn đáp án ({missingAnswerCount})
              </button>
              <button
                onClick={() => setFilter('errors')}
                className={cn(
                  'px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap',
                  filter === 'errors'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-rose-500'
                )}
              >
                Lỗi ({errorCount})
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs font-bold text-[hsl(var(--muted-foreground))]">
              <span className="text-emerald-600 dark:text-emerald-400">✓ {validCount} sẵn sàng lưu</span>
              <span>•</span>
              <span className={errorCount > 0 ? 'text-rose-500' : 'text-[hsl(var(--muted-foreground))]'}>
                {errorCount} câu cần kiểm tra
              </span>
            </div>
          </div>

          {/* Questions Grid / List */}
          {filteredQuestions.length === 0 ? (
            <div className="p-8 text-center bg-[hsl(var(--muted)/0.2)] rounded-3xl border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
              Không có câu hỏi nào trong bộ lọc này.
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[680px] overflow-y-auto pr-1">
              {filteredQuestions.map((q) => {
                const originalIndex = parsedQuestions.indexOf(q);
                return (
                  <div
                    key={originalIndex}
                    className={cn(
                      'p-4 sm:p-5 rounded-3xl border-2 transition-all space-y-3',
                      q.isValid
                        ? 'bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.4)]'
                        : 'bg-rose-500/[0.03] border-rose-500/35 hover:border-rose-500/60'
                    )}
                  >
                    {/* Header Row: Question # + Badges + Actions */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 rounded-xl bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] font-black text-xs flex items-center justify-center shrink-0 border border-[hsl(var(--border))]">
                          #{q.questionNumber || originalIndex + 1}
                        </span>

                        {q.isValid ? (
                          <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 text-[10.5px] px-2 py-0.5">
                            <CheckCircle2 size={12} className="mr-1" /> Hợp lệ
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10 text-[10.5px] px-2 py-0.5">
                            <AlertCircle size={12} className="mr-1" /> Cần xử lý
                          </Badge>
                        )}

                        {/* Source Tag */}
                        {q.answerDetectionSource === 'formatting' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            In đậm / Gạch chân
                          </span>
                        )}
                        {q.answerDetectionSource === 'text-marker' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Text Marker
                          </span>
                        )}
                        {q.answerDetectionSource === 'answer-key-table' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            Bảng đáp án cuối file
                          </span>
                        )}
                        {q.answerDetectionSource === 'manual' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Chọn thủ công
                          </span>
                        )}

                        {originalIndex === lastEditedQuestionIdx && (
                          <span className="text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <Sparkles size={11} /> Vừa chỉnh sửa (Đang xem trước)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(originalIndex)}
                          className="px-2.5 py-1 rounded-xl bg-[hsl(var(--muted)/0.6)] hover:bg-[hsl(var(--accent))] text-xs font-bold text-[hsl(var(--foreground))] border border-[hsl(var(--border))] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 size={12} />
                          <span>Sửa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(originalIndex)}
                          className="p-1.5 rounded-xl hover:bg-rose-500/10 text-[hsl(var(--muted-foreground))] hover:text-rose-500 transition-colors cursor-pointer"
                          title="Xóa câu hỏi này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="text-xs sm:text-sm font-semibold text-[hsl(var(--foreground))] leading-relaxed">
                      {q.content}
                    </div>

                    {/* 4 Choices Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.answers.map((ans) => {
                        const isCorrect = q.correctAnswer?.split(',').includes(ans.label);
                        return (
                          <button
                            key={ans.label}
                            type="button"
                            onClick={() => handleSelectAnswer(originalIndex, ans.label)}
                            className={cn(
                              'p-3 rounded-2xl border-2 text-left text-xs transition-all flex items-start justify-between gap-2 cursor-pointer',
                              isCorrect
                                ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-950 dark:text-emerald-200 font-bold shadow-2xs'
                                : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)] bg-[hsl(var(--muted)/0.2)] hover:bg-[hsl(var(--muted)/0.4)] text-[hsl(var(--foreground))]'
                            )}
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <span className={cn(
                                'font-mono font-black shrink-0 px-1.5 py-0.5 rounded-md text-[11px]',
                                isCorrect ? 'bg-emerald-500 text-white' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                              )}>
                                {ans.label}
                              </span>
                              <span className="leading-snug break-words">{ans.content}</span>
                            </div>
                            {isCorrect && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded-md shrink-0">
                                Đáp án đúng
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="p-3 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))] space-y-1">
                        <span className="font-bold text-[hsl(var(--foreground))] block text-[11px]">💡 Lời giải / Giải thích:</span>
                        <p className="leading-relaxed">{q.explanation}</p>
                      </div>
                    )}

                    {/* Error / Warning Alert Box */}
                    {q.warnings.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle size={14} /> Cần kiểm tra lại:
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11.5px] opacity-90 pl-1">
                          {q.warnings.map((w, wIdx) => (
                            <li key={wIdx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Save & Cancel Action Bar */}
          <div className="p-4 rounded-3xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setParsedQuestions([]);
                setUploadedFile(null);
                setTextInput('');
              }}
              className="px-4 py-2 rounded-2xl text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
            >
              Hủy bỏ phiên import
            </button>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={validCount === 0}
                className="shadow-md"
                icon={<Save size={16} />}
              >
                Lưu {validCount} câu hỏi vào hệ thống
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* IN-LINE QUESTION EDIT MODAL                                */}
      {/* ========================================================== */}
      {editingQuestionIdx !== null && (
        <Modal
          open={editingQuestionIdx !== null}
          onClose={() => setEditingQuestionIdx(null)}
          title={`Chỉnh Sửa Câu Hỏi #${editingQuestionIdx + 1}`}
          description="Biên tập lại nội dung câu hỏi, thêm/xóa lựa chọn, chọn đáp án đúng và lời giải thích trước khi lưu."
          size="lg"
        >
          <div className="space-y-4 pt-2">
            {/* Question Content */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Nội dung câu hỏi</label>
              <textarea
                value={editingContent}
                onChange={e => setEditingContent(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs sm:text-sm text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)] outline-none leading-relaxed"
                placeholder="Nhập nội dung câu hỏi..."
              />
            </div>

            {/* Answer Choices */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[hsl(var(--foreground))]">
                  Các lựa chọn đáp án (Bấm nhãn A, B, C... để chọn đáp án đúng)
                </label>
                <button
                  type="button"
                  onClick={handleAddEditingAnswer}
                  className="px-2.5 py-1 rounded-xl bg-[hsl(var(--primary)/0.1)] hover:bg-[hsl(var(--primary)/0.2)] text-[hsl(var(--primary))] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Plus size={13} /> Thêm phương án
                </button>
              </div>

              <div className="space-y-2">
                {editingAnswers.map((ans, aIdx) => {
                  const isCorrect = editingCorrectAnswer === ans.label;
                  return (
                    <div key={aIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCorrectAnswer(isCorrect ? null : ans.label)}
                        className={cn(
                          'w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 border transition-all cursor-pointer',
                          isCorrect
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/30'
                            : 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--accent))]'
                        )}
                        title={isCorrect ? 'Đang là đáp án đúng (Bấm để hủy)' : 'Bấm để đặt làm đáp án đúng'}
                      >
                        {isCorrect ? '✓' : ans.label}
                      </button>
                      <input
                        type="text"
                        value={ans.content}
                        onChange={e => {
                          const nextAns = [...editingAnswers];
                          nextAns[aIdx].content = e.target.value;
                          setEditingAnswers(nextAns);
                        }}
                        className={cn(
                          'flex-1 px-3 py-2 rounded-xl border text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]',
                          isCorrect ? 'bg-emerald-500/[0.04] border-emerald-500/40 font-medium' : 'bg-[hsl(var(--muted)/0.3)] border-[hsl(var(--border))]'
                        )}
                        placeholder={`Nội dung lựa chọn ${ans.label}...`}
                      />
                      {editingAnswers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEditingAnswer(aIdx)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/25 transition-colors cursor-pointer shrink-0"
                          title="Xóa lựa chọn này"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[hsl(var(--foreground))]">Lời giải thích (Tùy chọn)</label>
              <textarea
                value={editingExplanation}
                onChange={e => setEditingExplanation(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)] outline-none leading-relaxed"
                placeholder="Nhập lời giải thích chi tiết..."
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[hsl(var(--border))]">
              <button
                type="button"
                onClick={() => setEditingQuestionIdx(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <Button onClick={handleSaveEdit}>
                Lưu chỉnh sửa
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================== */}
      {/* QUICK NEW SUBJECT MODAL                                    */}
      {/* ========================================================== */}
      <Modal
        open={showNewSubjectModal}
        onClose={() => setShowNewSubjectModal(false)}
        title="Tạo Môn Học Mới"
        description="Thêm nhanh một môn học mới để lưu trữ câu hỏi import."
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[hsl(var(--foreground))]">Tên môn học</label>
            <Input
              value={newSubjectName}
              onChange={e => setNewSubjectName(e.target.value)}
              placeholder="VD: Kinh Tế Vi Mô, Giải Tích 1..."
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNewSubjectModal(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <Button onClick={handleCreateSubject}>Tạo môn học</Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================== */}
      {/* QUICK NEW CHAPTER MODAL                                    */}
      {/* ========================================================== */}
      <Modal
        open={showNewChapterModal}
        onClose={() => setShowNewChapterModal(false)}
        title="Tạo Chương Mới"
        description="Thêm nhanh một chương mới vào môn học đã chọn."
        size="sm"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[hsl(var(--foreground))]">Tên chương</label>
            <Input
              value={newChapterName}
              onChange={e => setNewChapterName(e.target.value)}
              placeholder="VD: Chương 1: Lý Thuyết Cung Cầu..."
              autoFocus
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNewChapterModal(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <Button onClick={handleCreateChapter}>Tạo chương</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Save Dialog */}
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleImport}
        title="Xác nhận Lưu Câu Hỏi"
        description={`Bạn chuẩn bị lưu ${validCount} câu hỏi hợp lệ vào chương đã chọn. Các câu lỗi sẽ tự động được bỏ qua.`}
        confirmText="Xác nhận lưu"
        loading={importing}
      />
    </div>
  );
};
