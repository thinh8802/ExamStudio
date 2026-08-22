import { db, generateId } from '../database';
import type { Flashcard, FlashcardDeck, FlashcardReview, FlashcardReviewState } from '@/types';

export const flashcardRepository = {
  // --- Decks ---
  async getDecks(): Promise<FlashcardDeck[]> {
    return await db.flashcard_decks.orderBy('updatedAt').reverse().toArray();
  },

  async getDeck(id: string): Promise<FlashcardDeck | undefined> {
    return await db.flashcard_decks.get(id);
  },

  async createDeck(deck: Omit<FlashcardDeck, 'id' | 'createdAt' | 'updatedAt'>): Promise<FlashcardDeck> {
    const now = new Date().toISOString();
    const newDeck: FlashcardDeck = {
      ...deck,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    await db.flashcard_decks.add(newDeck);
    return newDeck;
  },

  async updateDeck(id: string, updates: Partial<Omit<FlashcardDeck, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    await db.flashcard_decks.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteDeck(id: string): Promise<void> {
    await db.transaction('rw', db.flashcard_decks, db.flashcards, db.flashcard_reviews, async () => {
      // Get all cards in deck
      const cards = await db.flashcards.where('deckId').equals(id).toArray();
      const cardIds = cards.map(c => c.id);

      // Delete reviews
      await db.flashcard_reviews.where('flashcardId').anyOf(cardIds).delete();
      
      // Delete cards
      await db.flashcards.where('deckId').equals(id).delete();
      
      // Delete deck
      await db.flashcard_decks.delete(id);
    });
  },

  // --- Flashcards ---
  async getCardsByDeck(deckId: string): Promise<Flashcard[]> {
    return await db.flashcards.where('deckId').equals(deckId).toArray();
  },

  async getCard(id: string): Promise<Flashcard | undefined> {
    return await db.flashcards.get(id);
  },

  async createCard(card: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt' | 'reviewState' | 'repetitions' | 'correctStreak' | 'easeFactor' | 'interval' | 'dueAt' | 'lastReviewedAt'>): Promise<Flashcard> {
    const now = new Date().toISOString();
    const newCard: Flashcard = {
      ...card,
      id: generateId(),
      reviewState: 'new',
      repetitions: 0,
      correctStreak: 0,
      easeFactor: 2.5,
      interval: 0,
      dueAt: now, // new cards are due immediately
      lastReviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.flashcards.add(newCard);
    return newCard;
  },

  async updateCard(id: string, updates: Partial<Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    await db.flashcards.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async deleteCard(id: string): Promise<void> {
    await db.transaction('rw', db.flashcards, db.flashcard_reviews, async () => {
      await db.flashcard_reviews.where('flashcardId').equals(id).delete();
      await db.flashcards.delete(id);
    });
  },

  async recordReview(
    flashcardId: string, 
    review: Omit<FlashcardReview, 'id' | 'flashcardId' | 'reviewedAt'>
  ): Promise<FlashcardReview> {
    const now = new Date().toISOString();
    const newReview: FlashcardReview = {
      ...review,
      id: generateId(),
      flashcardId,
      reviewedAt: now,
    };
    await db.flashcard_reviews.add(newReview);
    return newReview;
  },

  // --- Queries ---
  async getDueCards(deckId?: string): Promise<Flashcard[]> {
    const now = new Date().toISOString();
    
    // Dexie doesn't have a direct "less than or equal to string" that works well across all edge cases without a composite index, 
    // but we can filter in memory since flashcard limits are usually reasonable (< 10000)
    // Or we can use where('dueAt').belowOrEqual(now)
    let query = db.flashcards.where('dueAt').belowOrEqual(now);
    
    const dueCards = await query.toArray();

    // If deckId is provided, filter manually
    if (deckId) {
      return dueCards.filter(c => c.deckId === deckId);
    }
    
    return dueCards;
  },
  
  async getDeckStats(deckId: string) {
    const cards = await this.getCardsByDeck(deckId);
    const now = new Date().toISOString();
    
    return {
      total: cards.length,
      new: cards.filter(c => c.reviewState === 'new').length,
      learning: cards.filter(c => c.reviewState === 'learning').length,
      review: cards.filter(c => c.reviewState === 'review').length,
      mastered: cards.filter(c => c.reviewState === 'mastered').length,
      due: cards.filter(c => c.dueAt && c.dueAt <= now).length,
    };
  }
};
