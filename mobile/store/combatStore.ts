import { create } from 'zustand';

interface CombatState {
  // Sparring configuration
  botElo: number;
  isDefianceMode: boolean;
  activeEndgameId: string | null;

  // Telemetry & streaks
  winStreak: number;
  lossStreak: number;

  // Actions
  setBotElo: (elo: number) => void;
  setDefianceMode: (isDefiance: boolean) => void;
  setActiveEndgame: (id: string | null) => void;
  
  incrementWinStreak: () => void;
  incrementLossStreak: () => void;
  resetStreaks: () => void;
}

export const useCombatStore = create<CombatState>((set) => ({
  botElo: 1500, // Default to intermediate
  isDefianceMode: false,
  activeEndgameId: null,

  winStreak: 0,
  lossStreak: 0,

  setBotElo: (elo: number) => set({ botElo: elo }),
  setDefianceMode: (isDefiance: boolean) => set({ isDefianceMode: isDefiance }),
  setActiveEndgame: (id: string | null) => set({ activeEndgameId: id }),

  incrementWinStreak: () => set((state) => ({ winStreak: state.winStreak + 1, lossStreak: 0 })),
  incrementLossStreak: () => set((state) => ({ lossStreak: state.lossStreak + 1, winStreak: 0 })),
  resetStreaks: () => set({ winStreak: 0, lossStreak: 0 }),
}));
