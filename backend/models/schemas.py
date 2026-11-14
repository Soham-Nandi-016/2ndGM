"""
2ndGM AI Chess Lab — Pydantic Schemas
=======================================
All request / response models for the FastAPI layer.
Validates at the boundary so interior services work with clean Python types.

Design rules:
  - Pydantic v2 (model_config, Field descriptors)
  - All field names match the frontend TypeScript contract from implementation.md
  - Optional fields have explicit defaults (no silent None surprises)
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Move Classification Enum
# ---------------------------------------------------------------------------

class MoveClassification(str, Enum):
    """Centipawn-delta move quality tags as defined in implementation.md §Module 1."""
    BRILLIANT = "brilliant"      # !! — sacrifice maintaining/expanding advantage
    GREAT = "great"              # !  — only move keeping advantage
    BEST = "best"                # ΔCP < 15
    EXCELLENT = "excellent"      # ΔCP < 15 (alias for near-best)
    INACCURACY = "inaccuracy"    # ?! — ΔCP ≥ 50
    MISTAKE = "mistake"          # ?  — ΔCP ≥ 100
    BLUNDER = "blunder"          # ?? — ΔCP ≥ 200 or result flip
    FORCED = "forced"            # Only legal move, not judged


# ---------------------------------------------------------------------------
# Stockfish line representation
# ---------------------------------------------------------------------------

class EngineLine(BaseModel):
    """A single principal variation returned by Stockfish."""
    move: str = Field(..., description="UCI or SAN of the first move in the line.")
    eval_cp: Optional[int] = Field(
        None,
        description="Centipawn evaluation (positive = White advantage). None when mate.",
    )
    mate_in: Optional[int] = Field(
        None,
        description="Mate-in N moves. Positive = current side mating. None when no mate.",
    )
    line: list[str] = Field(
        default_factory=list,
        description="Full PV as list of UCI move strings.",
    )
    eval_display: str = Field(
        "",
        description="Human-readable eval string, e.g. '+0.35' or 'M4'. Computed by service.",
    )


# ---------------------------------------------------------------------------
# Per-move analysis result
# ---------------------------------------------------------------------------

class MoveAnalysis(BaseModel):
    """Analysis result for a single ply (half-move)."""
    ply: int = Field(..., ge=1, description="1-indexed ply number.")
    move_san: str = Field(..., description="Move in Standard Algebraic Notation.")
    move_uci: str = Field(..., description="Move in UCI format (e.g. 'e2e4').")
    fen_before: str = Field(..., description="FEN of the position *before* this move.")
    fen_after: str = Field(..., description="FEN of the position *after* this move.")
    eval_before_cp: Optional[int] = Field(
        None,
        description="Engine evaluation (cp) of the position before the move.",
    )
    eval_after_cp: Optional[int] = Field(
        None,
        description="Engine evaluation (cp) of the position after the move.",
    )
    cp_loss: int = Field(
        0,
        ge=0,
        description=(
            "Centipawn loss = eval_before_cp − eval_after_cp (from mover's perspective). "
            "Always ≥ 0; represents quality degradation."
        ),
    )
    best_move: str = Field(
        "",
        description="Best UCI move according to Stockfish at the position before this move.",
    )
    top_lines: list[EngineLine] = Field(
        default_factory=list,
        max_length=3,
        description="Up to 3 principal variations from Stockfish (MultiPV).",
    )
    classification: MoveClassification = Field(
        MoveClassification.BEST,
        description="Move quality tag derived from ΔCP rules.",
    )
    is_book: bool = Field(
        False,
        description="True if this move is a known opening book move (future feature).",
    )


# ---------------------------------------------------------------------------
# Game summary
# ---------------------------------------------------------------------------

class GameSummary(BaseModel):
    """Aggregate statistics for a complete game analysis."""
    accuracy_white: float = Field(
        ..., ge=0.0, le=100.0,
        description="White's overall accuracy percentage (0–100).",
    )
    accuracy_black: float = Field(
        ..., ge=0.0, le=100.0,
        description="Black's overall accuracy percentage (0–100).",
    )
    blunders: int = Field(0, ge=0, description="Total blunder count (both sides combined).")
    mistakes: int = Field(0, ge=0, description="Total mistake count (both sides).")
    inaccuracies: int = Field(0, ge=0, description="Total inaccuracy count (both sides).")
    brilliant_moves: int = Field(0, ge=0, description="Total !! moves found.")
    total_plies: int = Field(0, ge=0, description="Total half-moves analysed.")


# ---------------------------------------------------------------------------
# Request model
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    """POST /api/analyze — request body."""

    pgn: str = Field(
        ...,
        min_length=5,
        description=(
            "Full PGN string of the game to analyse. "
            "Must contain at least one move."
        ),
        examples=["1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *"],
    )
    depth: int = Field(
        default=20,
        ge=1,
        le=30,
        description="Stockfish search depth per ply (1–30). Defaults to 20.",
    )
    multi_pv: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Number of principal variations to return per position (1–5).",
    )

    @model_validator(mode="after")
    def pgn_not_empty_after_strip(self) -> "AnalyzeRequest":
        if not self.pgn.strip():
            raise ValueError("pgn must not be blank or whitespace-only.")
        return self


# ---------------------------------------------------------------------------
# Response model
# ---------------------------------------------------------------------------

class AnalyzeResponse(BaseModel):
    """POST /api/analyze — response body."""

    game_id: str = Field(
        ...,
        description="Server-generated UUID for this analysis session.",
    )
    moves: list[MoveAnalysis] = Field(
        ...,
        description="Per-ply analysis results in game order.",
    )
    summary: GameSummary = Field(
        ...,
        description="Aggregated accuracy and error statistics.",
    )
    depth_used: int = Field(
        ...,
        description="Actual Stockfish depth used for this analysis.",
    )


# ---------------------------------------------------------------------------
# Generic error response (used by FastAPI exception handlers)
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    """Standard error envelope returned for 4xx / 5xx responses."""
    error: str = Field(..., description="Machine-readable error code.")
    detail: str = Field(..., description="Human-readable description of the error.")


# ---------------------------------------------------------------------------
# Coach request/response models
# ---------------------------------------------------------------------------

class CoachRequest(BaseModel):
    """POST /api/coach — request body."""
    fen: str = Field(..., description="Current board FEN.")
    last_5_moves: list[str] = Field(default_factory=list, alias="last5Moves", description="List of last 5 SAN moves.")
    stockfish_top_3: list[dict] = Field(default_factory=list, alias="stockfishTop3", description="Top 3 lines from Stockfish.")
    proposed_move: Optional[str] = Field(None, alias="proposedMove", description="User's proposed move.")
    proposed_move_eval: Optional[str] = Field(None, alias="proposedMoveEval", description="Evaluation of the proposed move.")
    themes: list[str] = Field(default_factory=list, description="Detected positional themes.")
    user_message: Optional[str] = Field(None, alias="userMessage", description="Custom question from the user.")

    class Config:
        populate_by_name = True

class CoachResponse(BaseModel):
    """POST /api/coach — response body."""
    advice: str = Field(..., description="Grandmaster-style conceptual explanation.")
    key_idea: str = Field(..., alias="keyIdea", description="One-sentence core concept.")
    warning_level: str = Field(..., alias="warningLevel", description="'caution', 'critical', or 'neutral'.")

    class Config:
        populate_by_name = True


# ---------------------------------------------------------------------------
# Repertoire request/response models
# ---------------------------------------------------------------------------

class RepertoireTrackMove(BaseModel):
    """A single edge in the repertoire track."""
    fen_before: str = Field(..., description="FEN before the move.")
    san: str = Field(..., description="SAN move played.")
    fen_after: str = Field(..., description="FEN after the move.")
    name: str = Field(default="", description="Name of the opening position.")
    eco: str = Field(default="", description="ECO code.")
    frequency: float = Field(default=0.0, description="Frequency of play.")
    master_win_rate: float = Field(default=0.0, alias="masterWinRate", description="Master win rate.")

    class Config:
        populate_by_name = True

class RepertoireTrackRequest(BaseModel):
    """POST /api/repertoire/track — request body."""
    track: list[RepertoireTrackMove] = Field(..., description="Ordered list of moves.")

class VariationItem(BaseModel):
    """A single variation choice from a given position."""
    san: str = Field(..., description="SAN move.")
    frequency: float = Field(..., description="Frequency of play.")
    master_win_rate: float = Field(..., alias="masterWinRate", description="Master win rate.")
    next_fen: str = Field(..., alias="nextFen", description="FEN resulting from this move.")
    name: str = Field(default="", description="Name of the opening resulting position.")

    class Config:
        populate_by_name = True

class VariationResponse(BaseModel):
    """GET /api/repertoire/variations — response body."""
    fen: str = Field(..., description="The queried FEN.")
    variations: list[VariationItem] = Field(..., description="List of possible variation edges.")

class VariationAnalytics(BaseModel):
    """GET /api/repertoire/analytics — response body."""
    total_positions: int = Field(..., description="Total node count.")
    total_edges: int = Field(..., description="Total edge count.")


# ---------------------------------------------------------------------------
# Puzzle request/response models
# ---------------------------------------------------------------------------

class PuzzleAttemptRequest(BaseModel):
    """POST /api/puzzles/attempt — request body."""
    puzzle_id: str = Field(..., alias="puzzleId", description="ID of the puzzle attempted.")
    success: bool = Field(..., description="Whether the puzzle was solved correctly.")
    time_taken_ms: int = Field(..., alias="timeTakenMs", description="Time taken to solve the puzzle in milliseconds.")
    
    class Config:
        populate_by_name = True

class PuzzleResponse(BaseModel):
    """GET /api/puzzles/tailored — response body."""
    id: str = Field(..., description="Unique puzzle ID.")
    fen: str = Field(..., description="Starting FEN of the puzzle.")
    solution: list[str] = Field(..., description="List of correct moves in UCI/SAN format.")
    motif: str = Field(..., description="Tactical motif tag.")
    source: str = Field(..., description="Source of the puzzle.")


# ---------------------------------------------------------------------------
# Telemetry Dashboard models
# ---------------------------------------------------------------------------

class FatiguePoint(BaseModel):
    """A data point representing accuracy at a specific move number."""
    move_count: int = Field(..., alias="moveCount", description="The move number.")
    accuracy: float = Field(..., description="Average accuracy percentage at this move number.")

    class Config:
        populate_by_name = True

class ChronologyPoint(BaseModel):
    """A data point representing performance at a specific hour of the day."""
    hour_of_day: int = Field(..., alias="hourOfDay", description="Hour of the day (0-23).")
    win_rate: float = Field(..., alias="winRate", description="Win rate during this hour.")
    accuracy: float = Field(..., description="Average accuracy during this hour.")
    tilt_probability: float = Field(..., alias="tiltProbability", description="Probability of tilting during this hour.")

    class Config:
        populate_by_name = True

class RadarPoint(BaseModel):
    """A data point representing accuracy against a specific tactical motif."""
    motif: str = Field(..., description="The tactical motif tag (e.g., 'pin', 'fork').")
    score: float = Field(..., description="Score out of 100 for this motif.")

class TelemetryData(BaseModel):
    """Aggregated telemetry data for the dashboard."""
    fatigue_curve: list[FatiguePoint] = Field(..., alias="fatigueCurve", description="Data for the Fatigue Chart.")
    chronology: list[ChronologyPoint] = Field(..., description="Data for the Chronology Chart.")
    radar_map: list[RadarPoint] = Field(..., alias="radarMap", description="Data for the Radar Map.")

    class Config:
        populate_by_name = True

class TelemetryResponse(BaseModel):
    """GET /api/telemetry/dashboard — response body."""
    data: TelemetryData = Field(..., description="Aggregated telemetry data.")


# ---------------------------------------------------------------------------
# Sparring / Endgame Lab models
# ---------------------------------------------------------------------------

class SparringMoveRequest(BaseModel):
    """POST /api/sparring/move — request body."""
    fen: str = Field(..., description="Current FEN position of the board.")
    target_elo: int = Field(..., alias="targetElo", description="Target Elo of the sparring bot.")
    
    class Config:
        populate_by_name = True

class SparringMoveResponse(BaseModel):
    """POST /api/sparring/move — response body."""
    move_san: str = Field(..., alias="moveSan", description="Bot's chosen move in SAN.")
    move_uci: str = Field(..., alias="moveUci", description="Bot's chosen move in UCI format.")
    fen_after: str = Field(..., alias="fenAfter", description="FEN of the board after the bot's move.")
    evaluation: str = Field(..., description="Human readable evaluation after the move (e.g. +1.2 or M3).")
    
    class Config:
        populate_by_name = True

class EndgameScenario(BaseModel):
    """Represents a standard endgame scenario."""
    id: str = Field(..., description="Unique identifier for the scenario.")
    name: str = Field(..., description="Name of the endgame scenario (e.g., 'Lucena Position').")
    description: str = Field(..., description="Description and goal of the scenario.")
    fen: str = Field(..., description="Starting FEN of the scenario.")
    target_elo: int = Field(..., alias="targetElo", description="Recommended Elo level to practice against.")
    
    class Config:
        populate_by_name = True
