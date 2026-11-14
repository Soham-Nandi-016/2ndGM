/**
 * 2ndGM — useChessGame
 * Custom hook wrapping chess.js to manage full game state locally.
 * Works fully offline. Zero network calls.
 * Strictly typed — no `any`.
 */

import { useCallback, useMemo, useReducer } from 'react';
import { Chess, Square, Move, Color, PieceSymbol } from 'chess.js';
import * as Haptics from 'expo-haptics';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChessPiece {
  type: PieceSymbol;
  color: Color;
}

export interface SquareState {
  piece: ChessPiece | null;
  isLight: boolean;
  isSelected: boolean;
  isLegalTarget: boolean;
  isLastMoveFrom: boolean;
  isLastMoveTo: boolean;
}

export interface GameState {
  /** Current FEN string */
  fen: string;
  /** SAN history e.g. ["e4", "e5", "Nf3"] */
  history: string[];
  /** Currently selected square (for two-tap move input) */
  selectedSquare: Square | null;
  /** Legal destination squares for the selected piece */
  legalTargets: Square[];
  /** The from-square of the last completed move */
  lastMoveFrom: Square | null;
  /** The to-square of the last completed move */
  lastMoveTo: Square | null;
  /** Side to move: 'w' | 'b' */
  turn: Color;
  isCheck: boolean;
  isCheckmate: boolean;
  isDraw: boolean;
  isGameOver: boolean;
  /** Move count (full moves) */
  moveNumber: number;
}

export interface UseChessGameReturn extends GameState {
  /** Tap a square — selects a piece or executes a staged move */
  handleSquareTap: (square: Square) => void;
  /** Load a FEN position directly */
  loadFen: (fen: string) => void;
  /** Load a full PGN string */
  loadPgn: (pgn: string) => boolean;
  /** Step forward one move (for PGN review) */
  stepForward: () => void;
  /** Step back one move (for PGN review) */
  stepBack: () => void;
  /** Reset to starting position */
  reset: () => void;
  /** Get the piece on a given square, or null */
  getPiece: (square: Square) => ChessPiece | null;
  /** All 64 square states — pre-computed for the renderer */
  boardMatrix: SquareState[][];
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SELECT_SQUARE'; square: Square; legalTargets: Square[] }
  | { type: 'DESELECT' }
  | { type: 'MOVE_MADE'; fen: string; history: string[]; from: Square; to: Square }
  | { type: 'POSITION_LOADED'; fen: string; history: string[] }
  | { type: 'RESET' };

interface InternalState {
  fen: string;
  history: string[];
  selectedSquare: Square | null;
  legalTargets: Square[];
  lastMoveFrom: Square | null;
  lastMoveTo: Square | null;
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function reducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case 'SELECT_SQUARE':
      return {
        ...state,
        selectedSquare: action.square,
        legalTargets: action.legalTargets,
      };
    case 'DESELECT':
      return { ...state, selectedSquare: null, legalTargets: [] };
    case 'MOVE_MADE':
      return {
        ...state,
        fen: action.fen,
        history: action.history,
        selectedSquare: null,
        legalTargets: [],
        lastMoveFrom: action.from,
        lastMoveTo: action.to,
      };
    case 'POSITION_LOADED':
      return {
        ...state,
        fen: action.fen,
        history: action.history,
        selectedSquare: null,
        legalTargets: [],
        lastMoveFrom: null,
        lastMoveTo: null,
      };
    case 'RESET':
      return {
        fen: INITIAL_FEN,
        history: [],
        selectedSquare: null,
        legalTargets: [],
        lastMoveFrom: null,
        lastMoveTo: null,
      };
    default:
      return state;
  }
}

// ─── Board Matrix Builder ─────────────────────────────────────────────────────

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

