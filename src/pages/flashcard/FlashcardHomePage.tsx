import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Play, Calendar, Brain, X, Zap } from 'lucide-react';
import { useFlashcardStore } from '@/stores/flashcard-store';
import { useAppStore } from '@/stores/app-store';

export const FlashcardHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { decks, fetchDecks, dueCards, fetchDueCards, isLoading, createDeck } = useFlashcardStore();
  const { theme } = useAppStore();
  const isDarkMode = theme === 'dark';

  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return;
    setIsSubmitting(true);
    try {
      const newDeck = await createDeck({
        name: newDeckName.trim(),
        description: newDeckDesc.trim(),
        source: 'manual'
      });
      setIsCreatingDeck(false);
      setNewDeckName('');
      setNewDeckDesc('');
      navigate('/flashcards/new', { state: { deckId: newDeck.id } });
    } catch (e) {
      alert('Có lỗi xảy ra khi tạo bộ thẻ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchDecks();
    fetchDueCards();
  }, [fetchDecks, fetchDueCards]);

  return (
    <div className={`min-h-screen p-6 md:p-10 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Layers className="w-8 h-8 text-blue-500" />
              Flashcard
            </h1>
            <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Ôn tập thông minh mỗi ngày. Ghi nhớ kiến thức hiệu quả bằng Spaced Repetition.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/flashcards/quick-create')}
              className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 px-5 py-2.5 rounded-xl font-medium transition-colors border border-purple-200 dark:border-purple-800/50"
            >
              <Zap className="w-5 h-5" />
              Tạo nhanh
            </button>
            <button
              onClick={() => setIsCreatingDeck(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Tạo bộ thẻ
            </button>
          </div>
        </div>

        {/* Daily Progress Overview */}
        <div className={`p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-sm border border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-full ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
              <Brain className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Ôn tập hôm nay</h2>
              <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Bạn có <strong className="text-blue-500">{dueCards.length}</strong> thẻ cần ôn tập để duy trì trí nhớ.
              </p>
            </div>
          </div>
          
          <button 
            disabled={decks.length === 0}
            onClick={() => {
              if (dueCards.length > 0) navigate('/flashcards/session');
              else navigate('/flashcards/session?mode=all');
            }}
            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-transform active:scale-95 ${
              decks.length > 0 
                ? dueCards.length > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : isDarkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            {decks.length === 0 ? 'Chưa có thẻ' : dueCards.length > 0 ? 'Bắt đầu ôn' : 'Học tự do'}
          </button>
        </div>

        {/* Decks Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-gray-400" />
            Bộ thẻ của bạn
          </h2>
          
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : decks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {decks.map(deck => (
                <div 
                  key={deck.id}
                  onClick={() => navigate(`/flashcards/deck/${deck.id}`)}
                  className={`p-6 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${
                    isDarkMode 
                      ? 'bg-gray-800 hover:bg-gray-750 border border-gray-700' 
                      : 'bg-white hover:bg-gray-50 border border-gray-200 shadow-sm'
                  }`}
                >
                  <h3 className="text-lg font-bold line-clamp-1">{deck.name}</h3>
                  <p className={`text-sm mt-2 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {deck.description || 'Chưa có mô tả'}
                  </p>
                  
                  <div className={`mt-6 pt-4 flex justify-between items-center text-sm border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <span className="font-medium">
                      Chi tiết &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center py-20 rounded-2xl border-2 border-dashed ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-300 bg-gray-50'}`}>
              <Layers className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              <h3 className="text-lg font-medium">Chưa có bộ thẻ nào</h3>
              <p className={`mt-2 max-w-md mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Tạo bộ thẻ đầu tiên của bạn hoặc nhập thẻ từ ngân hàng câu hỏi để bắt đầu học.
              </p>
              <button
                onClick={() => setIsCreatingDeck(true)}
                className="mt-6 inline-flex items-center gap-2 bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 px-5 py-2.5 rounded-xl font-medium transition-colors dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
              >
                <Plus className="w-5 h-5" />
                Tạo Flashcard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Deck Modal */}
      {isCreatingDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Tạo Bộ thẻ mới</h3>
              <button 
                onClick={() => setIsCreatingDeck(false)}
                className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên bộ thẻ <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={newDeckName}
                  onChange={e => setNewDeckName(e.target.value)}
                  placeholder="VD: Tiếng Anh giao tiếp..."
                  autoFocus
                  className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none ${
                    isDarkMode 
                      ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-600' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Mô tả (Không bắt buộc)</label>
                <textarea 
                  value={newDeckDesc}
                  onChange={e => setNewDeckDesc(e.target.value)}
                  placeholder="Mô tả ngắn gọn về bộ thẻ này..."
                  className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 ${
                    isDarkMode 
                      ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-600' 
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                />
              </div>

              <div className="flex gap-3 mt-6 pt-2">
                <button 
                  onClick={() => setIsCreatingDeck(false)}
                  className={`flex-1 p-3 rounded-xl font-medium transition-colors ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Hủy
                </button>
                <button 
                  onClick={handleCreateDeck}
                  disabled={!newDeckName.trim() || isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Tạo ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
