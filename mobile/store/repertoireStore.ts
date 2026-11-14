import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient as api } from '../utils/api';

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const STORAGE_KEY_TRACKS = '@2ndGM:repertoire:savedTracks';
const STORAGE_KEY_CACHE   = '@2ndGM:repertoire:variationsCache';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VariationItem {
  san: string;
  frequency: number;
  masterWinRate: number;
  nextFen: string;
  name: string;
}

export interface RepertoireTrackMove {
  fen_before: string;
  san: string;
  fen_after: string;
  name?: string;
  eco?: string;
  frequency?: number;
  masterWinRate?: number;
}

interface RepertoireState {
  savedTracks: RepertoireTrackMove[][];
  variationsCache: Record<string, VariationItem[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchVariations: (fen: string) => Promise<VariationItem[]>;
  saveTrack: (track: RepertoireTrackMove[]) => Promise<void>;
  loadLocalTracks: () => Promise<void>;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useRepertoireStore = create<RepertoireState>((set, get) => ({
  savedTracks: [],
  variationsCache: {},
  isLoading: false,
  error: null,

  // ── fetchVariations ──────────────────────────────────────────────────────
  // Checks the in-memory cache first, then falls back to the live backend.
  // Successful responses are persisted to AsyncStorage so subsequent app
  // launches can surface the cache before the network resolves.
  fetchVariations: async (fen: string): Promise<VariationItem[]> => {
    const { variationsCache } = get();

    // 1. In-memory hit — instant return
    if (variationsCache[fen]) {
      return variationsCache[fen];
    }

    set({ isLoading: true, error: null });

    try {
      // 2. Network fetch from live backend
      const response = await api.get(`/repertoire/variations`, { params: { fen } });
      const variations: VariationItem[] = response.data.variations ?? [];

      const updatedCache = { ...variationsCache, [fen]: variations };

      // 3. Persist updated cache to AsyncStorage for offline resilience
      try {
        await AsyncStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(updatedCache));
      } catch {
        // Non-fatal: in-memory cache is still valid
      }

      set({ variationsCache: updatedCache, isLoading: false });
      return variations;
    } catch (error: unknown) {
      // 4. Network failed — attempt to serve from stale AsyncStorage cache
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_CACHE);
        if (raw) {
          const persisted: Record<string, VariationItem[]> = JSON.parse(raw);
          if (persisted[fen]) {
            set({ variationsCache: persisted, isLoading: false });
            return persisted[fen];
          }
        }
      } catch {
        // AsyncStorage read also failed — fall through to empty array
      }

      const message = (error as Error).message ?? 'Failed to fetch variations';
      set({ error: message, isLoading: false });
      return [];
    }
  },

  // ── saveTrack ────────────────────────────────────────────────────────────
  // Persists a new repertoire track to the live backend AND writes it into
  // AsyncStorage so it survives offline sessions.
  saveTrack: async (track: RepertoireTrackMove[]): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/repertoire/track', { track });

      const updatedTracks = [...get().savedTracks, track];

      // Persist locally
      try {
        await AsyncStorage.setItem(STORAGE_KEY_TRACKS, JSON.stringify(updatedTracks));
      } catch {
        // Non-fatal
      }

      set({ savedTracks: updatedTracks, isLoading: false });
    } catch (error: unknown) {
      set({
        error: (error as Error).message ?? 'Failed to save track',
        isLoading: false,
      });
    }
  },

  // ── loadLocalTracks ──────────────────────────────────────────────────────
  // Reads persisted tracks from AsyncStorage on app launch.
  // This is called from the Repertoire tab's useEffect so the list is
  // immediately populated from the local cache while the network resolves.
  loadLocalTracks: async (): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
      // Load saved tracks
      const rawTracks = await AsyncStorage.getItem(STORAGE_KEY_TRACKS);
      const savedTracks: RepertoireTrackMove[][] = rawTracks
        ? (JSON.parse(rawTracks) as RepertoireTrackMove[][])
        : [];

      // Load variations cache
      const rawCache = await AsyncStorage.getItem(STORAGE_KEY_CACHE);
      const variationsCache: Record<string, VariationItem[]> = rawCache
        ? (JSON.parse(rawCache) as Record<string, VariationItem[]>)
        : {};

      set({ savedTracks, variationsCache, isLoading: false });
    } catch (error: unknown) {
      // AsyncStorage read failure — start with clean state rather than crashing
      set({
        savedTracks: [],
        variationsCache: {},
        error: (error as Error).message ?? 'Failed to load local tracks',
        isLoading: false,
      });
    }
  },
}));
