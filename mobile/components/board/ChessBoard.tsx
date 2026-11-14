/**
 * 2ndGM — ChessBoard.tsx
 * Touch-responsive native chessboard canvas.
 * Neo-style aesthetics: warm wood squares, electric-blue selection highlights,
 * semi-transparent legal-move dots, last-move amber glow.
 *
 * Native-only: View, Text, TouchableOpacity, Animated.
 * Zero HTML tags or onClick.
 */

import React, { useCallback } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Square } from 'chess.js';

import { useChessGame, SquareState } from '../../hooks/useChessGame';
import { Colors, FontFamily, FontSize } from '../../constants/theme';
import { ChessPiece } from './ChessPiece';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
/** Board always fills screen width for maximum piece visibility */
const BOARD_SIZE = SCREEN_WIDTH;
const SQUARE_SIZE = BOARD_SIZE / 8;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

// ─── Square Background Color ──────────────────────────────────────────────────

function getSquareBg(
  sq: SquareState,
): string {
  if (sq.isSelected) return Colors.boardHighlightSelected;
  if (sq.isLastMoveFrom || sq.isLastMoveTo) return Colors.boardHighlightLastMove;
  return sq.isLight ? Colors.boardLight : Colors.boardDark;
}

// ─── Individual Board Square ──────────────────────────────────────────────────

interface BoardSquareProps {
  squareState: SquareState;
  square: Square;
  onPress: (sq: Square) => void;
  showCoordFile?: boolean;
  showCoordRank?: boolean;
  fileLabel?: string;
  rankLabel?: string;
}

function BoardSquare({
  squareState,
  square,
  onPress,
  showCoordFile,
  showCoordRank,
  fileLabel,
  rankLabel,
}: BoardSquareProps): React.ReactElement {
  const bg = getSquareBg(squareState);
  const coordColor = squareState.isLight ? Colors.boardDark : Colors.boardLight;

  const handlePress = useCallback(() => {
    onPress(square);
  }, [onPress, square]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      accessibilityLabel={`Square ${square}${squareState.piece ? `, ${squareState.piece.color === 'w' ? 'white' : 'black'} ${squareState.piece.type}` : ''}`}
      style={[styles.square, { backgroundColor: bg }]}
    >
      {/* Legal move indicator dot */}
      {squareState.isLegalTarget && (
        <View
          style={[
            styles.legalDot,
            squareState.piece
              ? styles.legalDotCapture   // ring for capture squares
              : styles.legalDotEmpty,    // filled dot for empty squares
          ]}
          pointerEvents="none"
        />
      )}

      {/* Chess piece */}
      {squareState.piece && (
        <ChessPiece 
          type={squareState.piece.type} 
          color={squareState.piece.color} 
          size={SQUARE_SIZE} 
        />
      )}

      {/* Rank coordinate (left edge of rank) */}
      {showCoordRank && (
        <Text style={[styles.coordRank, { color: coordColor }]} allowFontScaling={false}>
          {rankLabel}
        </Text>
      )}

      {/* File coordinate (bottom edge of file) */}
      {showCoordFile && (
        <Text style={[styles.coordFile, { color: coordColor }]} allowFontScaling={false}>
          {fileLabel}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ─── ChessBoard Props ─────────────────────────────────────────────────────────

export interface ChessBoardProps {
  /**
   * If provided, the board renders this external game (controlled mode).
   * If omitted, the board manages its own internal useChessGame state.
   */
  externalGame?: ReturnType<typeof useChessGame>;
  /** Show rank/file coordinate labels around the board. Default: true. */
  showCoordinates?: boolean;
  /** Flip the board to show black at bottom. Default: false. */
  flipped?: boolean;
}

// ─── Main ChessBoard Component ────────────────────────────────────────────────

export function ChessBoard({
  externalGame,
  showCoordinates = true,
  flipped = false,
}: ChessBoardProps): React.ReactElement {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const internalGame = useChessGame();
  const game = externalGame ?? internalGame;

  const { boardMatrix, handleSquareTap, isCheck, turn } = game;

  // Flip board if needed
  const displayMatrix = flipped
    ? [...boardMatrix].reverse().map((row) => [...row].reverse())
    : boardMatrix;

  const displayRanks = flipped ? [...RANKS].reverse() : RANKS;
  const displayFiles = flipped ? [...FILES].reverse() : FILES;

  return (
    <View style={styles.wrapper}>
      {/* Check indicator ribbon */}
      {isCheck && (
        <View style={styles.checkBanner}>
          <Text style={styles.checkBannerText}>
            {turn === 'w' ? 'White' : 'Black'} King in Check!
          </Text>
        </View>
      )}

      {/* Board grid */}
      <View style={styles.board}>
        {displayMatrix.map((row, rankIdx) => (
          <View key={rankIdx} style={styles.row}>
            {row.map((sq, fileIdx) => {
              const rank = displayRanks[rankIdx];
              const file = displayFiles[fileIdx];
              const squareName = `${file}${rank}` as Square;
              return (
                <BoardSquare
                  key={squareName}
                  squareState={sq}
                  square={squareName}
                  onPress={handleSquareTap}
                  showCoordRank={showCoordinates && fileIdx === 0}
                  showCoordFile={showCoordinates && rankIdx === 7}
                  rankLabel={String(rank)}
                  fileLabel={file}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* Turn indicator */}
      <View style={styles.turnRow}>
        <View style={[styles.turnDot, { backgroundColor: turn === 'w' ? '#FFFFFF' : '#1A1A1A' }]} />
        <Text style={styles.turnLabel}>
          {turn === 'w' ? 'White' : 'Black'} to move
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    backgroundColor: Colors.background,
  },

  checkBanner: {
    width: BOARD_SIZE,
    paddingVertical: 6,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    marginBottom: 2,
  },
  checkBannerText: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.sm,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  board: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    // Subtle glow border
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },

  row: {
    flexDirection: 'row',
  },

  square: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  legalDot: {
    position: 'absolute',
    borderRadius: 999,
  },
  legalDotEmpty: {
    width: SQUARE_SIZE * 0.3,
    height: SQUARE_SIZE * 0.3,
    backgroundColor: Colors.boardLegalMoveDot,
  },
  legalDotCapture: {
    width: SQUARE_SIZE * 0.9,
    height: SQUARE_SIZE * 0.9,
    borderWidth: 4,
    borderColor: Colors.boardLegalMoveDot,
    backgroundColor: 'transparent',
  },

  coordRank: {
    position: 'absolute',
    top: 2,
    left: 3,
    fontFamily: FontFamily.interSemiBold,
    fontSize: 9,
  },
  coordFile: {
    position: 'absolute',
    bottom: 2,
    right: 3,
    fontFamily: FontFamily.interSemiBold,
    fontSize: 9,
  },

  turnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  turnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  turnLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
