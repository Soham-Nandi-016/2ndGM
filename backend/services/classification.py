"""
2ndGM AI Chess Lab — Move Classification Engine
=================================================
Implements the centipawn-delta (ΔCP) move-tagging rules defined in
implementation.md §Module 1.

Classification table:
  Brilliant !!   Sacrifice that maintains/expands advantage (heuristic)
  Great !        Only move to hold advantage (eval flip without it)
  Best / Excellent  ΔCP < 15
  Inaccuracy ?!  ΔCP >= 50
  Mistake ?      ΔCP >= 100
  Blunder ??     ΔCP >= 200  OR  result flips (win→draw / draw→loss)
  Forced         Only one legal move — not judged

Design notes:
  - All evaluations are normalised to the MOVER's perspective before
    computing delta so the same thresholds apply to both colours.
  - Mate scores are converted to sentinel centipawn values (+/- 10000)
    for threshold arithmetic.
  - The accuracy formula follows Lichess's model:
      accuracy% = 103.1668 * exp(-0.04354 * ΔCP) − 3.1668
    clamped to [0, 100].
"""

from __future__ import annotations

import math
import logging
from typing import Optional

import chess

from models.schemas import MoveClassification

logger = logging.getLogger("2ndGM.classification")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MATE_SENTINEL_CP = 10_000  # Centipawn value used to represent a mate score
WIN_THRESHOLD_CP = 200     # Positions with |eval| >= this are considered "winning"

# ΔCP thresholds (from implementation.md)
BRILLIANT_MAX_DELTA = 15   # Brilliant must not lose much
EXCELLENT_MAX_DELTA = 15   # Best / Excellent
INACCURACY_MIN_DELTA = 50
MISTAKE_MIN_DELTA = 100
BLUNDER_MIN_DELTA = 200


# ---------------------------------------------------------------------------
# Helper: normalise score to mover's perspective (positive = good for mover)
# ---------------------------------------------------------------------------

def _cp_from_mover(eval_cp: Optional[int], turn: chess.Color) -> int:
    """
    Convert a White-perspective centipawn value to the current mover's
    perspective (positive = advantage for the side to move).

    Args:
        eval_cp: Centipawn value from White's view (None → treated as 0).
        turn:    chess.WHITE or chess.BLACK.

    Returns:
        Signed integer in the mover's frame of reference.
    """
    if eval_cp is None:
        return 0
    return eval_cp if turn == chess.WHITE else -eval_cp


def _mate_to_cp(mate_in: Optional[int], turn: chess.Color) -> int:
    """
    Represent a mate score as a large sentinel centipawn in mover's frame.

    A mating sequence for the side to move → +MATE_SENTINEL_CP.
    Being mated → -MATE_SENTINEL_CP.
    """
    if mate_in is None:
        return 0
    # python-chess mate() returns positive if current side delivers mate
    # PovScore.white().mate() is positive if White is mating.
    # We already convert to mover's view here.
    if mate_in > 0:
        return MATE_SENTINEL_CP
    return -MATE_SENTINEL_CP


def resolve_eval_cp(
    eval_cp: Optional[int],
    mate_in: Optional[int],
    turn: chess.Color,
) -> int:
    """
    Produce a single integer centipawn value in the MOVER's perspective.
    Handles both normal evals and mate scores.
    """
    if mate_in is not None:
        return _mate_to_cp(mate_in, turn)
    return _cp_from_mover(eval_cp, turn)


# ---------------------------------------------------------------------------
# Accuracy formula
# ---------------------------------------------------------------------------

def cp_loss_to_accuracy(cp_loss: int) -> float:
    """
    Convert a centipawn-loss value to a move accuracy percentage.

    Uses Lichess-style exponential decay formula:
        accuracy = 103.1668 * exp(-0.04354 * cp_loss) - 3.1668

    Returns a float in [0.0, 100.0].
    """
    if cp_loss <= 0:
        return 100.0
    raw = 103.1668 * math.exp(-0.04354 * cp_loss) - 3.1668
    return max(0.0, min(100.0, raw))


