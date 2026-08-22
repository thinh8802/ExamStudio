// ============================================
// SUBJECT & CHAPTER MANAGEMENT STUDIO PRO
// ============================================
import React from 'react';
import { Button, Card, Input, Modal, EmptyState, ConfirmDialog, Badge } from '@/components/ui';
import { useSubjectStore } from '@/stores/subject-store';
import { useQuestionStore } from '@/stores/question-store';
import { SUBJECT_COLORS } from '@/utils';
import {
  Plus, Edit, Trash2, ChevronRight, GraduationCap, BookOpen,
  FileQuestion, Sparkles, Layers, ListPlus, Check, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import { subjectRepository } from '@/services/repositories/subject-repository';

// 6 Modern Gradient Banners for Subject Cards
const SUBJECT_CARD_THEMES = [
  { border: 'border-indigo-500/30 hover:border-indigo-500/60', headerBg: 'bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-transparent', pill: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
  { border: 'border-cyan-500/30 hover:border-cyan-500/60', headerBg: 'bg-gradient-to-r from-cyan-500/10 via-teal-500/5 to-transparent', pill: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' },
  { border: 'border-emerald-500/30 hover:border-emerald-500/60', headerBg: 'bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-transparent', pill: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { border: 'border-amber-500/30 hover:border-amber-500/60', headerBg: 'bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent', pill: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { border: 'border-rose-500/30 hover:border-rose-500/60', headerBg: 'bg-gradient-to-r from-rose-500/10 via-pink-500/5 to-transparent', pill: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  { border: 'border-purple-500/30 hover:border-purple-500/60', headerBg: 'bg-gradient-to-r from-purple-500/10 via-fuchsia-500/5 to-transparent', pill: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
];

export const SubjectManagementPage: React.FC = () => {
  const { subjects, chapters, addSubject, updateSubject, deleteSubject, addChapter, updateChapter, deleteChapter, getChaptersBySubject } = useSubjectStore();
  const { questions } = useQuestionStore();

  // Subject modal state
  const [showSubjectModal, setShowSubjectModal] = React.useState(false);
  const [editingSubject, setEditingSubject] = React.useState<string | null>(null);
  const [subjectName, setSubjectName] = React.useState('');
  const [subjectDesc, setSubjectDesc] = React.useState('');
  const [subjectColor, setSubjectColor] = React.useState(SUBJECT_COLORS[0]);
  const [initialChaptersText, setInitialChaptersText] = React.useState('');

  // Chapter edit modal state
  const [editingChapterId, setEditingChapterId] = React.useState<string | null>(null);
  const [editingChapterName, setEditingChapterName] = React.useState('');

  // Batch chapter modal state
  const [batchSubjectId, setBatchSubjectId] = React.useState<string | null>(null);
  const [batchChaptersText, setBatchChaptersText] = React.useState('');

  // Quick inline chapter input per subject: { [subjectId]: string }
  const [inlineChapterInputs, setInlineChapterInputs] = React.useState<Record<string, string>>({});

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = React.useState<{ type: 'subject' | 'chapter'; id: string; name: string; message: string } | null>(null);

  const handleOpenSubjectDelete = async (id: string, name: string) => {
    const counts = await subjectRepository.querySubjectDeleteCounts(id);
    const message = `Xóa môn "${name}" sẽ tự động xóa ${counts.chapterCount} chương, ${counts.topicCount} chủ đề và ${counts.questionCount} câu hỏi liên quan. Hành động này không thể hoàn tác!`;
    setDeleteTarget({ type: 'subject', id, name, message });
  };

  const handleOpenChapterDelete = async (id: string, name: string) => {
    const counts = await subjectRepository.queryChapterDeleteCounts(id);
    const message = `Xóa chương "${name}" sẽ tự động xóa ${counts.topicCount} chủ đề và ${counts.questionCount} câu hỏi liên quan. Hành động này không thể hoàn tác!`;
    setDeleteTarget({ type: 'chapter', id, name, message });
  };

  const handleSaveSubject = async () => {
    if (!subjectName.trim()) {
      toast.error('Vui lòng nhập tên môn học');
      return;
    }

    if (editingSubject) {
      await updateSubject(editingSubject, { name: subjectName, description: subjectDesc, color: subjectColor });
      toast.success('Đã cập nhật môn học');
    } else {
      const created = await addSubject({ name: subjectName, description: subjectDesc, color: subjectColor });
      // If user provided initial chapters list line by line, create them simultaneously
      if (created?.id && initialChaptersText.trim()) {
        const lines = initialChaptersText.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          await addChapter({ subjectId: created.id, name: line });
        }
        toast.success(`Đã tạo môn học và ${lines.length} chương kèm theo!`);
      } else {
        toast.success('Đã tạo môn học mới');
      }
    }
    resetSubjectModal();
  };

  const resetSubjectModal = () => {
    setShowSubjectModal(false);
    setEditingSubject(null);
    setSubjectName('');
    setSubjectDesc('');
    setSubjectColor(SUBJECT_COLORS[0]);
    setInitialChaptersText('');
  };

  const openEditSubject = (id: string) => {
    const sub = subjects.find(s => s.id === id);
    if (sub) {
      setEditingSubject(id);
      setSubjectName(sub.name);
      setSubjectDesc(sub.description);
      setSubjectColor(sub.color);
      setShowSubjectModal(true);
    }
  };

  // Quick inline chapter submit
  const handleQuickAddChapter = async (subjectId: string) => {
    const text = (inlineChapterInputs[subjectId] || '').trim();
    if (!text) {
      toast.error('Vui lòng nhập tên chương');
      return;
    }

    await addChapter({ subjectId, name: text });
    toast.success(`Đã thêm chương "${text}"`);
    setInlineChapterInputs(prev => ({ ...prev, [subjectId]: '' }));
  };

  // Batch chapters submit
  const handleBatchSaveChapters = async () => {
    if (!batchSubjectId) return;
    const lines = batchChaptersText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error('Vui lòng nhập ít nhất 1 tên chương');
      return;
    }

    for (const line of lines) {
      await addChapter({ subjectId: batchSubjectId, name: line });
    }

    toast.success(`🎉 Đã tạo thành công ${lines.length} chương mới!`);
    setBatchSubjectId(null);
    setBatchChaptersText('');
  };

  const handleSaveEditChapter = async () => {
    if (!editingChapterId || !editingChapterName.trim()) return;
    await updateChapter(editingChapterId, { name: editingChapterName.trim() });
    toast.success('Đã đổi tên chương');
    setEditingChapterId(null);
    setEditingChapterName('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'subject') {
      await deleteSubject(deleteTarget.id);
      toast.success('Đã xóa môn học');
    } else {
      await deleteChapter(deleteTarget.id);
      toast.success('Đã xóa chương');
    }
    setDeleteTarget(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[hsl(var(--border))]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-8 h-8 text-[hsl(var(--primary))]" />
            <span>Quản Lý Môn Học & Chương</span>
          </h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Giao diện thẻ bài đa cột trực quan: Tạo môn, thêm nhanh từng chương hoặc nhập hàng loạt cả danh mục trong 1 click.
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowSubjectModal(true)} className="shadow-sm">
          Tạo môn học mới
        </Button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState 
          icon={<GraduationCap size={64} className="text-[hsl(var(--muted-foreground))]" />} 
          title="Chưa có môn học nào" 
          description="Tạo môn học đầu tiên để bắt đầu xây dựng cấu trúc ngân hàng câu hỏi của bạn." 
          action={<Button icon={<Plus size={16} />} onClick={() => setShowSubjectModal(true)}>Tạo môn học</Button>} 
        />
      ) : (
        /* Modern 3-Column Subject Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {subjects.map((subject, sIdx) => {
            const subChapters = getChaptersBySubject(subject.id);
            const questionCount = questions.filter(q => q.subjectId === subject.id).length;
            const theme = SUBJECT_CARD_THEMES[sIdx % SUBJECT_CARD_THEMES.length];
            const currentInlineVal = inlineChapterInputs[subject.id] || '';

            return (
              <div 
                key={subject.id} 
                className={`rounded-3xl bg-[hsl(var(--card))] border-2 ${theme.border} shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-200 hover:shadow-md group`}
              >
                <div>
                  {/* Top Card Header */}
                  <div className={`p-4 border-b border-[hsl(var(--border))] ${theme.headerBg} flex items-center justify-between gap-3`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-base font-extrabold shadow-sm shrink-0" 
                        style={{ backgroundColor: subject.color }}
                      >
                        {subject.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-extrabold text-sm sm:text-base text-[hsl(var(--foreground))] truncate" title={subject.name}>
                          {subject.name}
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${theme.pill}`}>
                            {subChapters.length} chương
                          </span>
                          <span className="text-[10.5px] font-semibold text-[hsl(var(--muted-foreground))]">
                            {questionCount} câu hỏi
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => openEditSubject(subject.id)}
                        className="p-1.5 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                        title="Chỉnh sửa môn học"
                      >
                        <Edit size={15} />
                      </button>
                      <button 
                        onClick={() => handleOpenSubjectDelete(subject.id, subject.name)}
                        className="p-1.5 rounded-xl text-[hsl(var(--muted-foreground))] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Xóa môn học"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Chapters List */}
                  <div className="p-3.5 space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {subChapters.length === 0 ? (
                      <div className="py-8 text-center text-[hsl(var(--muted-foreground))] space-y-1">
                        <BookOpen className="w-6 h-6 mx-auto opacity-30" />
                        <p className="text-xs">Chưa có chương nào. Nhập bên dưới để thêm ngay.</p>
                      </div>
                    ) : (
                      subChapters.map((chapter, cIdx) => {
                        const chQCount = questions.filter(q => q.chapterId === chapter.id).length;
                        return (
                          <div 
                            key={chapter.id} 
                            className="flex items-center justify-between p-2.5 rounded-2xl bg-[hsl(var(--muted)/0.25)] hover:bg-[hsl(var(--muted)/0.5)] border border-[hsl(var(--border)/0.7)] transition-all group/item"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-lg bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[10px] font-mono font-bold flex items-center justify-center text-[hsl(var(--muted-foreground))] shrink-0">
                                {cIdx + 1}
                              </span>
                              <span className="text-xs font-semibold text-[hsl(var(--foreground))] truncate" title={chapter.name}>
                                {chapter.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]">
                                {chQCount} câu
                              </span>
                              <button 
                                onClick={() => { setEditingChapterId(chapter.id); setEditingChapterName(chapter.name); }}
                                className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))] transition-colors cursor-pointer opacity-40 group-hover/item:opacity-100"
                                title="Sửa tên chương"
                              >
                                <Edit size={13} />
                              </button>
                              <button 
                                onClick={() => handleOpenChapterDelete(chapter.id, chapter.name)}
                                className="p-1 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer opacity-40 group-hover/item:opacity-100"
                                title="Xóa chương"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer: Quick Add Inline + Batch Add */}
                <div className="p-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] space-y-2">
                  {/* Inline Quick Add Input */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={currentInlineVal}
                      onChange={e => setInlineChapterInputs(prev => ({ ...prev, [subject.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleQuickAddChapter(subject.id); }}
                      placeholder="Nhập tên chương mới rồi nhấn Enter..."
                      className="flex-1 px-3 py-1.5 text-xs bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleQuickAddChapter(subject.id)}
                      disabled={!currentInlineVal.trim()}
                      className="shrink-0 h-8 px-2.5 text-xs"
                    >
                      <Plus size={14} />
                      <span className="hidden sm:inline">Thêm</span>
                    </Button>
                  </div>

                  {/* Batch Add Modal Trigger */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setBatchSubjectId(subject.id); setBatchChaptersText(''); }}
                      className="text-[11px] font-bold text-[hsl(var(--primary))] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ListPlus size={13} />
                      <span>+ Thêm nhiều chương cùng lúc</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Subject Modal (Create / Edit) */}
      <Modal 
        isOpen={showSubjectModal} 
        onClose={resetSubjectModal} 
        title={editingSubject ? 'Chỉnh Sửa Môn Học' : 'Tạo Môn Học Mới'} 
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={resetSubjectModal}>Hủy</Button>
            <Button onClick={handleSaveSubject}>{editingSubject ? 'Cập nhật' : 'Tạo môn học'}</Button>
          </>
        }
      >
        <div className="space-y-4 p-1">
          <Input 
            label="Tên môn học *" 
            placeholder="Ví dụ: Kinh tế vĩ mô, Giải tích 1..." 
            value={subjectName} 
            onChange={e => setSubjectName(e.target.value)} 
          />
          
          <Input 
            label="Mô tả ngắn" 
            placeholder="Mô tả môn học..." 
            value={subjectDesc} 
            onChange={e => setSubjectDesc(e.target.value)} 
          />

          <div>
            <label className="block text-xs font-bold text-[hsl(var(--foreground))] mb-2">Màu sắc chủ đạo</label>
            <div className="flex gap-2.5 flex-wrap">
              {SUBJECT_COLORS.map(color => (
                <button 
                  key={color} 
                  type="button"
                  onClick={() => setSubjectColor(color)}
                  className={`w-7 h-7 rounded-xl transition-all cursor-pointer ${subjectColor === color ? 'ring-2 ring-offset-2 ring-[hsl(var(--ring))] scale-110 shadow-sm' : 'hover:scale-110 opacity-80 hover:opacity-100'}`}
                  style={{ backgroundColor: color }} 
                />
              ))}
            </div>
          </div>

          {!editingSubject && (
            <div className="p-3 rounded-2xl bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] space-y-2">
              <label className="block text-xs font-bold text-[hsl(var(--foreground))] flex items-center justify-between">
                <span>Nhập danh sách chương ban đầu (tùy chọn)</span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Mỗi dòng 1 chương</span>
              </label>
              <textarea
                value={initialChaptersText}
                onChange={e => setInitialChaptersText(e.target.value)}
                placeholder={'Chương 1: Tổng quan kinh tế\nChương 2: Cung cầu thị trường\nChương 3: Độ co giãn...'}
                rows={3}
                className="w-full p-2.5 text-xs bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Single Chapter Name Modal */}
      <Modal 
        isOpen={!!editingChapterId} 
        onClose={() => { setEditingChapterId(null); setEditingChapterName(''); }} 
        title="Đổi Tên Chương" 
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingChapterId(null)}>Hủy</Button>
            <Button onClick={handleSaveEditChapter}>Cập nhật</Button>
          </>
        }
      >
        <div className="p-1 space-y-3">
          <Input 
            label="Tên chương *" 
            placeholder="Nhập tên chương..." 
            value={editingChapterName} 
            onChange={e => setEditingChapterName(e.target.value)} 
          />
        </div>
      </Modal>

      {/* Batch Add Chapters Modal */}
      <Modal
        isOpen={!!batchSubjectId}
        onClose={() => { setBatchSubjectId(null); setBatchChaptersText(''); }}
        title={
          <div className="flex items-center gap-2">
            <ListPlus className="w-5 h-5 text-[hsl(var(--primary))]" />
            <span>Thêm Hàng Loạt Nhiều Chương Cùng Lúc</span>
          </div>
        }
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setBatchSubjectId(null)}>Hủy</Button>
            <Button onClick={handleBatchSaveChapters} className="gap-1.5">
              <Check size={14} /> Tạo tất cả chương
            </Button>
          </>
        }
      >
        <div className="space-y-3 p-1">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Dán danh sách các chương bên dưới (mỗi dòng là một chương). Hệ thống sẽ tự động tạo toàn bộ chương trong 1 giây mà không cần ấn từng lần!
          </p>

          <textarea
            value={batchChaptersText}
            onChange={e => setBatchChaptersText(e.target.value)}
            placeholder={'Chương 1: Khái niệm cơ bản\nChương 2: Nguyên lý cung cầu\nChương 3: Lý thuyết người tiêu dùng\nChương 4: Sản xuất và chi phí\nChương 5: Cấu trúc thị trường\nChương 6: Thị trường yếu tố sản xuất'}
            rows={7}
            className="w-full p-3 text-xs font-mono bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />

          <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
            <span>Số chương sẽ tạo: <strong className="text-[hsl(var(--primary))]">{batchChaptersText.split('\n').map(l => l.trim()).filter(Boolean).length}</strong></span>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Xóa ${deleteTarget?.type === 'subject' ? 'môn học' : 'chương'}`}
        description={deleteTarget?.message || ''}
        confirmText="Xóa vĩnh viễn"
        variant="destructive"
      />
    </div>
  );
};
