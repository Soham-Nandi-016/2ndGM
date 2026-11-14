"""
2ndGM AI Chess Lab — Puzzles Router (Production)
=================================================
Live PostgreSQL-backed puzzle delivery with full Leitner spaced-repetition.

Leitner Box Schedule
--------------------
  Box 0  (new / failed)   → next review in   4 h
  Box 1  (1 correct)      → next review in  24 h
  Box 2  (2 correct)      → next review in  48 h
  Box 3  (mastered)       → next review in   7 d  (graduation)

Three consecutive correct solves in the same box advances the puzzle to Box 3
(mastered). A single failure resets to Box 0.

DB Tables expected (PostgreSQL / Supabase):
  puzzles(id TEXT PK, fen TEXT, solution TEXT[], motif TEXT,
          difficulty INT, source TEXT)
  puzzle_attempts(id SERIAL PK, puzzle_id TEXT FK→puzzles.id,
                  user_id TEXT, success BOOL, time_taken_ms INT,
                  attempted_at TIMESTAMPTZ DEFAULT now())
  puzzle_leitner(id SERIAL PK, puzzle_id TEXT UNIQUE FK→puzzles.id,
                 user_id TEXT, box INT DEFAULT 0,
                 consecutive_correct INT DEFAULT 0,
                 next_review TIMESTAMPTZ DEFAULT now())
  blunder_lab(id SERIAL PK, puzzle_id TEXT FK→puzzles.id,
              user_id TEXT, game_id TEXT, ply INT,
              saved_at TIMESTAMPTZ DEFAULT now())
"""

from __future__ import annotations

import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgres import get_db_session
from models.schemas import ErrorResponse, PuzzleAttemptRequest, PuzzleResponse

