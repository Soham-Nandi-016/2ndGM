import { create } from 'zustand';

export interface BlunderPuzzle {
  id: string;
  fen: string;
  solution: string[];
  motif: string;
  difficulty: number;
}

export interface ClockConfig {
  whiteTimeMs: number;
  blackTimeMs: number;
  whiteIncrementMs: number;
  blackIncrementMs: number;
  hideNotation: boolean;
}

export interface ProfileState {
  // User statistics
  accuracyOverTime: { date: string; accuracy: number }[];
  blunderRate: number;
  
  // My Blunder Lab
  savedBlunders: BlunderPuzzle[];
  addBlunder: (blunder: BlunderPuzzle) => void;
  removeBlunder: (id: string) => void;

  // OTB Clock Settings
  clockConfig: ClockConfig;
  setClockConfig: (config: Partial<ClockConfig>) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  accuracyOverTime: [],
  blunderRate: 0,
  
  savedBlunders: [],
  addBlunder: (blunder) => set((state) => ({ savedBlunders: [...state.savedBlunders, blunder] })),
  removeBlunder: (id) => set((state) => ({ savedBlunders: state.savedBlunders.filter(b => b.id !== id) })),

  clockConfig: {
    whiteTimeMs: 3 * 60 * 1000,
    blackTimeMs: 3 * 60 * 1000,
    whiteIncrementMs: 2 * 1000,
    blackIncrementMs: 2 * 1000,
    hideNotation: false,
  },
  setClockConfig: (config) => set((state) => ({ clockConfig: { ...state.clockConfig, ...config } })),
}));
