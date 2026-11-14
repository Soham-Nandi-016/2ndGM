import logging
from fastapi import APIRouter, HTTPException
from models.schemas import CoachRequest, CoachResponse, ErrorResponse
from services.gemini_service import GeminiService

logger = logging.getLogger("2ndGM.routers.coach")
router = APIRouter()
gemini_service = GeminiService()

@router.post(
    "/coach",
    response_model=CoachResponse,
    responses={500: {"model": ErrorResponse}},
    tags=["Coach"],
    summary="Get AI Coach Advice",
    description="Send board context to the Gemini AI Coach to receive conceptual grandmaster-style advice."
)
async def ask_coach(request: CoachRequest) -> CoachResponse:
    try:
        response = await gemini_service.generate_advice(request)
        return response
    except Exception as e:
        logger.error(f"Coach endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