router = APIRouter(prefix="/puzzles", tags=["Puzzles"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_LEITNER_INTERVALS: dict[int, datetime.timedelta] = {
    0: datetime.timedelta(hours=4),
    1: datetime.timedelta(hours=24),
    2: datetime.timedelta(hours=48),
    3: datetime.timedelta(days=7),   # mastered — long-term retention
}

_MASTERY_BOX = 3
_MASTERY_STREAK = 3   # consecutive correct solves needed


def _next_review(box: int) -> datetime.datetime:
    interval = _LEITNER_INTERVALS.get(box, datetime.timedelta(hours=4))
    return datetime.datetime.now(tz=datetime.timezone.utc) + interval


# ---------------------------------------------------------------------------
# GET /api/puzzles/tailored
# ---------------------------------------------------------------------------

@router.get(
    "/tailored",
    response_model=PuzzleResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def get_tailored_puzzle(
    user_id: str = "default",
    db: AsyncSession = Depends(get_db_session),
) -> PuzzleResponse:
    """
    Fetch the highest-priority puzzle for this user based on live Leitner state.

    Priority order:
      1. Overdue puzzles (next_review ≤ now), lowest box first (failed first).
      2. Brand-new puzzles that have never been attempted (box = 0, no record).
    """
    now = datetime.datetime.now(tz=datetime.timezone.utc)

    # --- 1. Overdue Leitner puzzle -----------------------------------------
    row = await db.execute(
        text(
            """
            SELECT p.id, p.fen, p.solution, p.motif, p.difficulty, p.source
            FROM   puzzle_leitner  pl
            JOIN   puzzles         p  ON p.id = pl.puzzle_id
            WHERE  pl.user_id   = :uid
              AND  pl.next_review <= :now
              AND  pl.box        < :mastery_box
            ORDER BY pl.box ASC, pl.next_review ASC
            LIMIT 1
            """
        ),
        {"uid": user_id, "now": now, "mastery_box": _MASTERY_BOX},
    )
    record = row.mappings().fetchone()

    # --- 2. Fall back to a fresh puzzle with no Leitner entry ---------------
    if record is None:
        row = await db.execute(
            text(
                """
                SELECT p.id, p.fen, p.solution, p.motif, p.difficulty, p.source
                FROM   puzzles p
                WHERE  p.id NOT IN (
                    SELECT puzzle_id FROM puzzle_leitner WHERE user_id = :uid
                )
                ORDER BY p.difficulty ASC
                LIMIT 1
                """
            ),
            {"uid": user_id},
        )
        record = row.mappings().fetchone()

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="No puzzles available. All mastered or queue empty.",
        )

    return PuzzleResponse(
        id=record["id"],
        fen=record["fen"],
        solution=record["solution"],
        motif=record["motif"],
        difficulty=record["difficulty"],
        source=record["source"],
    )


# ---------------------------------------------------------------------------
# POST /api/puzzles/attempt  — log result + update Leitner state
# ---------------------------------------------------------------------------

@router.post(
    "/attempt",
    response_model=dict,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def log_puzzle_attempt(
    request: PuzzleAttemptRequest,
    user_id: str = "default",
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """
    Persist the attempt result and advance/reset the Leitner box.

    Leitner rules:
      - Correct: consecutive_correct += 1
          • If consecutive_correct >= MASTERY_STREAK → advance box (cap at Box 3)
          • next_review = now + interval[new_box]
      - Wrong:  box = 0, consecutive_correct = 0, next_review = now + 4 h
    """
    # --- 1. Record raw attempt ---------------------------------------------
    await db.execute(
        text(
            """
            INSERT INTO puzzle_attempts
                (puzzle_id, user_id, success, time_taken_ms, attempted_at)
            VALUES (:pid, :uid, :success, :ms, now())
            """
        ),
        {
            "pid": request.puzzle_id,
            "uid": user_id,
            "success": request.success,
            "ms": request.time_taken_ms,
        },
    )

    # --- 2. Upsert Leitner state -------------------------------------------
    # Fetch existing record (if any)
    row = await db.execute(
        text(
            """
            SELECT box, consecutive_correct
            FROM   puzzle_leitner
            WHERE  puzzle_id = :pid AND user_id = :uid
            """
        ),
        {"pid": request.puzzle_id, "uid": user_id},
    )
    leitner = row.mappings().fetchone()

    current_box: int = leitner["box"] if leitner else 0
    streak: int = leitner["consecutive_correct"] if leitner else 0

    if request.success:
        streak += 1
        if streak >= _MASTERY_STREAK:
            current_box = min(current_box + 1, _MASTERY_BOX)
            streak = 0          # reset streak after box promotion
    else:
        current_box = 0
        streak = 0

    review_at = _next_review(current_box)

    await db.execute(
        text(
            """
            INSERT INTO puzzle_leitner
                (puzzle_id, user_id, box, consecutive_correct, next_review)
            VALUES (:pid, :uid, :box, :streak, :review)
            ON CONFLICT (puzzle_id, user_id)
            DO UPDATE SET
                box                 = EXCLUDED.box,
                consecutive_correct = EXCLUDED.consecutive_correct,
                next_review         = EXCLUDED.next_review
            """
        ),
        {
            "pid": request.puzzle_id,
            "uid": user_id,
            "box": current_box,
            "streak": streak,
            "review": review_at,
        },
    )

    mastered = current_box >= _MASTERY_BOX
    return {
        "status": "success",
        "puzzleId": request.puzzle_id,
        "correct": request.success,
        "leitnerBox": current_box,
        "consecutiveCorrect": streak,
        "mastered": mastered,
        "nextReview": review_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# POST /api/puzzles/blunders  — save a blunder-lab position
# ---------------------------------------------------------------------------

@router.post(
    "/blunders",
    response_model=dict,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def save_blunder(
    request: dict,
    user_id: str = "default",
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """
    Save a position exactly 2 plies before a ΔCP ≥ 200 error to the
    blunder_lab collection so the user can drill it later.
    """
    puzzle_id: str = request.get("puzzleId", "")
    game_id: str = request.get("gameId", "")
    ply: int = request.get("ply", 0)

    if not puzzle_id:
        raise HTTPException(status_code=400, detail="puzzleId is required.")

    await db.execute(
        text(
            """
            INSERT INTO blunder_lab (puzzle_id, user_id, game_id, ply, saved_at)
            VALUES (:pid, :uid, :gid, :ply, now())
            ON CONFLICT DO NOTHING
            """
        ),
        {"pid": puzzle_id, "uid": user_id, "gid": game_id, "ply": ply},
    )

    return {"status": "success", "message": "Blunder saved for training.", "puzzleId": puzzle_id}


# ---------------------------------------------------------------------------
# GET /api/puzzles/blunders  — fetch user's blunder-lab positions
# ---------------------------------------------------------------------------

@router.get(
    "/blunders",
    response_model=List[PuzzleResponse],
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def get_blunder_puzzles(
    user_id: str = "default",
    db: AsyncSession = Depends(get_db_session),
) -> List[PuzzleResponse]:
    """
    Return all unsolved blunder-lab positions for this user, ordered by
    the ply they occurred at (most recent game errors first).
    """
    rows = await db.execute(
        text(
            """
            SELECT p.id, p.fen, p.solution, p.motif, p.difficulty, p.source
            FROM   blunder_lab bl
            JOIN   puzzles     p   ON p.id = bl.puzzle_id
            WHERE  bl.user_id = :uid
            ORDER  BY bl.saved_at DESC
            LIMIT  50
            """
        ),
        {"uid": user_id},
    )
    records = rows.mappings().fetchall()

    return [
        PuzzleResponse(
            id=r["id"],
            fen=r["fen"],
            solution=r["solution"],
            motif=r["motif"],
            difficulty=r["difficulty"],
            source=r["source"],
        )
        for r in records
    ]
