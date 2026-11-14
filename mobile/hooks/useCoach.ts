import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../utils/api';

export interface CoachRequest {
  fen: string;
  last5Moves?: string[];
  stockfishTop3?: { move: string; eval: string | number; line?: string[] }[];
  proposedMove?: string;
  proposedMoveEval?: string;
  themes?: string[];
  userMessage?: string;
}

export interface CoachResponse {
  advice: string;
  keyIdea: string;
  warningLevel: 'caution' | 'critical' | 'neutral';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  text: string;
  keyIdea?: string;
  warningLevel?: 'caution' | 'critical' | 'neutral';
  timestamp: number;
}

export function useCoach() {
  return useMutation<CoachResponse, Error, CoachRequest>({
    mutationFn: async (payload: CoachRequest) => {
      const { data } = await apiClient.post<CoachResponse>('/api/coach', payload);
      return data;
    },
  });
}
