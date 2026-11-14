import random
import chess
from typing import Optional

from services.stockfish_service import StockfishService
from models.schemas import EndgameScenario, SparringMoveResponse

# ---------------------------------------------------------------------------
# Endgame FEN Library
# ---------------------------------------------------------------------------

ENDGAME_LIBRARY: list[EndgameScenario] = [
    EndgameScenario(
        id="lucena",
        name="Lucena Position",
        description="Classic Rook and Pawn endgame. White to move and win by building a bridge.",
        fen="1K6/1P6/8/8/8/8/r7/1k6 w - - 0 1",  # Standard Lucena
        targetElo=1800,
    ),
    EndgameScenario(
        id="philidor",
        name="Philidor Position",
        description="Classic Rook and Pawn endgame. Black to draw by keeping the King on the promotion square and checking from behind.",
        fen="8/8/8/8/8/1k6/1p6/1K5r w - - 0 1", # Standard Philidor
        targetElo=1500,
    ),
    EndgameScenario(
        id="kp_opposition",
        name="King + Pawn Opposition",
        description="Fundamental King and Pawn endgame. White to move and win using opposition.",
        fen="8/8/8/8/4k3/8/4P3/4K3 w - - 0 1",
        targetElo=1200,
    ),
    EndgameScenario(
        id="two_bishops",
        name="Two Bishops Mate",
        description="Force checkmate using two bishops and the king.",
        fen="8/8/8/8/4k3/8/8/4K1BB w - - 0 1",
        targetElo=1500,
    ),
]

# ---------------------------------------------------------------------------
# Elo Configuration
# ---------------------------------------------------------------------------

class EloConfig:
    def __init__(self, target_elo: int, depth: int, blunder_rate: float, use_uci_elo: bool = True):
        self.target_elo = target_elo
        self.depth = depth
        self.blunder_rate = blunder_rate
        self.use_uci_elo = use_uci_elo

ELO_MAP = {
    1200: EloConfig(1200, depth=1, blunder_rate=0.15),
    1500: EloConfig(1500, depth=3, blunder_rate=0.08),
    1800: EloConfig(1800, depth=6, blunder_rate=0.03),
    2000: EloConfig(2000, depth=10, blunder_rate=0.01),
    2200: EloConfig(2200, depth=15, blunder_rate=0.00),
    2500: EloConfig(2500, depth=20, blunder_rate=0.00, use_uci_elo=False),
}

# ---------------------------------------------------------------------------
# Sparring Service
# ---------------------------------------------------------------------------

class SparringService:
    """Handles logic for AI Sparring and Endgame drills."""
    
    def __init__(self, engine_service: StockfishService):
        self._engine = engine_service

    def get_endgames(self) -> list[EndgameScenario]:
        """Return the library of predefined endgames."""
        return ENDGAME_LIBRARY

    async def get_bot_move(self, fen: str, target_elo: int) -> SparringMoveResponse:
        """
        Calculates the bot's move based on target Elo.
        Applies UCI_LimitStrength and organic blunders if configured.
        """
        board = chess.Board(fen)
        if board.is_game_over():
            raise ValueError("Game is already over.")
        
        # Determine closest matching Elo config
        closest_elo = min(ELO_MAP.keys(), key=lambda k: abs(k - target_elo))
        config = ELO_MAP[closest_elo]

        # Engine options for UCI_LimitStrength
        options = None
        if config.use_uci_elo:
            options = {
                "UCI_LimitStrength": True,
                "UCI_Elo": config.target_elo
            }

        # Request MultiPV to allow selecting sub-optimal moves if we roll a blunder
        multi_pv_needed = 3 if config.blunder_rate > 0 else 1
        
        # Call the underlying engine
        result = await self._engine.analyse_position(
            board=board,
            depth=config.depth,
            multi_pv=multi_pv_needed,
            options=options
        )

        top_lines = result.top_lines
        if not top_lines:
            raise RuntimeError("Engine returned no moves.")

        chosen_line = top_lines[0]
        
        # Determine if we should generate an organic blunder
        if len(top_lines) > 1 and random.random() < config.blunder_rate:
            # Pick a suboptimal move (2nd or 3rd line) to simulate a human blunder
            suboptimal_index = random.randint(1, len(top_lines) - 1)
            chosen_line = top_lines[suboptimal_index]

        best_move_uci = chosen_line["move"]
        best_move = chess.Move.from_uci(best_move_uci)
        move_san = board.san(best_move)
        
        # Make the move to get the resulting FEN
        board.push(best_move)
        fen_after = board.fen()

        return SparringMoveResponse(
            moveSan=move_san,
            moveUci=best_move_uci,
            fenAfter=fen_after,
            evaluation=chosen_line["eval_display"],
        )
