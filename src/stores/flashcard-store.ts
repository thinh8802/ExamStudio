import { create } from 'zustand';
import { flashcardRepository } from '@/services/repositories/flashcard-repository';
import type { FlashcardDeck, Flashcard } from '@/types';

interface FlashcardState {
  decks: FlashcardDeck[];
  activeDeck: FlashcardDeck | null;
  dueCards: Flashcard[];
  
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchDecks: () => Promise<void>;
  fetchDueCards: (deckId?: string) => Promise<void>;
  fetchAllCards: (deckId?: string) => Promise<void>;
  
  createDeck: (deck: Omit<FlashcardDeck, 'id' | 'createdAt' | 'updatedAt'>) => Promise<FlashcardDeck>;
  deleteDeck: (id: string) => Promise<void>;
  
  setActiveDeck: (deck: FlashcardDeck | null) => void;
}

export const useFlashcardStore = create<FlashcardState>((set) => ({
  decks: [],
  activeDeck: null,
  dueCards: [],
  
  isLoading: false,
  error: null,

  fetchDecks: async () => {
    set({ isLoading: true, error: null });
    try {
      const decks = await flashcardRepository.getDecks();
      set({ decks, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchDueCards: async (deckId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const dueCards = await flashcardRepository.getDueCards(deckId);
      set({ dueCards, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  fetchAllCards: async (deckId?: string) => {
    set({ isLoading: true, error: null });
    try {
      let cards = [];
      if (deckId) {
        cards = await flashcardRepository.getCardsByDeck(deckId);
      } else {
        // If no deckId, just get due cards or all cards across all decks.
        // For cram mode globally, it's safer to get all cards but let's just use getDueCards for global cramming unless implemented.
        // Since we don't have a global getCards, we'll fall back to getDueCards or we can implement getAllCards.
        // Wait, for global, maybe just getting all cards is too much, but let's assume we can fetch them.
        const allDecks = await flashcardRepository.getDecks();
        const allCardsPromises = allDecks.map(d => flashcardRepository.getCardsByDeck(d.id));
        const allCardsArrays = await Promise.all(allCardsPromises);
        cards = allCardsArrays.flat();
      }
      // Shuffle the cards for free study
      cards = cards.sort(() => Math.random() - 0.5);
      set({ dueCards: cards, isLoading: false }); // Reuse dueCards state for session
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createDeck: async (deckData) => {
    set({ isLoading: true, error: null });
    try {
      const newDeck = await flashcardRepository.createDeck(deckData);
      set(state => ({
        decks: [newDeck, ...state.decks],
        isLoading: false
      }));
      return newDeck;
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  deleteDeck: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await flashcardRepository.deleteDeck(id);
      set(state => ({
        decks: state.decks.filter(d => d.id !== id),
        activeDeck: state.activeDeck?.id === id ? null : state.activeDeck,
        isLoading: false
      }));
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  setActiveDeck: (deck) => set({ activeDeck: deck }),
}));
