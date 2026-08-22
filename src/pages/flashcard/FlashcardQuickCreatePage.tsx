import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle, Save, Zap, X } from 'lucide-react';
import { useFlashcardStore } from '@/stores/flashcard-store';
import { useAppStore } from '@/stores/app-store';
import { flashcardRepository } from '@/services/repositories/flashcard-repository';
import toast from 'react-hot-toast';

interface ParsedCard {
  id: number;
  front: string;
  back: string;
  tags: string[];
  isValid: boolean;
  isDuplicate: boolean;
  error?: string;
}

export const FlashcardQuickCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { decks, fetchDecks } = useFlashcardStore();
  const { theme } = useAppStore();
  const isDarkMode = theme === 'dark';

  const [selectedDeckId, setSelectedDeckId] = useState<string>(location.state?.deckId || '');
  const [targetTopic, setTargetTopic] = useState<string>(location.state?.initialTopic || '');
  const [inputText, setInputText] = useState<string>('');
  const [parsedCards, setParsedCards] = useState<ParsedCard[]>([]);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedDeck = decks.find(d => d.id === selectedDeckId);
  const availableFolders = selectedDeck?.folders || [];

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  useEffect(() => {
    if (decks.length > 0 && !selectedDeckId) {
      setSelectedDeckId(decks[0].id);
    }
  }, [decks, selectedDeckId]);

  useEffect(() => {
    if (location.state?.initialTopic) {
      setTargetTopic(location.state.initialTopic);
    }
  }, [location.state?.initialTopic]);

  const handlePreview = async () => {
    if (!inputText.trim()) {
      toast.error('Vui lòng nhập dữ liệu để tạo thẻ.');
      return;
    }

    if (!selectedDeckId) {
      toast.error('Vui lòng chọn bộ thẻ (Deck).');
      return;
    }

    const lines = inputText.split('\n');
    const results: ParsedCard[] = [];
    
    // Fetch existing cards to check duplicates
    let existingCards = await flashcardRepository.getCardsByDeck(selectedDeckId);
    const existingFronts = new Set(existingCards.map(c => c.front.trim().toLowerCase()));

    let currentId = 1;
    let currentTopic = targetTopic;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      let separator = '';
      if (line.includes('\t')) separator = '\t';
      else if (line.includes('→')) separator = '→';
      else if (line.includes('|')) separator = '|';
      else if (line.includes(':')) separator = ':';
      else if (line.includes('-')) separator = '-';

      // If no separator, treat this line as a Topic/Folder for subsequent cards
      if (!separator) {
        currentTopic = line;
        continue;
      }

      // Split by first occurrence of separator
      const separatorIndex = line.indexOf(separator);
      const front = line.substring(0, separatorIndex).trim();
      const back = line.substring(separatorIndex + separator.length).trim();

      if (!front || !back) {
        results.push({
          id: currentId++,
          front,
          back,
          tags: currentTopic ? [currentTopic] : [],
          isValid: false,
          isDuplicate: false,
          error: `Dòng ${i + 1}: Thiếu nội dung Mặt trước hoặc Mặt sau.`,
        });
        continue;
      }

      const isDuplicate = existingFronts.has(front.toLowerCase());
      if (!isDuplicate) {
        existingFronts.add(front.toLowerCase());
      }

      results.push({
        id: currentId++,
        front,
        back,
        tags: currentTopic ? [currentTopic] : [],
        isValid: true,
        isDuplicate,
        error: isDuplicate ? 'Đã tồn tại thẻ với mặt trước này trong bộ.' : undefined,
      });
    }

    setParsedCards(results);
    setHasPreviewed(true);
  };

  const handleSave = async () => {
    if (!selectedDeckId) return;

    const cardsToCreate = parsedCards.filter(c => c.isValid && !c.isDuplicate);
    
    if (cardsToCreate.length === 0) {
      toast.error('Không có thẻ hợp lệ nào để tạo mới.');
      return;
    }

    setIsSaving(true);
    try {
      // Reusing createCard to ensure structure is maintained
      const promises = cardsToCreate.map(card => 
        flashcardRepository.createCard({
          deckId: selectedDeckId,
          front: card.front,
          back: card.back,
          tags: card.tags,
        })
      );
      
      await Promise.all(promises);
      toast.success(`Đã tạo thành công ${cardsToCreate.length} Flashcard!`);
      navigate(`/flashcards/deck/${selectedDeckId}`);
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi tạo thẻ.');
    } finally {
      setIsSaving(false);
    }
  };

  const validCount = parsedCards.filter(c => c.isValid && !c.isDuplicate).length;
  const duplicateCount = parsedCards.filter(c => c.isDuplicate).length;
  const errorCount = parsedCards.filter(c => !c.isValid).length;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden w-full max-w-[1800px] mx-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 shrink-0">
        <button 
          onClick={() => {
            if (selectedDeckId) {
              navigate(`/flashcards/deck/${selectedDeckId}`);
            } else {
              navigate('/flashcards');
            }
          }}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-500" />
            Tạo Flashcard Hàng Loạt
          </h1>
          <p className="text-gray-500 text-sm">Tạo hàng chục Flashcard cùng lúc bằng cách Copy & Paste</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Left Column: Input */}
        <div className={`flex flex-col p-6 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-sm border border-gray-200'} space-y-4`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Chọn bộ thẻ đích *</label>
              <select
                value={selectedDeckId}
                onChange={(e) => setSelectedDeckId(e.target.value)}
                className={`w-full px-4 py-2 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}
              >
                <option value="" disabled>-- Chọn bộ thẻ --</option>
                {decks.map(deck => (
                  <option key={deck.id} value={deck.id}>{deck.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Thư mục / Chủ đề mặc định</label>
              <select
                value={targetTopic}
                onChange={(e) => setTargetTopic(e.target.value)}
                className={`w-full px-4 py-2 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'}`}
              >
                <option value="">-- Gán vào bộ thẻ chính (Không phân thư mục) --</option>
                {availableFolders.map(f => (
                  <option key={f} value={f}>📂 {f}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-sm font-semibold mb-2 shrink-0">Dán dữ liệu vào đây</label>
            <p className="text-xs text-gray-500 mb-3 shrink-0">
              Mỗi dòng là một thẻ (phân cách bằng: <code>-</code>, <code>:</code>, <code>|</code>, <code>→</code> hoặc <strong>Tab</strong>). 
              <br/>Dòng <strong>KHÔNG</strong> có dấu phân cách sẽ được tự động nhận diện làm <span className="font-semibold text-purple-600">Chủ đề (Folder)</span> cho các thẻ bên dưới nó.
            </p>
            <textarea
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setHasPreviewed(false); // Reset preview when text changes
              }}
              placeholder={`apple - quả táo\nbook - quyển sách\nbeautiful - xinh đẹp`}
              className={`w-full flex-1 p-4 rounded-xl border font-mono text-base md:text-lg leading-relaxed focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none ${
                isDarkMode ? 'bg-gray-900 border-gray-700 placeholder-gray-600' : 'bg-white border-gray-300 placeholder-gray-400'
              }`}
            />
          </div>

          <button
            onClick={handlePreview}
            className="w-full py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/50 dark:hover:bg-purple-800 dark:text-purple-300 rounded-xl font-bold transition-colors shrink-0 mt-4"
          >
            Xem trước
          </button>
        </div>

        {/* Right Column: Preview & Stats */}
        <div className={`flex flex-col p-6 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white shadow-sm border border-gray-200'} min-h-0`}>
          <h2 className="text-lg font-bold mb-4 shrink-0">Kết quả Phân tích</h2>
          
          {!hasPreviewed ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <AlertCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>Nhấn "Xem trước" ở cột bên trái để phân tích dữ liệu</p>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 mb-4 shrink-0">
                <div className={`p-4 rounded-xl text-center border-2 ${isDarkMode ? 'bg-green-900/30 border-green-800 text-green-400' : 'bg-green-100 border-green-200 text-green-800 shadow-sm'}`}>
                  <p className="text-3xl font-bold">{validCount}</p>
                  <p className="text-sm uppercase tracking-wider font-bold mt-1 opacity-90">Hợp lệ</p>
                </div>
                <div className={`p-4 rounded-xl text-center border-2 ${isDarkMode ? 'bg-yellow-900/30 border-yellow-800 text-yellow-500' : 'bg-yellow-100 border-yellow-200 text-yellow-800 shadow-sm'}`}>
                  <p className="text-3xl font-bold">{duplicateCount}</p>
                  <p className="text-sm uppercase tracking-wider font-bold mt-1 opacity-90">Bị trùng</p>
                </div>
                <div className={`p-4 rounded-xl text-center border-2 ${isDarkMode ? 'bg-red-900/30 border-red-800 text-red-500' : 'bg-red-50 border-red-200 text-red-800 shadow-sm'}`}>
                  <p className="text-3xl font-bold">{errorCount}</p>
                  <p className="text-sm uppercase tracking-wider font-bold mt-1 opacity-90">Lỗi</p>
                </div>
              </div>

              {/* Table Preview */}
              <div className="flex-1 overflow-auto rounded-xl border-2 border-gray-200 dark:border-gray-700 mb-4 min-h-0">
                <table className="w-full text-base text-left border-collapse relative">
                  <thead className={`text-sm uppercase font-bold sticky top-0 z-10 ${isDarkMode ? 'bg-gray-900 text-gray-300 shadow-[0_1px_0_0_#374151]' : 'bg-gray-200 text-gray-800 shadow-[0_1px_0_0_#e5e7eb]'}`}>
                    <tr>
                      <th className="px-4 py-3 w-12 border border-gray-200 dark:border-gray-700">#</th>
                      <th className="px-4 py-3 w-1/4 border border-gray-200 dark:border-gray-700">Chủ đề</th>
                      <th className="px-4 py-3 w-1/4 border border-gray-200 dark:border-gray-700">Mặt trước</th>
                      <th className="px-4 py-3 w-1/4 border border-gray-200 dark:border-gray-700">Mặt sau</th>
                      <th className="px-4 py-3 border border-gray-200 dark:border-gray-700">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedCards.map((card) => (
                      <tr key={card.id} className={!card.isValid ? 'bg-red-50/80 dark:bg-red-900/20' : card.isDuplicate ? 'bg-yellow-50/80 dark:bg-yellow-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}>
                        <td className="px-4 py-4 text-gray-500 border border-gray-200 dark:border-gray-700 font-medium">{card.id}</td>
                        <td className="px-4 py-4 border border-gray-200 dark:border-gray-700">
                          {card.tags.length > 0 ? (
                            <span className="inline-block px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-md">
                              {card.tags[0]}
                            </span>
                          ) : <span className="text-gray-300 dark:text-gray-600">-</span>}
                        </td>
                        <td className="px-4 py-4 font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">{card.front}</td>
                        <td className="px-4 py-4 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">{card.back}</td>
                        <td className="px-4 py-4 border border-gray-200 dark:border-gray-700">
                          {!card.isValid ? (
                            <span className="text-red-600 text-sm font-bold flex items-center gap-1.5">
                              <X className="w-4 h-4" /> Lỗi: {card.error}
                            </span>
                          ) : card.isDuplicate ? (
                            <span className="text-yellow-700 dark:text-yellow-500 text-sm font-bold flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4" /> Bỏ qua (Trùng lặp)
                            </span>
                          ) : (
                            <span className="text-green-700 dark:text-green-500 text-sm font-bold flex items-center gap-1.5">
                              <Check className="w-4 h-4" /> Hợp lệ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {parsedCards.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-gray-500 border border-gray-200 dark:border-gray-700 text-lg">
                          Không tìm thấy dữ liệu.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Action */}
              <button
                onClick={handleSave}
                disabled={validCount === 0 || isSaving}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 shrink-0 ${
                  validCount > 0 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'Đang tạo...' : `Tạo ${validCount} Flashcard`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
