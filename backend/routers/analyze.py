"""
2ndGM AI Chess Lab — /api/analyze Router
==========================================
POST /api/analyze

Accepts a PGN string, iterates every ply asynchronously via Stockfish,
classifies each move with the ΔCP engine, and returns a structured response
matching the API contract in implementation.md §Module 1.

Flow:
  1. Parse PGN → list of (board_before, move) pairs via python-chess
  2. For each ply (concurrently capped to avoid overwhelming the engine):
       a. Analyse position BEFORE move (MultiPV=N) → best move + eval
       b. Play the move on a copy → get eval AFTER
       c. Classify via classification.classify_move()
  3. Aggregate into GameSummary
  4. Return AnalyzeResponse
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Optional

import chess
import chess.pgn
import io

from fastapi import APIRouter, HTTPException, Request, status

from models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    EngineLine,
    GameSummary,
    MoveAnalysis,
    MoveClassification,
)
from services.classification import classify_move, compute_game_summary
from services.stockfish_service import EngineResult, StockfishService

logger = logging.getLogger("2ndGM.analyze")

router = APIRouter(tags=["Analysis"])

# Max concurrent Stockfish calls per game analysis.
# Keeps memory bounded on low-RAM deployments.
MAX_CONCURRENT_PLIES = 4


# ---------------------------------------------------------------------------
# PGN parsing helper
# ---------------------------------------------------------------------------

def parse_pgn(pgn_text: str) -> list[tuple[chess.Board, chess.Move]]:
    """
    Parse a PGN string into a sequence of (board_before_move, move) tuples.

    Raises:
        ValueError: If the PGN is invalid or contains no moves.
    """
    pgn_io = io.StringIO(pgn_text.strip())
    game = chess.pgn.read_game(pgn_io)

    if game is None:
        raise ValueError("Could not parse PGN — check that it is a valid PGN string.")

    plies: list[tuple[chess.Board, chess.Move]] = []
    board = game.board()

    for node in game.mainline():
        move = node.move
        if move is None:
            continue
        plies.append((board.copy(), move))
        board.push(move)

    if not plies:
        raise ValueError("PGN parsed successfully but contains no moves.")

    return plies


# ---------------------------------------------------------------------------
# Single-ply analysis coroutine
# ---------------------------------------------------------------------------

async def _analyse_ply(
    ply_index: int,
    board_before: chess.Board,
    move: chess.Move,
    engine: StockfishService,
    depth: int,
    multi_pv: int,
    semaphore: asyncio.Semaphore,
) -> MoveAnalysis:
    """
    Analyse a single ply:
      1. Get Stockfish eval BEFORE the move (for best move + top lines).
      2. Play the move, get eval AFTER.
      3. Classify with ΔCP rules.

    Returns a fully populated MoveAnalysis.
    """
    async with semaphore:
        fen_before = board_before.fen()

        # ── Eval BEFORE (to find best move and top alternatives) ────────────
        result_before: EngineResult = await engine.analyse_position(
            board_before, depth=depth, multi_pv=multi_pv
        )

        # ── Play the move and eval AFTER ─────────────────────────────────────
        board_after = board_before.copy()
        board_after.push(move)
        fen_after = board_after.fen()

        result_after: EngineResult = await engine.analyse_position(
            board_after, depth=depth, multi_pv=1
        )

        # ── Build top EngineLine objects ─────────────────────────────────────
        top_lines: list[EngineLine] = [
            EngineLine(
                move=line["move"],
                eval_cp=line["eval_cp"],
                mate_in=line["mate_in"],
                line=line["line"],
                eval_display=line["eval_display"],
            )
            for line in result_before.top_lines
        ]

        # ── Move classification ───────────────────────────────────────────────
        # eval_after from Stockfish is in the OPPONENT's frame after the move;
        # we pass raw White-perspective values and let classify_move handle it.
        classification, cp_loss = classify_move(
            board_before=board_before,
            move=move,
            eval_before_cp=result_before.eval_cp,
            eval_before_mate=result_before.mate_in,
            eval_after_cp=result_after.eval_cp,
            eval_after_mate=result_after.mate_in,
            best_eval_cp=result_before.eval_cp,   # best = what engine found before
            best_eval_mate=result_before.mate_in,
        )

        # SAN requires the board state BEFORE the move
        try:
            move_san = board_before.san(move)
        except Exception:
            move_san = move.uci()

        return MoveAnalysis(
            ply=ply_index + 1,
            move_san=move_san,
            move_uci=move.uci(),
            fen_before=fen_before,
            fen_after=fen_after,
            eval_before_cp=result_before.eval_cp,
            eval_after_cp=result_after.eval_cp,
            cp_loss=cp_loss,
            best_move=result_before.best_move_uci,
            top_lines=top_lines,
            classification=classification,
            is_book=False,
        )


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyse a complete chess game by PGN",
    description=(
        "Accepts a PGN string and returns per-move Stockfish evaluations, "
        "centipawn-loss values, move classifications (Brilliant → Blunder), "
        "and an overall accuracy summary for both players."
    ),
)
async def analyze_game(request: Request, body: AnalyzeRequest) -> AnalyzeResponse:
    """
    POST /api/analyze

    Body:
        pgn      — Full PGN string (required)
        depth    — Stockfish depth, default 20
        multi_pv — Number of principal variations, default 3

    Returns:
        AnalyzeResponse with game_id, per-move analysis, and summary stats.
    """
    # ── Retrieve the shared Stockfish singleton from app state ────────────────
    engine: Optional[StockfishService] = getattr(request.app.state, "stockfish", None)
    if engine is None:
        logger.error("StockfishService not found on app.state — lifespan may have failed.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chess engine is not available. Please try again in a moment.",
        )

    # ── Parse PGN ─────────────────────────────────────────────────────────────
    try:
        plies = parse_pgn(body.pgn)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    logger.info(
        "Starting analysis: %d plies, depth=%d, multi_pv=%d",
        len(plies), body.depth, body.multi_pv,
    )

    # ── Concurrent ply analysis (semaphore-bounded) ───────────────────────────
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_PLIES)

    tasks = [
        _analyse_ply(
            ply_index=i,
            board_before=board,
            move=move,
            engine=engine,
            depth=body.depth,
            multi_pv=body.multi_pv,
            semaphore=semaphore,
        )
        for i, (board, move) in enumerate(plies)
    ]

    try:
        move_results: list[MoveAnalysis] = await asyncio.gather(*tasks)
    except Exception as exc:
        logger.exception("Engine error during analysis: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Engine analysis failed: {exc}",
        ) from exc

    # Sort by ply number (gather preserves order, but be defensive)
    move_results.sort(key=lambda m: m.ply)

    # ── Build game summary ────────────────────────────────────────────────────
    raw_summaries = [
        {"ply": m.ply, "classification": m.classification, "cp_loss": m.cp_loss}
        for m in move_results
    ]
    summary_data = compute_game_summary(raw_summaries)
    summary = GameSummary(**summary_data)

    game_id = str(uuid.uuid4())
    logger.info(
        "Analysis complete — game_id=%s, plies=%d, accuracy W=%.1f%% B=%.1f%%",
        game_id, len(move_results),
        summary.accuracy_white, summary.accuracy_black,
    )

    return AnalyzeResponse(
        game_id=game_id,
        moves=move_results,
        summary=summary,
        depth_used=body.depth,
    )