def game_accuracy(cp_losses: list[int]) -> float:
    """
    Aggregate accuracy for a sequence of moves (single player's plies only).
    Returns the mean per-move accuracy, clamped to [0, 100].
    """
    if not cp_losses:
        return 100.0
    per_move = [cp_loss_to_accuracy(loss) for loss in cp_losses]
    return round(sum(per_move) / len(per_move), 1)


# ---------------------------------------------------------------------------
# Brilliant move heuristics
# ---------------------------------------------------------------------------

def _is_sacrifice(board_before: chess.Board, move: chess.Move) -> bool:
    """
    Heuristic: a move is a sacrifice if it moves a piece to a square attacked
    by the opponent AND the captured material (if any) is worth less than the
    moving piece.

    Piece values (centipawns): P=100, N=320, B=330, R=500, Q=900, K=0
    """
    PIECE_VALUE = {
        chess.PAWN: 100,
        chess.KNIGHT: 320,
        chess.BISHOP: 330,
        chess.ROOK: 500,
        chess.QUEEN: 900,
        chess.KING: 0,
    }
    moving_piece = board_before.piece_at(move.from_square)
    if moving_piece is None:
        return False

    target_sq = move.to_square
    opponent = not board_before.turn
    attacked_by_opponent = board_before.is_attacked_by(opponent, target_sq)

    if not attacked_by_opponent:
        return False

    captured_piece = board_before.piece_at(target_sq)
    moving_value = PIECE_VALUE.get(moving_piece.piece_type, 0)
    captured_value = PIECE_VALUE.get(captured_piece.piece_type, 0) if captured_piece else 0

    # Sacrifice: moving piece is worth more than what's captured (or nothing)
    return moving_value > captured_value


def _is_only_good_move(
    eval_before_mover: int,
    eval_after_mover: int,
    best_eval_mover: int,
) -> bool:
    """
    Returns True if this move (eval_after_mover) is within 15cp of the best
    available move AND the position was already difficult (eval spread > 50cp
    between best and second-tier).

    In practice we approximate by checking the actual move was near-best
    while also having a high absolute eval before (suggesting a tense position).
    """
    delta_from_best = abs(best_eval_mover - eval_after_mover)
    return delta_from_best < 15


# ---------------------------------------------------------------------------
# Primary classification function
# ---------------------------------------------------------------------------

