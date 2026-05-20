/**
 * Nexa Zustand Store — Decks, Cards, SRS, Streak
 * Persisted with AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────

export type ColorTag = 'purple' | 'pink' | 'blue';

export interface Card {
  id: string;
  front: string;
  back: string;
  interval: number;       // days until next review
  nextReview: string;     // ISO date string
  easeFactor: number;     // SM-2 ease factor
}

export interface Deck {
  id: string;
  name: string;
  icon: string;           // emoji
  colorTag: ColorTag;
  cards: Card[];
}

interface StudySession {
  date: string;           // ISO date string (YYYY-MM-DD)
  cardsStudied: number;
}

interface NexaState {
  decks: Deck[];
  streak: number;
  lastStudiedDate: string;
  totalMastered: number;
  studySessions: StudySession[];
  customApiKey: string;

  // Actions
  addDeck: (deck: Omit<Deck, 'id'>) => void;
  deleteDeck: (deckId: string) => void;
  addCardToDeck: (deckId: string, front: string, back: string) => void;
  rateCard: (deckId: string, cardId: string, rating: 'again' | 'hard' | 'easy') => void;
  recordStudySession: (cardsStudied: number) => void;
  setCustomApiKey: (key: string) => void;
  getDueCards: (deckId: string) => Card[];
  getTotalDueCards: () => number;
  getWeeklyActivity: () => number[];
  getStreakCalendar: () => boolean[];
  getDeckMastery: () => { name: string; mastery: number }[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── Default Decks (starter content) ─────────────────────

const defaultDecks: Deck[] = [
  {
    id: 'deck-welcome',
    name: 'Welcome to Nexa',
    icon: '🦉',
    colorTag: 'purple',
    cards: [
      {
        id: 'card-w1',
        front: 'What is spaced repetition?',
        back: 'A learning technique where you review information at increasing intervals to move it into long-term memory.',
        interval: 1,
        nextReview: getToday(),
        easeFactor: 2.5,
      },
      {
        id: 'card-w2',
        front: 'Who is Nexa?',
        back: 'Nexa is a wise steampunk scholar owl who guides you through your study sessions!',
        interval: 1,
        nextReview: getToday(),
        easeFactor: 2.5,
      },
      {
        id: 'card-w3',
        front: 'What do the rating buttons mean?',
        back: 'Again = forgot it (review tomorrow). Hard = struggled (review in 3 days). Easy = knew it well (review later, interval grows).',
        interval: 1,
        nextReview: getToday(),
        easeFactor: 2.5,
      },
    ],
  },
  {
    id: 'deck-science',
    name: 'Basic Science',
    icon: '🔬',
    colorTag: 'blue',
    cards: [
      {
        id: 'card-s1',
        front: 'What is the powerhouse of the cell?',
        back: 'The mitochondria — it generates most of the cell\'s supply of ATP (energy).',
        interval: 1,
        nextReview: getToday(),
        easeFactor: 2.5,
      },
      {
        id: 'card-s2',
        front: 'What is photosynthesis?',
        back: 'The process by which green plants convert sunlight into chemical energy (glucose), using CO₂ and water.',
        interval: 1,
        nextReview: getToday(),
        easeFactor: 2.5,
      },
      {
        id: 'card-s3',
        front: 'What is Newton\'s First Law?',
        back: 'An object at rest stays at rest, and an object in motion stays in motion, unless acted upon by an external force.',
        interval: 1,
        nextReview: getToday(),
        easeFactor: 2.5,
      },
      {
        id: 'card-s4',
        front: 'What is the chemical formula for water?',
        back: 'H₂O — two hydrogen atoms bonded to one oxygen atom.',
        interval: 1,
        nextReview: getToday(),
        easeFactor: 2.5,
      },
      {
        id: 'card-s5',
        front: 'What is DNA?',
        back: 'Deoxyribonucleic acid — a molecule that carries genetic instructions for the development and functioning of living organisms.',
        interval: 1,
        nextReview: getToday(),
        easeFactor: 2.5,
      },
    ],
  },
  {
    id: 'deck-vocab',
    name: 'Vocabulary Builder',
    icon: '📖',
    colorTag: 'pink',
    cards: [
      {
        id: 'card-v1',
        front: 'Ephemeral',
        back: 'Lasting for a very short time. "The ephemeral beauty of cherry blossoms."',
        interval: 1,
        nextReview: getToday(),
        easeFactor: 2.5,
      },
      {
        id: 'card-v2',
        front: 'Ubiquitous',
        back: 'Present, appearing, or found everywhere. "Smartphones have become ubiquitous."',
        interval: 1,
        nextReview: getToday(),
        easeFactor: 2.5,
      },
      {
        id: 'card-v3',
        front: 'Serendipity',
        back: 'The occurrence of events by chance in a happy or beneficial way. "Finding that book was pure serendipity."',
        interval: 1,
        nextReview: getToday(),
        easeFactor: 2.5,
      },
      {
        id: 'card-v4',
        front: 'Resilience',
        back: 'The capacity to withstand or recover quickly from difficulties; toughness.',
        interval: 1,
        nextReview: getToday(),
        easeFactor: 2.5,
      },
    ],
  },
];

// ─── Store ───────────────────────────────────────────────

export const useNexaStore = create<NexaState>()(
  persist(
    (set, get) => ({
      decks: defaultDecks,
      streak: 1,
      lastStudiedDate: getToday(),
      totalMastered: 0,
      studySessions: [{ date: getToday(), cardsStudied: 0 }],
      customApiKey: '',

      setCustomApiKey: (key) => {
        set({ customApiKey: key });
      },

      addDeck: (deckData) => {
        const newDeck: Deck = {
          ...deckData,
          id: generateId(),
        };
        set((state) => ({ decks: [...state.decks, newDeck] }));
      },

      deleteDeck: (deckId) => {
        set((state) => ({
          decks: state.decks.filter((d) => d.id !== deckId),
        }));
      },

      addCardToDeck: (deckId, front, back) => {
        const newCard: Card = {
          id: generateId(),
          front,
          back,
          interval: 1,
          nextReview: getToday(),
          easeFactor: 2.5,
        };
        set((state) => ({
          decks: state.decks.map((d) =>
            d.id === deckId ? { ...d, cards: [...d.cards, newCard] } : d
          ),
        }));
      },

      rateCard: (deckId, cardId, rating) => {
        const today = getToday();
        set((state) => {
          const decks = state.decks.map((deck) => {
            if (deck.id !== deckId) return deck;
            const cards = deck.cards.map((card) => {
              if (card.id !== cardId) return card;
              let { interval, easeFactor } = card;

              switch (rating) {
                case 'again':
                  interval = 1;
                  break;
                case 'hard':
                  interval = 3;
                  easeFactor = Math.max(1.3, easeFactor - 0.1);
                  break;
                case 'easy':
                  interval = Math.max(7, Math.round(interval * easeFactor));
                  easeFactor += 0.1;
                  break;
              }

              return {
                ...card,
                interval,
                easeFactor,
                nextReview: addDaysToDate(today, interval),
              };
            });
            return { ...deck, cards };
          });

          // Count mastered (interval >= 21 days)
          let totalMastered = 0;
          for (const deck of decks) {
            for (const card of deck.cards) {
              if (card.interval >= 21) totalMastered++;
            }
          }

          return { decks, totalMastered };
        });
      },

      recordStudySession: (cardsStudied) => {
        const today = getToday();
        const yesterday = getYesterday();

        set((state) => {
          let newStreak = state.streak;

          if (state.lastStudiedDate === today) {
            // Already studied today, streak unchanged
          } else if (state.lastStudiedDate === yesterday) {
            newStreak = state.streak + 1;
          } else {
            newStreak = 1;
          }

          // Update or add session
          const sessions = [...state.studySessions];
          const existingIdx = sessions.findIndex((s) => s.date === today);
          if (existingIdx >= 0) {
            sessions[existingIdx] = {
              ...sessions[existingIdx],
              cardsStudied: sessions[existingIdx].cardsStudied + cardsStudied,
            };
          } else {
            sessions.push({ date: today, cardsStudied });
          }

          // Keep only last 35 days
          const cutoff = getDaysAgo(35);
          const filteredSessions = sessions.filter((s) => s.date >= cutoff);

          return {
            streak: newStreak,
            lastStudiedDate: today,
            studySessions: filteredSessions,
          };
        });
      },

      getDueCards: (deckId) => {
        const today = getToday();
        const deck = get().decks.find((d) => d.id === deckId);
        if (!deck) return [];
        return deck.cards.filter((card) => card.nextReview <= today);
      },

      getTotalDueCards: () => {
        const today = getToday();
        let total = 0;
        for (const deck of get().decks) {
          for (const card of deck.cards) {
            if (card.nextReview <= today) total++;
          }
        }
        return total;
      },

      getWeeklyActivity: () => {
        const sessions = get().studySessions;
        const result: number[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = getDaysAgo(i);
          const session = sessions.find((s) => s.date === date);
          result.push(session?.cardsStudied ?? 0);
        }
        return result;
      },

      getStreakCalendar: () => {
        const sessions = get().studySessions;
        const result: boolean[] = [];
        for (let i = 29; i >= 0; i--) {
          const date = getDaysAgo(i);
          const session = sessions.find((s) => s.date === date);
          result.push((session?.cardsStudied ?? 0) > 0);
        }
        return result;
      },

      getDeckMastery: () => {
        return get().decks.map((deck) => {
          if (deck.cards.length === 0) return { name: deck.name, mastery: 0 };
          const mastered = deck.cards.filter((c) => c.interval >= 7).length;
          return {
            name: deck.name,
            mastery: Math.round((mastered / deck.cards.length) * 100),
          };
        });
      },
    }),
    {
      name: 'nexa-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
