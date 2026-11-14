import os
import json
import logging
import google.generativeai as genai
from models.schemas import CoachRequest, CoachResponse

logger = logging.getLogger("2ndGM.gemini_service")

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.warning("GEMINI_API_KEY is not set. Coach features will fail.")
        else:
            genai.configure(api_key=api_key)
        
        # We will use gemini-1.5-flash with JSON mode
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={"response_mime_type": "application/json"}
        )

    async def generate_advice(self, request: CoachRequest) -> CoachResponse:
        system_instruction = (
            "You are an elite Grandmaster chess coach. Analyze the given position and provide high-level conceptual advice. "
            "Output valid JSON matching this schema exactly:\n"
            '{"advice": "grandmaster-style conceptual explanation", "keyIdea": "one-sentence core concept", "warningLevel": "caution | critical | neutral"}'
        )
        
        prompt = (
            f"FEN: {request.fen}\n"
            f"Last 5 Moves: {', '.join(request.last_5_moves) if request.last_5_moves else 'N/A'}\n"
            f"Themes: {', '.join(request.themes) if request.themes else 'N/A'}\n"
        )
        
        if request.proposed_move:
            prompt += f"User's Proposed Move: {request.proposed_move} (Eval: {request.proposed_move_eval})\n"
            
        if request.stockfish_top_3:
            prompt += f"Engine Top Lines: {json.dumps(request.stockfish_top_3)}\n"
            
        if request.user_message:
            prompt += f"User's Question: {request.user_message}\n"
            
        try:
            response = await self.model.generate_content_async(
                contents=[{"role": "user", "parts": [system_instruction + "\n\n" + prompt]}]
            )
            data = json.loads(response.text)
            return CoachResponse(
                advice=data.get("advice", "Keep calculating carefully."),
                key_idea=data.get("keyIdea", "Focus on development and safety."),
                warning_level=data.get("warningLevel", "neutral")
            )
        except Exception as e:
            logger.error(f"Error generating advice from Gemini: {e}")
            raise Exception("Failed to generate advice from AI Coach.")
