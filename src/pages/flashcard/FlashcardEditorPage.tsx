import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, BookOpen } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { useFlashcardStore } from '@/stores/flashcard-store';
import { flashcardRepository } from '@/services/repositories/flashcard-repository';

export const FlashcardEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useAppStore();
  const isDarkMode = theme === 'dark';
  const location = useLocation();
  const stateDeckId = location.state?.deckId;
  const { decks } = useFlashcardStore();

  const [deckId, setDeckId] = useState<string>(stateDeckId || decks[0]?.id || '');
  const [targetTopic, setTargetTopic] = useState<string>(location.state?.initialTopic || '');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDeck = decks.find(d => d.id === deckId);
  const availableFolders = selectedDeck?.folders || [];

  React.useEffect(() => {
    if (!deckId && decks.length > 0) {
      setDeckId(decks[0].id);
    }
  }, [decks, deckId]);

  const handleSave = async () => {
    if (!deckId || !front.trim() || !back.trim()) {
      alert("Vui lòng chọn bộ thẻ và điền đầy đủ 2 mặt.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await flashcardRepository.createCard({
        deckId,
        front,
        back,
        tags: targetTopic ? [targetTopic] : [],
      });
      alert('Tạo thẻ thành công!');
      setFront('');
      setBack('');
    } catch (e) {
      alert('Có lỗi xảy ra: ' + (e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen p-6 md:p-10 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/flashcards')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
              <Sparkles className="w-4 h-4" />
              Tạo từ Ngân hàng câu hỏi
            </button>
            <button 
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Đang lưu...' : 'Lưu thẻ'}
            </button>
          </div>
        </div>

        <div className="text-2xl font-bold mb-6">Tạo Flashcard Mới</div>

        {/* Deck & Folder Selection */}
        <div className={`p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Chọn Bộ thẻ (Deck)
            </label>
            <select 
              value={deckId}
              onChange={e => {
                setDeckId(e.target.value);
                setTargetTopic('');
              }}
              className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-700 text-white' 
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
            >
              <option value="" disabled>-- Chọn bộ thẻ --</option>
              {decks.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-2">
              📂 Chọn Thư mục (Folder / Topic)
            </label>
            <select 
              value={targetTopic}
              onChange={e => setTargetTopic(e.target.value)}
              className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-700 text-white' 
                  : 'bg-gray-50 border-gray-300 text-gray-900'
              }`}
            >
              <option value="">-- Gán vào bộ thẻ chính (Không phân thư mục) --</option>
              {availableFolders.map(f => (
                <option key={f} value={f}>📂 {f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Editor Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FRONT */}
          <div className={`p-6 rounded-2xl flex flex-col ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h3 className="text-lg font-semibold mb-4 text-blue-500">MẶT TRƯỚC (Câu hỏi)</h3>
            <textarea
              value={front}
              onChange={e => setFront(e.target.value)}
              placeholder="Nhập khái niệm, câu hỏi hoặc gợi ý..."
              className={`flex-1 w-full p-4 rounded-xl resize-none outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-900/50 text-white placeholder-gray-600' 
                  : 'bg-gray-50 text-gray-900 placeholder-gray-400'
              }`}
              style={{ minHeight: '300px' }}
            />
          </div>

          {/* BACK */}
          <div className={`p-6 rounded-2xl flex flex-col ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <h3 className="text-lg font-semibold mb-4 text-green-500">MẶT SAU (Đáp án)</h3>
            <textarea
              value={back}
              onChange={e => setBack(e.target.value)}
              placeholder="Nhập đáp án, lời giải thích..."
              className={`flex-1 w-full p-4 rounded-xl resize-none outline-none focus:ring-2 focus:ring-green-500 ${
                isDarkMode 
                  ? 'bg-gray-900/50 text-white placeholder-gray-600' 
                  : 'bg-gray-50 text-gray-900 placeholder-gray-400'
              }`}
              style={{ minHeight: '300px' }}
            />
          </div>
        </div>

      </div>
    </div>
  );
};
