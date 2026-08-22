// ============================================
// QUESTION FORM PAGE - Tạo/Sửa câu hỏi
// ============================================
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Input, Select, Textarea, Card, CardContent, CardHeader, CardTitle, Switch, Badge } from '@/components/ui';
import { useQuestionStore } from '@/stores/question-store';
import { useSubjectStore } from '@/stores/subject-store';
import { generateId } from '@/services/database';
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS } from '@/types';
import type { Question, Answer, QuestionType, Difficulty } from '@/types';
import { Save, Plus, Trash2, Eye, X, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const QuestionFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addQuestion, updateQuestion, getQuestionById } = useQuestionStore();
  const { subjects, chapters, getChaptersBySubject, getTopicsByChapter } = useSubjectStore();
  const isEditing = !!id;

  const [form, setForm] = React.useState<Partial<Question>>({
    subjectId: '',
    chapterId: '',
    topicId: '',
    type: 'single_choice',
    difficulty: 'medium',
    content: '',
    answers: [
      { id: generateId(), label: 'A', content: '', isCorrect: false },
      { id: generateId(), label: 'B', content: '', isCorrect: false },
      { id: generateId(), label: 'C', content: '', isCorrect: false },
      { id: generateId(), label: 'D', content: '', isCorrect: false },
    ],
    explanation: '',
    tags: [],
    notes: '',
    source: '',
  });
  const [tagInput, setTagInput] = React.useState('');
  const [showPreview, setShowPreview] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  // Load existing question for editing
  React.useEffect(() => {
    if (isEditing && id) {
      const q = getQuestionById(id);
      if (q) {
        setForm({ ...q });
      } else {
        toast.error('Không tìm thấy câu hỏi');
        navigate('/questions');
      }
    }
  }, [id, isEditing]);

  const availableChapters = form.subjectId ? getChaptersBySubject(form.subjectId) : [];
  const availableTopics = form.chapterId ? getTopicsByChapter(form.chapterId) : [];

  const updateForm = (data: Partial<Question>) => setForm(prev => ({ ...prev, ...data }));

  const updateAnswer = (index: number, data: Partial<Answer>) => {
    const answers = [...(form.answers || [])];
    answers[index] = { ...answers[index], ...data };
    updateForm({ answers });
  };

  const setCorrectAnswer = (index: number) => {
    const answers = (form.answers || []).map((a, i) => ({
      ...a,
      isCorrect: form.type === 'multiple_choice' ? (i === index ? !a.isCorrect : a.isCorrect) : i === index,
    }));
    const correctLabels = answers.filter(a => a.isCorrect).map(a => a.label).join(',');
    updateForm({ answers, correctAnswer: correctLabels });
  };

  const addAnswer = () => {
    const answers = [...(form.answers || [])];
    const label = String.fromCharCode(65 + answers.length);
    answers.push({ id: generateId(), label, content: '', isCorrect: false });
    updateForm({ answers });
  };

  const removeAnswer = (index: number) => {
    if ((form.answers?.length || 0) <= 2) {
      toast.error('Cần ít nhất 2 đáp án');
      return;
    }
    const answers = (form.answers || []).filter((_, i) => i !== index).map((a, i) => ({
      ...a,
      label: String.fromCharCode(65 + i),
    }));
    const correctLabels = answers.filter(a => a.isCorrect).map(a => a.label).join(',');
    updateForm({ answers, correctAnswer: correctLabels });
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags?.includes(tagInput.trim())) {
      updateForm({ tags: [...(form.tags || []), tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    updateForm({ tags: (form.tags || []).filter(t => t !== tag) });
  };

  const validate = (): string | null => {
    if (!form.content?.trim()) return 'Vui lòng nhập nội dung câu hỏi';
    if (!form.subjectId) return 'Vui lòng chọn môn học';
    if (!form.chapterId) return 'Vui lòng chọn chương';
    const answers = form.answers || [];
    if (answers.length < 2) return 'Cần ít nhất 2 đáp án';
    if (answers.some(a => !a.content.trim())) return 'Tất cả đáp án phải có nội dung';
    const correctCount = answers.filter(a => a.isCorrect).length;
    if (form.type === 'single_choice' && correctCount !== 1) return 'Câu hỏi một đáp án cần đúng 1 đáp án đúng';
    if (form.type === 'multiple_choice' && correctCount < 1) return 'Câu hỏi nhiều đáp án cần ít nhất 1 đáp án đúng';
    if (form.type === 'true_false' && correctCount !== 1) return 'Câu Đúng/Sai cần đúng 1 đáp án đúng';
    return null;
  };

  const handleSave = async (continueAdding = false) => {
    const error = validate();
    if (error) { toast.error(error); return; }
    setSaving(true);
    try {
      if (isEditing && id) {
        await updateQuestion(id, form);
        toast.success('Đã cập nhật câu hỏi');
        if (!continueAdding) navigate('/questions');
      } else {
        const newQ = await addQuestion(form);
        toast.success(`Đã tạo câu hỏi ${newQ.id}`);
        if (continueAdding) {
          // Reset form nhưng giữ subject/chapter
          setForm(prev => ({
            subjectId: prev.subjectId,
            chapterId: prev.chapterId,
            topicId: prev.topicId,
            type: prev.type,
            difficulty: prev.difficulty,
            content: '',
            answers: [
              { id: generateId(), label: 'A', content: '', isCorrect: false },
              { id: generateId(), label: 'B', content: '', isCorrect: false },
              { id: generateId(), label: 'C', content: '', isCorrect: false },
              { id: generateId(), label: 'D', content: '', isCorrect: false },
            ],
            explanation: '',
            tags: prev.tags,
            notes: '',
            source: prev.source,
          }));
        } else {
          navigate('/questions');
        }
      }
    } catch (err) {
      toast.error('Lỗi khi lưu câu hỏi');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/questions')}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Sửa câu hỏi' : 'Tạo câu hỏi mới'}</h1>
          {isEditing && <p className="text-sm text-[hsl(var(--muted-foreground))]">ID: {id}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT - Metadata */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Phân loại</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Môn học *"
                placeholder="Chọn môn học"
                value={form.subjectId || ''}
                onChange={e => updateForm({ subjectId: e.target.value, chapterId: '', topicId: '' })}
                options={subjects.map(s => ({ value: s.id, label: s.name }))}
              />
              <Select
                label="Chương *"
                placeholder="Chọn chương"
                value={form.chapterId || ''}
                onChange={e => updateForm({ chapterId: e.target.value, topicId: '' })}
                options={availableChapters.map(c => ({ value: c.id, label: c.name }))}
              />
              {availableTopics.length > 0 && (
                <Select
                  label="Chủ đề"
                  placeholder="Chọn chủ đề"
                  value={form.topicId || ''}
                  onChange={e => updateForm({ topicId: e.target.value })}
                  options={availableTopics.map(t => ({ value: t.id, label: t.name }))}
                />
              )}
              <Select
                label="Loại câu hỏi"
                value={form.type || 'single_choice'}
                onChange={e => {
                  const type = e.target.value as QuestionType;
                  if (type === 'true_false') {
                    updateForm({
                      type,
                      answers: [
                        { id: generateId(), label: 'A', content: 'Đúng', isCorrect: false },
                        { id: generateId(), label: 'B', content: 'Sai', isCorrect: false },
                      ],
                    });
                  } else {
                    updateForm({ type });
                  }
                }}
                options={Object.entries(QUESTION_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              />
              <Select
                label="Mức độ"
                value={form.difficulty || 'medium'}
                onChange={e => updateForm({ difficulty: e.target.value as Difficulty })}
                options={Object.entries(DIFFICULTY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              />

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Tags</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {(form.tags || []).map(tag => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} <X size={12} className="ml-1" />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Thêm tag..."
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1"
                  />
                  <Button variant="outline" size="md" onClick={addTag}>+</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CENTER - Content & Answers */}
        <div className="lg:col-span-2 space-y-4">
          {/* Question Content */}
          <Card>
            <CardHeader><CardTitle className="text-base">Nội dung câu hỏi *</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                placeholder="Nhập nội dung câu hỏi... (Hỗ trợ HTML cơ bản)"
                value={form.content || ''}
                onChange={e => updateForm({ content: e.target.value })}
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Answers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Đáp án {form.type === 'multiple_choice' ? '(chọn nhiều)' : '(chọn một)'}
                </CardTitle>
                {form.type !== 'true_false' && (
                  <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={addAnswer}>
                    Thêm đáp án
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(form.answers || []).map((answer, index) => (
                <div key={answer.id} className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setCorrectAnswer(index)}
                    className={`mt-2 flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                      answer.isCorrect
                        ? 'bg-[hsl(var(--success))] border-[hsl(var(--success))] text-white'
                        : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))] text-[hsl(var(--muted-foreground))]'
                    }`}
                    title={answer.isCorrect ? 'Đáp án đúng' : 'Nhấn để đánh dấu đúng'}
                  >
                    {answer.isCorrect ? <CheckCircle2 size={16} /> : answer.label}
                  </button>
                  <div className="flex-1">
                    <Input
                      placeholder={`Nội dung đáp án ${answer.label}...`}
                      value={answer.content}
                      onChange={e => updateAnswer(index, { content: e.target.value })}
                    />
                  </div>
                  {form.type !== 'true_false' && (form.answers?.length || 0) > 2 && (
                    <Button variant="ghost" size="icon" className="mt-0.5" onClick={() => removeAnswer(index)}>
                      <Trash2 size={16} className="text-[hsl(var(--muted-foreground))]" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Explanation */}
          <Card>
            <CardHeader><CardTitle className="text-base">Giải thích</CardTitle></CardHeader>
            <CardContent>
              <Textarea
                placeholder="Giải thích đáp án (tùy chọn)..."
                value={form.explanation || ''}
                onChange={e => updateForm({ explanation: e.target.value })}
              />
            </CardContent>
          </Card>

          {/* Extra Fields */}
          <Card>
            <CardHeader><CardTitle className="text-base">Thông tin thêm</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Nguồn"
                placeholder="Ví dụ: Sách giáo khoa, trang 120"
                value={form.source || ''}
                onChange={e => updateForm({ source: e.target.value })}
              />
              <Textarea
                label="Ghi chú"
                placeholder="Ghi chú riêng..."
                value={form.notes || ''}
                onChange={e => updateForm({ notes: e.target.value })}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate('/questions')}>Hủy</Button>
            {!isEditing && (
              <Button variant="secondary" icon={<Save size={16} />} loading={saving} onClick={() => handleSave(true)}>
                Lưu & tạo tiếp
              </Button>
            )}
            <Button icon={<Save size={16} />} loading={saving} onClick={() => handleSave(false)}>
              {isEditing ? 'Cập nhật' : 'Lưu'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
