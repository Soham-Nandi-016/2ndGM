"""
2ndGM AI Chess Lab — Stockfish Service
========================================
Wraps python-chess's asyncio-native engine transport.

Key design decisions:
  - Uses chess.engine.popen_uci() with asyncio transport — no blocking threads.
  - Single process reused for the full server lifetime.
  - analyse_position() is the primary public coroutine.
  - Thread-safe via asyncio.Lock.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

import chess
import chess.engine
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("2ndGM.stockfish_service")

STOCKFISH_PATH: str = os.getenv("STOCKFISH_PATH", "/usr/local/bin/stockfish")
DEFAULT_DEPTH: int = int(os.getenv("ANALYSIS_DEPTH", "20"))


class EngineResult:
    """Structured return value from a single Stockfish analysis call."""

    def __init__(
        self,
        best_move_uci: str,
        eval_cp: Optional[int],
        mate_in: Optional[int],
        eval_display: str,
        top_lines: list[dict],
    ) -> None:
        self.best_move_uci = best_move_uci
        self.eval_cp = eval_cp
        self.mate_in = mate_in
        self.eval_display = eval_display
        self.top_lines = top_lines


class StockfishService:
    """
    Asyncio-compatible Stockfish wrapper.

    Lifecycle managed by FastAPI lifespan:
        service = StockfishService()
        await service.start()
        ...
        await service.stop()
    """

    def __init__(self, path: str = STOCKFISH_PATH) -> None:
        self._path = path
        self._engine: Optional[chess.engine.UciProtocol] = None
        self._transport = None
        self._lock = asyncio.Lock()
        self._ready = False

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Spawn the Stockfish subprocess and configure UCI options."""
        if self._ready:
            return
        logger.info("Opening Stockfish at: %s", self._path)
        try:
            transport, engine = await chess.engine.popen_uci(self._path)
            self._transport = transport
            self._engine = engine
        except FileNotFoundError:
            logger.error(
                "Stockfish binary not found at '%s'. "
                "Set STOCKFISH_PATH in backend/.env.",
                self._path,
            )
            raise
        await self._engine.configure({"Threads": 2, "Hash": 128})
        self._ready = True
        logger.info("Stockfish subprocess ready.")

    async def stop(self) -> None:
        """Gracefully terminate Stockfish."""
        if self._engine and self._ready:
            try:
                await self._engine.quit()
            except Exception as exc:
                logger.warning("Error quitting Stockfish: %s", exc)
            self._ready = False
            self._engine = None
        logger.info("Stockfish stopped.")

    # ------------------------------------------------------------------
    # Core analysis
    # ------------------------------------------------------------------

    async def analyse_position(
        self,
        board: chess.Board,
        depth: int = DEFAULT_DEPTH,
        multi_pv: int = 3,
        options: Optional[dict] = None,
    ) -> EngineResult:
        """
        Analyse a position and return up to `multi_pv` principal variations.

        Args:
            board:    python-chess Board at the position to evaluate.
            depth:    Search depth in plies.
            multi_pv: Number of distinct lines to return (1-5).
            options:  Engine options to configure temporarily for this analysis.

        Returns:
            EngineResult with best move, centipawn eval, and top lines.
        """
        if not self._ready or self._engine is None:
            raise RuntimeError("StockfishService not started. Call await start() first.")

        multi_pv = max(1, min(multi_pv, 5))

        async with self._lock:
            # Apply temporary options if provided
            if options:
                await self._engine.configure(options)
            
            try:
                info_list: list[chess.engine.InfoDict] = await self._engine.analyse(
                    board,
                    limit=chess.engine.Limit(depth=depth),
                    multipv=multi_pv,
                    info=chess.engine.INFO_ALL,
                )
            finally:
                # Revert temporary options to defaults
                if options:
                    await self._engine.configure({"UCI_LimitStrength": False})

        return self._parse_info(info_list, board)

    async def get_best_move(
        self,
        board: chess.Board,
        depth: int = DEFAULT_DEPTH,
    ) -> str:
        """Return just the best UCI move string."""
        result = await self.analyse_position(board, depth=depth, multi_pv=1)
        return result.best_move_uci

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _score_to_cp_and_mate(
        score: chess.engine.PovScore,
        turn: chess.Color,
    ) -> tuple[Optional[int], Optional[int], str]:
        """Convert PovScore → (eval_cp, mate_in, display_string)."""
        white_score = score.white()
        if white_score.is_mate():
            mate_in = white_score.mate()
            display = f"M{abs(mate_in)}" if mate_in is not None else "M?"
            return None, mate_in, display
        cp_raw = white_score.score()
        if cp_raw is None:
            return None, None, "0.00"
        display = f"{'+' if cp_raw >= 0 else ''}{cp_raw / 100:.2f}"
        return cp_raw, None, display

    @classmethod
    def _parse_info(
        cls,
        info_list: list[chess.engine.InfoDict],
        board: chess.Board,
    ) -> EngineResult:
        """Transform raw Stockfish InfoDict list into EngineResult."""
        if not info_list:
            return EngineResult("", 0, None, "0.00", [])

        top_lines: list[dict] = []
        primary = info_list[0]

        for info in info_list:
            pv: list[chess.Move] = info.get("pv", [])
            score: Optional[chess.engine.PovScore] = info.get("score")
            if not pv or score is None:
                continue
            eval_cp, mate_in, eval_display = cls._score_to_cp_and_mate(score, board.turn)
            top_lines.append({
                "move": pv[0].uci(),
                "eval_cp": eval_cp,
                "mate_in": mate_in,
                "line": [m.uci() for m in pv],
                "eval_display": eval_display,
            })

        best_uci = primary["pv"][0].uci() if primary.get("pv") else ""
        p_score = primary.get("score")
        if p_score:
            p_cp, p_mate, p_disp = cls._score_to_cp_and_mate(p_score, board.turn)
        else:
            p_cp, p_mate, p_disp = 0, None, "0.00"

        return EngineResult(
            best_move_uci=best_uci,
            eval_cp=p_cp,
            mate_in=p_mate,
            eval_display=p_disp,
            top_lines=top_lines,
        )
