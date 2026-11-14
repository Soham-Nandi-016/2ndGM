"""
2ndGM AI Chess Lab — Repertoire Router
=======================================
Endpoints for managing the Opening Repertoire Graph Layer.
Interfaces with the Neo4j client to save move tracks, query variations, and pull analytics.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import ValidationError

from models.schemas import (
    RepertoireTrackRequest,
    VariationResponse,
    VariationItem,
    VariationAnalytics,
    ErrorResponse
)
from db.neo4j_client import neo4j_client

router = APIRouter(
    prefix="/repertoire",
    tags=["Repertoire"]
)

@router.post(
    "/track",
    response_model=dict,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)
async def save_track(request: RepertoireTrackRequest) -> dict:
    """
    Saves a custom move track to the repertoire graph.
    Creates nodes and move edges for the given FEN sequence.
    """
    try:
        track_data = [move.model_dump(by_alias=True) for move in request.track]
        await neo4j_client.save_move_track(track_data)
        return {"status": "success", "message": f"Saved track with {len(track_data)} moves."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/variations",
    response_model=VariationResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)
async def get_variations(fen: str) -> VariationResponse:
    """
    Retrieves all outgoing variations from a specific FEN position.
    """
    if not fen:
        raise HTTPException(status_code=400, detail="FEN parameter is required.")
    
    try:
        records = await neo4j_client.get_variations(fen)
        variations = [
            VariationItem(
                san=record["san"],
                frequency=record["frequency"],
                masterWinRate=record["masterWinRate"],
                nextFen=record["next_fen"],
                name=record.get("name", "")
            )
            for record in records
        ]
        return VariationResponse(fen=fen, variations=variations)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/analytics",
    response_model=VariationAnalytics,
    responses={
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    }
)
async def get_analytics() -> VariationAnalytics:
    """
    Pulls basic analytics from the Neo4j database: node count and edge count.
    """
    try:
        query_nodes = "MATCH (n:Position) RETURN count(n) as total_positions"
        query_edges = "MATCH ()-[r:MOVE]->() RETURN count(r) as total_edges"
        
        async with neo4j_client.driver.session() as session:
            res_nodes = await session.run(query_nodes)
            nodes_record = await res_nodes.single()
            total_positions = nodes_record["total_positions"] if nodes_record else 0
            
            res_edges = await session.run(query_edges)
            edges_record = await res_edges.single()
            total_edges = edges_record["total_edges"] if edges_record else 0

        return VariationAnalytics(total_positions=total_positions, total_edges=total_edges)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