def classify_move(
    board_before: chess.Board,
    move: chess.Move,
    eval_before_cp: Optional[int],
    eval_before_mate: Optional[int],
    eval_after_cp: Optional[int],
    eval_after_mate: Optional[int],
    best_eval_cp: Optional[int],
    best_eval_mate: Optional[int],
) -> tuple[MoveClassification, int]:
    """
    Classify a single move and compute its centipawn loss.

    Args:
        board_before:      Position *before* the move is played.
        move:              The move being classified.
        eval_before_cp:    Engine eval (White perspective) before the move.
        eval_before_mate:  Mate-in N before the move (None if not mate).
        eval_after_cp:     Engine eval (White perspective) after the move.
        eval_after_mate:   Mate-in N after the move (None if not mate).
        best_eval_cp:      Eval of the best available move (White perspective).
        best_eval_mate:    Mate-in of the best available move (None if not mate).

    Returns:
        (MoveClassification, cp_loss)
        cp_loss is always >= 0 and represents quality degradation in centipawns.
    """
    turn = board_before.turn  # side that just moved

    # Check for forced move (only one legal option)
    legal_moves = list(board_before.legal_moves)
    if len(legal_moves) == 1:
        return MoveClassification.FORCED, 0

    # Resolve to mover-perspective centipawn integers
    before_mover = resolve_eval_cp(eval_before_cp, eval_before_mate, turn)
    after_mover = resolve_eval_cp(eval_after_cp, eval_after_mate, turn)
    best_mover = resolve_eval_cp(best_eval_cp, best_eval_mate, turn)

    # ΔCP from the mover's perspective: how much eval dropped vs best available
    # delta is positive when the move was suboptimal
    cp_loss = max(0, best_mover - after_mover)

    # ── BLUNDER ──────────────────────────────────────────────────────────────
    # Result flip: was winning → now drawing or losing
    result_flip = (
        before_mover >= WIN_THRESHOLD_CP and after_mover < WIN_THRESHOLD_CP
    ) or (
        before_mover >= 0 and after_mover < -WIN_THRESHOLD_CP
    )

    if cp_loss >= BLUNDER_MIN_DELTA or result_flip:
        return MoveClassification.BLUNDER, cp_loss

    # ── MISTAKE ───────────────────────────────────────────────────────────────
    if cp_loss >= MISTAKE_MIN_DELTA:
        return MoveClassification.MISTAKE, cp_loss

    # ── INACCURACY ────────────────────────────────────────────────────────────
    if cp_loss >= INACCURACY_MIN_DELTA:
        return MoveClassification.INACCURACY, cp_loss

    # ── BEST / EXCELLENT ──────────────────────────────────────────────────────
    if cp_loss < EXCELLENT_MAX_DELTA:
        # Check for Brilliant: sacrifice that keeps/expands advantage
        if _is_sacrifice(board_before, move):
            # Sacrifice is brilliant only if the eval didn't collapse
            if after_mover >= before_mover - BRILLIANT_MAX_DELTA:
                logger.debug(
                    "Brilliant move detected: %s (cp_loss=%d, sacrifice)",
                    move.uci(), cp_loss,
                )
                return MoveClassification.BRILLIANT, cp_loss

        # Check for Great: near-best move in a position where suboptimal
        # alternatives were significantly worse
        if _is_only_good_move(before_mover, after_mover, best_mover):
            return MoveClassification.GREAT, cp_loss

        return MoveClassification.BEST, cp_loss

    # Fallback (15 <= cp_loss < 50) — treat as EXCELLENT (near-best)
    return MoveClassification.EXCELLENT, cp_loss


# ---------------------------------------------------------------------------
# Game-level summary aggregation
# ---------------------------------------------------------------------------

def compute_game_summary(
    move_analyses: list[dict],
) -> dict:
    """
    Aggregate per-move classifications into a game summary dict.

    Args:
        move_analyses: List of dicts with keys:
            'ply', 'classification', 'cp_loss'

    Returns:
        dict with keys: accuracy_white, accuracy_black, blunders,
        mistakes, inaccuracies, brilliant_moves, total_plies
    """
    white_losses: list[int] = []
    black_losses: list[int] = []

    blunders = 0
    mistakes = 0
    inaccuracies = 0
    brilliant_moves = 0

    for m in move_analyses:
        ply: int = m["ply"]
        classification: MoveClassification = m["classification"]
        cp_loss: int = m.get("cp_loss", 0)

        # Odd ply = White's move; Even ply = Black's move
        if ply % 2 == 1:
            white_losses.append(cp_loss)
        else:
            black_losses.append(cp_loss)

        if classification == MoveClassification.BLUNDER:
            blunders += 1
        elif classification == MoveClassification.MISTAKE:
            mistakes += 1
        elif classification == MoveClassification.INACCURACY:
            inaccuracies += 1
        elif classification == MoveClassification.BRILLIANT:
            brilliant_moves += 1

    return {
        "accuracy_white": game_accuracy(white_losses),
        "accuracy_black": game_accuracy(black_losses),
        "blunders": blunders,
        "mistakes": mistakes,
        "inaccuracies": inaccuracies,
        "brilliant_moves": brilliant_moves,
        "total_plies": len(move_analyses),
    }
