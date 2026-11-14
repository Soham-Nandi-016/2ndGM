import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Chess } from 'chess.js';
import * as Haptics from 'expo-haptics';

import { ChessBoard } from '../../components/board/ChessBoard';
import { useRepertoireStore } from '../../store/repertoireStore';
import { apiClient as api } from '../../utils/api';

export default function ActiveRecallTrainer() {
  const router = useRouter();
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [isProcessing, setIsProcessing] = useState(false);
  const [coachAdvice, setCoachAdvice] = useState<string | null>(null);

  const { fetchVariations } = useRepertoireStore();

  const handleMove = useCallback(async (sourceSquare: string, targetSquare: string) => {
    if (isProcessing) return;

    try {
      // Create a temporary game to validate the move
      const tempGame = new Chess(fen);
      const move = tempGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) {
        return; // Invalid move
      }

      setIsProcessing(true);

      // 1. Fetch valid variations from the repertoire for the CURRENT position
      const variations = await fetchVariations(fen);
      
      // 2. Check if the played move exists in the repertoire variations
      const matchedVariation = variations.find(v => v.san === move.san);

      if (matchedVariation) {
        // Move is correct! Apply it.
        const newGame = new Chess(fen);
        newGame.move(move);
        setGame(newGame);
        setFen(newGame.fen());
        setCoachAdvice(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Here we could automatically play the opponent's response 
        // by fetching variations for `newGame.fen()` and picking the highest frequency one
        // For demonstration, simulating a delay before the opponent plays:
        setTimeout(async () => {
          const opponentVariations = await fetchVariations(newGame.fen());
          if (opponentVariations.length > 0) {
            // Pick most frequent response
            const bestResponse = opponentVariations.reduce((prev, current) => 
              (prev.frequency > current.frequency) ? prev : current
            );
            newGame.move(bestResponse.san);
            setGame(newGame);
            setFen(newGame.fen());
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          setIsProcessing(false);
        }, 800);

      } else {
        // 3. Move is a deviation!
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        // Call the Gemini Coach API
        const payload = {
          fen: fen,
          last5Moves: game.history().slice(-5),
          stockfishTop3: [], // Would normally come from engine
          proposedMove: move.san,
          themes: ['opening_deviation']
        };

        try {
          const response = await api.post('/coach', payload);
          setCoachAdvice(response.data.advice);
        } catch (err) {
          console.error("Coach API error:", err);
          setCoachAdvice("That move is not in your repertoire, and the coach couldn't be reached.");
        }
        
        setIsProcessing(false);
      }
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  }, [fen, isProcessing, fetchVariations, game]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Active Recall', headerStyle: { backgroundColor: '#0D0F14' }, headerTintColor: '#F0F4FF' }} />
      
      <View style={styles.boardContainer}>
        {/* Placeholder for actual ChessBoard component.
            In the real app, this takes fen and onMove props. */}
        <ChessBoard fen={fen} onMove={handleMove} disabled={isProcessing} />
      </View>

      <View style={styles.infoContainer}>
        {coachAdvice ? (
          <View style={styles.coachCard}>
            <Text style={styles.coachTitle}>Coach says:</Text>
            <Text style={styles.coachText}>{coachAdvice}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => setCoachAdvice(null)}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>Your Turn</Text>
            <Text style={styles.instructionText}>
              Play your repertoire moves. The opponent will auto-respond.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F14',
  },
  boardContainer: {
    paddingTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-start',
  },
  instructionCard: {
    backgroundColor: '#161A23',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4F9CF9',
  },
  instructionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#F0F4FF',
    marginBottom: 8,
  },
  instructionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#8A93A8',
  },
  coachCard: {
    backgroundColor: '#1E2330',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F94F4F',
  },
  coachTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#F94F4F',
    marginBottom: 8,
  },
  coachText: {
    fontFamily: 'Inter-Medium',
    fontSize: 15,
    color: '#F0F4FF',
    lineHeight: 22,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2A3040',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    fontFamily: 'Inter-SemiBold',
    color: '#F0F4FF',
    fontSize: 14,
  }
});
