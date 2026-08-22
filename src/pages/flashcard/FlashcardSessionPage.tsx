import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Brain, Check, X } from 'lucide-react';
import { useFlashcardStore } from '@/stores/flashcard-store';
import { useAppStore } from '@/stores/app-store';
import { calculateNextReview } from '@/services/spaced-repetition';
import { flashcardRepository } from '@/services/repositories/flashcard-repository';
import type { Flashcard, FlashcardRating } from '@/types';
import { MathRenderer } from '@/components/common/MathRenderer';

export const FlashcardSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const { deckId } = useParams<{ deckId?: string }>();
  const { dueCards, fetchDueCards, fetchAllCards } = useFlashcardStore();
  const { theme } = useAppStore();
  const isDarkMode = theme === 'dark';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCards, setSessionCards] = useState<Flashcard[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    // If cram mode is active, fetch all cards. Otherwise fetch due cards.
    if (mode === 'all') {
      fetchAllCards(deckId);
    } else {
      fetchDueCards(deckId);
    }
  }, [deckId, fetchDueCards, fetchAllCards, mode]);

  useEffect(() => {
    if (dueCards.length > 0 && sessionCards.length === 0) {
      const tag = searchParams.get('tag');
      if (tag) {
        setSessionCards(dueCards.filter(c => c.tags?.some(t => t === tag || t.startsWith(`${tag}/`))));
      } else {
        setSessionCards([...dueCards]);
      }
    }
  }, [dueCards, sessionCards.length, searchParams]);

  const currentCard = sessionCards[currentIndex];

  const handleFlip = useCallback(() => {
    if (!isFlipped) {
      setIsFlipped(true);
    }
  }, [isFlipped]);

  const handleRate = useCallback(async (rating: FlashcardRating) => {
    if (!currentCard || !isFlipped) return;

    // Calculate SM-2
    const nextState = calculateNextReview(rating, currentCard);
    const newReviewState = rating === 'again' ? 'learning' : 
                          nextState.repetitions >= 3 ? 'mastered' : 'review';

    // Update in DB
    await flashcardRepository.updateCard(currentCard.id, {
      ...nextState,
      reviewState: newReviewState,
      lastReviewedAt: new Date().toISOString(),
      correctStreak: rating === 'again' ? 0 : currentCard.correctStreak + 1,
    });

    // Record review log
    await flashcardRepository.recordReview(currentCard.id, {
      rating,
      previousInterval: currentCard.interval,
      newInterval: nextState.interval,
    });

    // Update streak UI
    if (rating === 'again' || rating === 'hard') {
      setStreak(0);
    } else {
      setStreak(s => s + 1);
    }

    // Move to next card
    setIsFlipped(false);
    
    // We use setTimeout to allow flip animation to reset
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 150);
    
  }, [currentCard, isFlipped]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (isFlipped) {
        if (e.key === '1') handleRate('again');
        if (e.key === '2') handleRate('hard');
        if (e.key === '3') handleRate('good');
        if (e.key === '4') handleRate('easy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleRate, isFlipped]);

  if (sessionCards.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold">Không có thẻ nào cần ôn tập!</h2>
          <p className="text-gray-500 mt-2 mb-6">Bạn đã hoàn thành xuất sắc mục tiêu hôm nay.</p>
          <button 
            onClick={() => navigate('/flashcards')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium"
          >
            Quay về Tổng quan
          </button>
        </div>
      </div>
    );
  }

  if (currentIndex >= sessionCards.length) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center max-w-md w-full">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Hoàn thành Phiên Ôn Tập!</h2>
          <p className="text-gray-500 mb-8">Bạn vừa học xong {sessionCards.length} thẻ.</p>
          <div className="flex gap-4 justify-center">
             <button 
                onClick={() => navigate('/flashcards')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium"
              >
                Tiếp tục
              </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-[#111827] text-white' : 'bg-[#F9FAFB] text-gray-900'}`}>
      {/* Header Minimal */}
      <header className={`px-6 py-4 flex items-center justify-between border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <button 
          onClick={() => navigate('/flashcards')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Thoát
        </button>

        <div className="flex items-center gap-6 font-medium">
          <span className="text-gray-500">
            {currentIndex + 1} / {sessionCards.length}
          </span>
          {streak > 2 && (
            <span className="flex items-center gap-1 text-orange-500 animate-pulse">
              🔥 {streak}
            </span>
          )}
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200 dark:bg-gray-800">
        <div 
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${(currentIndex / sessionCards.length) * 100}%` }}
        />
      </div>

      {/* Main Card Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 perspective-1000">
        
        {/* Flashcard Component */}
        <div 
          onClick={handleFlip}
          className={`relative w-full max-w-4xl aspect-video md:aspect-[21/9] cursor-pointer group transform-style-3d transition-transform duration-500 ease-in-out ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          {/* FRONT */}
          <div className={`absolute inset-0 backface-hidden p-8 md:p-12 flex flex-col justify-center items-center text-center rounded-3xl transition-shadow duration-300 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_rgba(0,0,0,0.6)]' 
              : 'bg-gradient-to-br from-white to-gray-50/50 border-2 border-gray-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15)]'
          }`}>
            <div className="whitespace-pre-wrap text-3xl md:text-5xl font-bold leading-tight text-center w-full text-slate-800 dark:text-slate-100 [&_p]:m-0">
              <MathRenderer text={currentCard?.front || ''} />
            </div>
            
            <div className="absolute bottom-6 opacity-40 text-sm flex items-center gap-2 group-hover:opacity-100 transition-opacity">
              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300 font-mono text-xs">Space</span>
              để lật thẻ
            </div>
          </div>

          {/* BACK */}
          <div className={`absolute inset-0 backface-hidden rotate-y-180 p-8 md:p-12 overflow-y-auto rounded-3xl transition-shadow duration-300 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-700 shadow-[0_0_30px_rgba(0,0,0,0.5)]' 
              : 'bg-gradient-to-br from-white to-gray-50/50 border-2 border-gray-200 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]'
          }`}>
            <div className="whitespace-pre-wrap text-3xl md:text-5xl font-bold leading-tight w-full flex flex-col items-center justify-center min-h-full text-center text-slate-800 dark:text-slate-100 [&_p]:m-0">
              <MathRenderer text={currentCard?.back || ''} />
            </div>
          </div>
        </div>

        {/* Rating Buttons - Only show when flipped */}
        <div className={`mt-10 transition-all duration-300 transform ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <div className="flex flex-wrap justify-center gap-4">
            <RatingButton 
              label="Không nhớ" 
              sub="1" 
              color="red"
              onClick={() => handleRate('again')} 
            />
            <RatingButton 
              label="Khó" 
              sub="2" 
              color="orange"
              onClick={() => handleRate('hard')} 
            />
            <RatingButton 
              label="Tốt" 
              sub="3" 
              color="green"
              onClick={() => handleRate('good')} 
            />
            <RatingButton 
              label="Rất dễ" 
              sub="4" 
              color="blue"
              onClick={() => handleRate('easy')} 
            />
          </div>
        </div>

      </main>
    </div>
  );
};

function RatingButton({ label, sub, color, onClick }: { label: string, sub: string, color: 'red' | 'orange' | 'green' | 'blue', onClick: () => void }) {
  const colorClasses = {
    red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/50',
    orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/50',
    green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/50',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/50',
  };

  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`px-6 py-3 rounded-xl border-2 font-semibold flex flex-col items-center gap-1 transition-transform active:scale-95 min-w-[120px] ${colorClasses[color]}`}
    >
      <span>{label}</span>
      <span className="text-xs opacity-60 font-mono bg-black/5 dark:bg-white/10 px-2 rounded">
        {sub}
      </span>
    </button>
  );
}
