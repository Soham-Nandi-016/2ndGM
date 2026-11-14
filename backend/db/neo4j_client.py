"""
2ndGM AI Chess Lab — Neo4j Client
==================================
Handles graph database connections and query optimizations for the Opening Repertoire layer.
Nodes: (:Position {fen, eco, name})
Edges: (:Position)-[:MOVE {san, frequency, masterWinRate}]->(:Position)
"""

import os
import logging
from typing import Any

from neo4j import AsyncGraphDatabase, AsyncDriver
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("2ndGM.neo4j")

class Neo4jClient:
    """Singleton-style client for interacting with Neo4j asynchronously."""
    
    def __init__(self) -> None:
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "password")
        
        self.driver: AsyncDriver = AsyncGraphDatabase.driver(uri, auth=(user, password))

    async def close(self) -> None:
        """Closes the Neo4j driver connection."""
        await self.driver.close()
        logger.info("Neo4j connection closed.")

    async def init_db(self) -> None:
        """Initialize schema constraints (run once on startup if needed).
        
        Non-fatal: if Neo4j is unreachable or credentials are wrong the server
        still starts. Repertoire endpoints will return 503 until connectivity
        is restored; all other features (Stockfish, puzzles, telemetry) are unaffected.
        """
        query = "CREATE CONSTRAINT position_fen IF NOT EXISTS FOR (p:Position) REQUIRE p.fen IS UNIQUE"
        try:
            async with self.driver.session() as session:
                await session.run(query)
                logger.info("Neo4j constraints verified.")
        except Exception as exc:
            logger.warning(
                "⚠️  Neo4j startup check failed — repertoire features will be unavailable. "
                "Verify NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD in .env.\n"
                f"    Detail: {exc}"
            )

    async def get_variations(self, fen: str) -> list[dict[str, Any]]:
        """
        Get all known variations branching from the given FEN.
        Returns a list of dicts mapping to the edge properties and target node.
        """
        query = (
            "MATCH (n:Position {fen: $fen})-[r:MOVE]->(m:Position) "
            "RETURN r.san AS san, r.frequency AS frequency, "
            "r.masterWinRate AS masterWinRate, m.fen AS next_fen, m.name AS name "
            "ORDER BY r.frequency DESC"
        )
        async with self.driver.session() as session:
            result = await session.run(query, fen=fen)
            records = await result.data()
            return records

    async def save_move_track(self, track: list[dict[str, Any]]) -> None:
        """
        Saves a custom move track to the graph.
        `track` is expected to be a list of dicts:
        [
          { "fen_before": "...", "san": "e4", "fen_after": "...", "name": "King's Pawn Opening", "eco": "B00" },
          ...
        ]
        Uses MERGE to avoid duplicate nodes/edges.
        """
        query = """
        UNWIND $track AS move
        MERGE (p1:Position {fen: move.fen_before})
        ON CREATE SET p1.name = move.name, p1.eco = move.eco
        MERGE (p2:Position {fen: move.fen_after})
        MERGE (p1)-[r:MOVE {san: move.san}]->(p2)
        ON CREATE SET r.frequency = coalesce(move.frequency, 0.0), r.masterWinRate = coalesce(move.masterWinRate, 0.0)
        """
        async with self.driver.session() as session:
            await session.run(query, track=track)
            logger.info(f"Saved track with {len(track)} moves.")

# Global instance
neo4j_client = Neo4jClient()
