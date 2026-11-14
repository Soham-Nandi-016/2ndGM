import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { ChessBoard } from '../../components/board/ChessBoard';
import { useChessGame } from '../../hooks/useChessGame';
import { useCombatStore } from '../../store/combatStore';
import { CoachSheet } from '../../components/coach/CoachSheet';
import axios from 'axios';
import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:8000';

export default function SparringSessionScreen() {
  const { botElo, isDefianceMode, activeEndgameId, winStreak, lossStreak, incrementWinStreak, incrementLossStreak } = useCombatStore();
  const game = useChessGame();
  
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [endgameDetails, setEndgameDetails] = useState<{name: string, description: string} | null>(null);

  // Initialize the board with the endgame or default starting position
  useEffect(() => {
    async function fetchEndgames() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/sparring/endgames`);
        const endgames = response.data;
        const targetEndgame = endgames.find((eg: { id: string; name: string; description: string; fen: string }) => eg.id === activeEndgameId);
        
        if (targetEndgame) {
          setEndgameDetails({ name: targetEndgame.name, description: targetEndgame.description });
          game.loadFen(targetEndgame.fen);
        } else {
          setEndgameDetails({ name: "Custom Sparring", description: "Standard chess position." });
          game.reset();
        }
      } catch (err) {
        console.error("Failed to load endgames", err);
      }
    }
    fetchEndgames();
  }, [activeEndgameId]);

  // React to user making a move
  useEffect(() => {
    // If it's black's turn, and game is not over, trigger bot move
    if (game.turn === 'b' && !game.isGameOver && !isBotThinking) {
      handleBotMove();
    }
    
    // Check if game over to update streaks
    if (game.isGameOver) {
      if (game.isCheckmate) {
        if (game.turn === 'b') {
          // White (user) won
          incrementWinStreak();
        } else {
          // Black (bot) won
          incrementLossStreak();
        }
      } else {
        // Draw, reset streaks?
        // Or keep as is.
      }
    }
  }, [game.fen, game.turn, game.isGameOver]);

  const handleBotMove = useCallback(async () => {
    setIsBotThinking(true);
    try {
      const targetElo = isDefianceMode ? 3200 : botElo;
      
      const response = await axios.post(`${API_BASE_URL}/api/sparring/move`, {
        fen: game.fen,
        targetElo: targetElo
      });
      
      const botMoveUci = response.data.moveUci;
      
      // We simulate tapping the squares to make the move, or we can use chess instance directly
      // Since `useChessGame` doesn't expose a direct `move(uci)` without tapping, 
      // we'll load the new FEN. 
      // A more robust implementation would add a `makeMove(uci)` to `useChessGame`.
      // Here, we load the updated FEN directly to reflect the bot's move.
      game.loadFen(response.data.fenAfter);
      
    } catch (err) {
      console.error("Failed to get bot move", err);
    } finally {
      setIsBotThinking(false);
    }
  }, [game.fen, botElo, isDefianceMode]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: isDefianceMode ? 'Defiance Mode' : 'Sparring', headerStyle: { backgroundColor: '#0D0F14' }, headerTintColor: '#F0F4FF' }} />
      
      <View style={styles.topSection}>
        <View style={styles.opponentCard}>
          <View style={styles.opponentInfo}>
            <Text style={styles.opponentName}>{isDefianceMode ? 'Stockfish MAX' : 'Sparring Bot'}</Text>
            <Text style={styles.opponentElo}>ELO: {isDefianceMode ? '3200+' : botElo}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {winStreak}</Text>
          </View>
        </View>
        
        {endgameDetails && (
          <View style={styles.endgameDetails}>
            <Text style={styles.endgameName}>{endgameDetails.name}</Text>
            <Text style={styles.endgameDesc}>{endgameDetails.description}</Text>
          </View>
        )}
      </View>

      <View style={styles.boardContainer}>
        <ChessBoard 
          boardMatrix={game.boardMatrix} 
          onSquareTap={game.handleSquareTap} 
          isInteractive={game.turn === 'w' && !isBotThinking && !game.isGameOver} 
        />
        
        {isBotThinking && (
          <View style={styles.thinkingOverlay}>
            <ActivityIndicator size="large" color="#4F9CF9" />
            <Text style={styles.thinkingText}>Bot is thinking...</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSection}>
        {game.isGameOver ? (
          <View style={styles.gameOverCard}>
            <Text style={styles.gameOverText}>
              {game.isCheckmate ? (game.turn === 'b' ? 'You Won!' : 'Bot Won') : 'Draw'}
            </Text>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.back()}>
              <Text style={styles.actionButtonText}>Exit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.coachButton}
            activeOpacity={0.9}
            onPress={() => setShowCoach(true)}
          >
            <Text style={styles.coachButtonText}>🤖 Ask AI Coach</Text>
          </TouchableOpacity>
        )}
      </View>

      {showCoach && (
        <CoachSheet 
          fen={game.fen} 
          onClose={() => setShowCoach(false)} 
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F14',
  },
  topSection: {
    padding: 20,
  },
  opponentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161A23',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3040',
  },
  opponentInfo: {},
  opponentName: {
    color: '#F0F4FF',
    fontFamily: 'Inter-Bold',
    fontSize: 18,
  },
  opponentElo: {
    color: '#F9A84F',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    marginTop: 4,
  },
  streakBadge: {
    backgroundColor: '#1E2330',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  streakText: {
    color: '#F9A84F',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  endgameDetails: {
    marginTop: 16,
    backgroundColor: '#1E2330',
    padding: 12,
    borderRadius: 8,
  },
  endgameName: {
    color: '#F0F4FF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  endgameDesc: {
    color: '#8A93A8',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 4,
  },
  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  thinkingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 15, 20, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  thinkingText: {
    color: '#F0F4FF',
    fontFamily: 'Inter-Medium',
    marginTop: 12,
  },
  bottomSection: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },
  coachButton: {
    backgroundColor: '#1E2330',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4F9CF9',
  },
  coachButtonText: {
    color: '#4F9CF9',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  gameOverCard: {
    backgroundColor: '#161A23',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A3040',
  },
  gameOverText: {
    color: '#F0F4FF',
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#4F9CF9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
});
