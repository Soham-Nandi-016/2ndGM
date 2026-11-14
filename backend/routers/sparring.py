"""
2ndGM AI Chess Lab — Sparring & Endgame Lab Router
===================================================
Endpoints for playing against the Stockfish engine at various Elo levels,
and fetching standard endgame scenarios.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from models.schemas import SparringMoveRequest, SparringMoveResponse, EndgameScenario, ErrorResponse
from services.sparring_service import SparringService
from services.stockfish_service import StockfishService

router = APIRouter(
    prefix="/sparring",
    tags=["Sparring & Endgames"],
)

def get_sparring_service(request: Request) -> SparringService:
    """Dependency to inject the SparringService, tied to the global Stockfish instance."""
    stockfish: StockfishService = request.app.state.stockfish
    if not stockfish:
        raise HTTPException(status_code=503, detail="Stockfish service is not available.")
    return SparringService(engine_service=stockfish)

@router.post(
    "/move",
    response_model=SparringMoveResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}}
)
async def get_sparring_move(
    req: SparringMoveRequest,
    service: SparringService = Depends(get_sparring_service)
):
    """
    Submit a position and target Elo; the engine calculates and returns a move.
    """
    try:
        return await service.get_bot_move(fen=req.fen, target_elo=req.target_elo)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Engine error: {str(e)}")

@router.get(
    "/endgames",
    response_model=list[EndgameScenario],
)
async def get_endgames(
    service: SparringService = Depends(get_sparring_service)
):
    """
    Retrieve the library of predefined endgame scenarios.
    """
    return service.get_endgames()
