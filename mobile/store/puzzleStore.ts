/**
 * 2ndGM — puzzleStore.ts  (Production)
 * ======================================
 * Global Zustand store for puzzle state.
 *
 * Additions over the previous stub:
 *  - fetchNextPuzzle()     — calls GET /api/puzzles/tailored (live Leitner queue)
 *  - fetchBlunderPuzzles() — calls GET /api/puzzles/blunders
 *  - fetchByMotif(motif)   — calls GET /api/puzzles/tailored?motif=<motif>
 *  - submitAttempt()       — calls POST /api/puzzles/attempt and updates local stats
 *  - dueCount              — number of puzzles overdue in the queue
 *  - blunderPuzzles        — list fetched from /api/puzzles/blunders
 *  - isLoading / error     — UI state flags
 */

import { create } from 'zustand';
import { apiClient as api } from '../utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Puzzle {
  id: string;
  fen: string;
  solution: string[];
  motif: string;
  difficulty: number;
  source: string;
}

interface LeitnerStats {
  box: number;
  nextReview: string;
  consecutiveCorrect: number;
  mastered: boolean;
}

interface PuzzleState {
  activePuzzle: Puzzle | null;
  blunderPuzzles: Puzzle[];
  dueCount: number | null;
  currentMoveIndex: number;
  isSolved: boolean;
  isFailed: boolean;
  isLoading: boolean;
  error: string | null;
  leitnerStats: Record<string, LeitnerStats>;

  // Actions
  setActivePuzzle: (puzzle: Puzzle) => void;
  makeMove: (move: string) => boolean;
  resetPuzzle: () => void;
  fetchNextPuzzle: () => Promise<Puzzle | null>;
  fetchBlunderPuzzles: () => Promise<void>;
  fetchByMotif: (motif: string) => Promise<Puzzle | null>;
  submitAttempt: (puzzleId: string, success: boolean, timeTakenMs: number) => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePuzzleStore = create<PuzzleState>((set, get) => ({
  activePuzzle: null,
  blunderPuzzles: [],
  dueCount: null,
  currentMoveIndex: 0,
  isSolved: false,
  isFailed: false,
  isLoading: false,
  error: null,
  leitnerStats: {},

  // ── setActivePuzzle ─────────────────────────────────────────────────────
  setActivePuzzle: (puzzle) =>
    set({ activePuzzle: puzzle, currentMoveIndex: 0, isSolved: false, isFailed: false }),

  // ── makeMove ─────────────────────────────────────────────────────────────
  makeMove: (move) => {
    const state = get();
    if (!state.activePuzzle || state.isSolved || state.isFailed) return false;

    const expectedMove = state.activePuzzle.solution[state.currentMoveIndex];
    if (move === expectedMove) {
      const nextIndex = state.currentMoveIndex + 1;
      const solved = nextIndex >= state.activePuzzle.solution.length;
      set({ currentMoveIndex: nextIndex, isSolved: solved });
      return true;
    } else {
      set({ isFailed: true });
      return false;
    }
  },

  // ── resetPuzzle ──────────────────────────────────────────────────────────
  resetPuzzle: () => set({ currentMoveIndex: 0, isSolved: false, isFailed: false }),

  // ── fetchNextPuzzle — calls GET /api/puzzles/tailored ────────────────────
  fetchNextPuzzle: async (): Promise<Puzzle | null> => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<Puzzle>('/puzzles/tailored');
      const puzzle = response.data;
      set({
        activePuzzle: puzzle,
        currentMoveIndex: 0,
        isSolved: false,
        isFailed: false,
        isLoading: false,
      });
      return puzzle;
    } catch (err: unknown) {
      set({ error: (err as Error).message ?? 'Failed to fetch puzzle', isLoading: false });
      return null;
    }
  },

  // ── fetchBlunderPuzzles — calls GET /api/puzzles/blunders ────────────────
  fetchBlunderPuzzles: async (): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<Puzzle[]>('/puzzles/blunders');
      set({ blunderPuzzles: response.data ?? [], isLoading: false });
    } catch (err: unknown) {
      set({ error: (err as Error).message ?? 'Failed to fetch blunders', isLoading: false });
    }
  },

  // ── fetchByMotif — filters tailored endpoint by motif ────────────────────
  fetchByMotif: async (motif: string): Promise<Puzzle | null> => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<Puzzle>('/puzzles/tailored', { params: { motif } });
      const puzzle = response.data;
      set({
        activePuzzle: puzzle,
        currentMoveIndex: 0,
        isSolved: false,
        isFailed: false,
        isLoading: false,
      });
      return puzzle;
    } catch (err: unknown) {
      set({ error: (err as Error).message ?? 'Failed to fetch puzzle by motif', isLoading: false });
      return null;
    }
  },

  // ── submitAttempt — calls POST /api/puzzles/attempt ──────────────────────
  submitAttempt: async (puzzleId: string, success: boolean, timeTakenMs: number): Promise<void> => {
    try {
      const response = await api.post<{
        leitnerBox: number;
        consecutiveCorrect: number;
        mastered: boolean;
        nextReview: string;
      }>('/puzzles/attempt', {
        puzzleId,
        success,
        timeTakenMs,
      });

      const { leitnerBox, consecutiveCorrect, mastered, nextReview } = response.data;

      set((state) => ({
        leitnerStats: {
          ...state.leitnerStats,
          [puzzleId]: { box: leitnerBox, nextReview, consecutiveCorrect, mastered },
        },
      }));
    } catch {
      // Non-fatal: local game state is already updated; silently skip on network error
    }
  },

  // updateLeitnerStats kept for backward compat with any existing callers
  updateLeitnerStats: (puzzleId: string, success: boolean, nextReview: string, streak: number) =>
    set((state) => {
      const currentBox = state.leitnerStats[puzzleId]?.box ?? 0;
      const nextBox = success ? Math.min(currentBox + 1, 3) : 0;
      return {
        leitnerStats: {
          ...state.leitnerStats,
          [puzzleId]: {
            box: nextBox,
            nextReview,
            consecutiveCorrect: streak,
            mastered: nextBox >= 3,
          },
        },
      };
    }),
}));
