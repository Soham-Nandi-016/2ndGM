import chess
import chess.pgn
import io
import logging

logger = logging.getLogger("2ndGM.pgn_service")

class PGNService:
    @staticmethod
    def is_valid_fen(fen: str) -> bool:
        """Validate if a string is a valid FEN."""
        try:
            board = chess.Board(fen)
            return board.is_valid()
        except ValueError:
            return False

    @staticmethod
    def validate_solution(fen: str, solution: list[str]) -> bool:
        """Check if a sequence of UCI/SAN moves is strictly valid from a given FEN."""
        if not PGNService.is_valid_fen(fen):
            return False

        board = chess.Board(fen)
        for move_str in solution:
            try:
                move = board.parse_san(move_str) if not chess.Move.from_uci(move_str) in board.legal_moves else chess.Move.from_uci(move_str)
                if move not in board.legal_moves:
                    return False
                board.push(move)
            except ValueError:
                return False
        return True

    @staticmethod
    def extract_fen_and_moves_from_pgn(pgn_str: str) -> tuple[str, list[str]]:
        """Extract the starting FEN and moves from a PGN string."""
        pgn = io.StringIO(pgn_str)
        game = chess.pgn.read_game(pgn)
        if game is None:
            raise ValueError("Invalid PGN")
        
        board = game.board()
        moves = []
        for move in game.mainline_moves():
            moves.append(move.uci())
        return board.fen(), moves