function buildBoardMatrix(
  chess: Chess,
  selectedSquare: Square | null,
  legalTargets: Square[],
  lastMoveFrom: Square | null,
  lastMoveTo: Square | null,
): SquareState[][] {
  return RANKS.map((rank, rankIdx) =>
    FILES.map((file, fileIdx) => {
      const sq = `${file}${rank}` as Square;
      const rawPiece = chess.get(sq);
      return {
        piece: rawPiece ? { type: rawPiece.type, color: rawPiece.color } : null,
        isLight: (rankIdx + fileIdx) % 2 === 0,
        isSelected: selectedSquare === sq,
        isLegalTarget: legalTargets.includes(sq),
        isLastMoveFrom: lastMoveFrom === sq,
        isLastMoveTo: lastMoveTo === sq,
      };
    }),
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChessGame(): UseChessGameReturn {
  // chess.js instance persisted via ref-like useMemo (stable across renders)
  const chess = useMemo(() => new Chess(), []);

  const [state, dispatch] = useReducer(reducer, {
    fen: INITIAL_FEN,
    history: [],
    selectedSquare: null,
    legalTargets: [],
    lastMoveFrom: null,
    lastMoveTo: null,
  });

  // ── Derived game flags from FEN ──
  const turn = chess.turn();
  const isCheck = chess.inCheck();
  const isCheckmate = chess.isCheckmate();
  const isDraw = chess.isDraw();
  const isGameOver = chess.isGameOver();
  const moveNumber = Math.floor(state.history.length / 2) + 1;

  // ── Board matrix (re-computed only when fen/selection changes) ──
  const boardMatrix = useMemo(
    () =>
      buildBoardMatrix(
        chess,
        state.selectedSquare,
        state.legalTargets,
        state.lastMoveFrom,
        state.lastMoveTo,
      ),
    [chess, state.selectedSquare, state.legalTargets, state.lastMoveFrom, state.lastMoveTo, state.fen],
  );

  // ── Tap handler (two-tap move input) ──
  const handleSquareTap = useCallback(
    (square: Square) => {
      if (chess.isGameOver()) return;

      const tappedPiece = chess.get(square);

      // If a piece is already selected
      if (state.selectedSquare) {
        // Tapped a legal target → execute move
        if (state.legalTargets.includes(square)) {
          // Promotion: default to queen for now
          const moveConfig: { from: Square; to: Square; promotion?: PieceSymbol } = {
            from: state.selectedSquare,
            to: square,
          };
          const isPawnPromotion =
            tappedPiece === null &&
            chess.get(state.selectedSquare)?.type === 'p' &&
            (square[1] === '8' || square[1] === '1');
          if (isPawnPromotion) moveConfig.promotion = 'q';

          const result: Move | null = chess.move(moveConfig);
          if (result) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            dispatch({
              type: 'MOVE_MADE',
              fen: chess.fen(),
              history: chess.history(),
              from: result.from,
              to: result.to,
            });
          }
          return;
        }

        // Tapped own piece → switch selection
        if (tappedPiece && tappedPiece.color === chess.turn()) {
          const moves = chess.moves({ square, verbose: true }) as Move[];
          dispatch({
            type: 'SELECT_SQUARE',
            square,
            legalTargets: moves.map((m) => m.to),
          });
          return;
        }

        // Tapped empty or enemy (not legal) → deselect
        dispatch({ type: 'DESELECT' });
        return;
      }

      // Nothing selected yet — select own piece
      if (tappedPiece && tappedPiece.color === chess.turn()) {
        void Haptics.selectionAsync();
        const moves = chess.moves({ square, verbose: true }) as Move[];
        dispatch({
          type: 'SELECT_SQUARE',
          square,
          legalTargets: moves.map((m) => m.to),
        });
      }
    },
    [chess, state.selectedSquare, state.legalTargets],
  );

  const loadFen = useCallback(
    (fen: string) => {
      chess.load(fen);
      dispatch({
        type: 'POSITION_LOADED',
        fen: chess.fen(),
        history: chess.history(),
      });
    },
    [chess],
  );

  const loadPgn = useCallback(
    (pgn: string): boolean => {
      try {
        chess.loadPgn(pgn);
        dispatch({
          type: 'POSITION_LOADED',
          fen: chess.fen(),
          history: chess.history(),
        });
        return true;
      } catch {
        return false;
      }
    },
    [chess],
  );

  const stepForward = useCallback(() => {
    // Re-play from history — chess.js doesn't have a native "forward" in review mode
    // We manage a cursor externally; this hook provides the mechanism.
    // For now: no-op placeholder — wired up in analyzer screen.
  }, []);

  const stepBack = useCallback(() => {
    chess.undo();
    dispatch({
      type: 'POSITION_LOADED',
      fen: chess.fen(),
      history: chess.history(),
    });
  }, [chess]);

  const reset = useCallback(() => {
    chess.reset();
    dispatch({ type: 'RESET' });
  }, [chess]);

  const getPiece = useCallback(
    (square: Square): ChessPiece | null => {
      const p = chess.get(square);
      return p ? { type: p.type, color: p.color } : null;
    },
    [chess, state.fen],
  );

  return {
    fen: state.fen,
    history: state.history,
    selectedSquare: state.selectedSquare,
    legalTargets: state.legalTargets,
    lastMoveFrom: state.lastMoveFrom,
    lastMoveTo: state.lastMoveTo,
    turn,
    isCheck,
    isCheckmate,
    isDraw,
    isGameOver,
    moveNumber,
    handleSquareTap,
    loadFen,
    loadPgn,
    stepForward,
    stepBack,
    reset,
    getPiece,
    boardMatrix,
  };
}
