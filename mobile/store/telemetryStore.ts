import { create } from 'zustand';
import { apiClient as api } from '../utils/api';

export interface FatiguePoint {
  moveCount: number;
  accuracy: number;
}

export interface ChronologyPoint {
  hourOfDay: number;
  winRate: number;
  accuracy: number;
  tiltProbability: number;
}

export interface RadarPoint {
  motif: string;
  score: number;
}

export interface TelemetryData {
  fatigueCurve: FatiguePoint[];
  chronology: ChronologyPoint[];
  radarMap: RadarPoint[];
}

interface TelemetryState {
  data: TelemetryData | null;
  isLoading: boolean;
  error: string | null;
  fetchTelemetry: () => Promise<void>;
}

export const useTelemetryStore = create<TelemetryState>((set) => ({
  data: null,
  isLoading: false,
  error: null,
  fetchTelemetry: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get('/api/telemetry/dashboard');
      set({ data: response.data.data, isLoading: false });
    } catch (err: unknown) {
      console.warn("Telemetry API fetch failed, using fallback data.");
      
      const fatigueCurve = [];
      for (let i = 1; i <= 60; i += 2) {
          let acc = 95 - (i > 30 ? (i - 30) * 0.5 : 0);
          fatigueCurve.push({ moveCount: i, accuracy: acc });
      }

      const chronology = [];
      for(let i = 0; i < 24; i++) {
          chronology.push({ 
              hourOfDay: i, 
              winRate: i > 1 && i < 5 ? 0.35 : (i > 16 && i < 21 ? 0.6 : 0.5), 
              accuracy: i > 1 && i < 5 ? 75 : 88, 
              tiltProbability: i > 1 && i < 5 ? 0.8 : 0.2 
          });
      }

      const radarMap = [
          { motif: 'Pin', score: 85 }, { motif: 'Fork', score: 92 },
          { motif: 'Skewer', score: 76 }, { motif: 'Discovered', score: 65 },
          { motif: 'Deflection', score: 58 }, { motif: 'Decoy', score: 71 },
          { motif: 'Zwischenzug', score: 45 }, { motif: 'Mating Net', score: 82 }
      ];

      set({ 
          data: { fatigueCurve, chronology, radarMap }, 
          isLoading: false,
          error: "Using offline fallback data" 
      });
    }
  }
}));
