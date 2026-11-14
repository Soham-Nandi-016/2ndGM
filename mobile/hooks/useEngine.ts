import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { apiClient } from '../utils/api';

export interface EngineLine {
  move: string;
  eval: number | string; // centipawns or mate string
  line: string;
}

export interface MoveAnalysis {
  ply: number;
  move: string;
  eval: number; // evaluation in centipawns
  bestMove: string;
  topLines: EngineLine[];
  cpLoss: number;
  classification: string;
}

export interface AnalysisSummary {
  accuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
}

export interface AnalysisResponse {
  gameId: string;
  moves: MoveAnalysis[];
  summary: AnalysisSummary;
}

export interface AnalyzeRequest {
  pgn: string;
  depth?: number;
}

/**
 * Hook to manage the lifecycle of a game analysis request.
 */
export function useEngine(): UseMutationResult<AnalysisResponse, Error, AnalyzeRequest> {
  return useMutation({
    mutationFn: async (payload: AnalyzeRequest) => {
      const response = await apiClient.post<AnalysisResponse>('/api/analyze', payload);
      return response.data;
    },
  });
}
