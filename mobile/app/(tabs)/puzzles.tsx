/**
 * 2ndGM — Puzzles Tab  (Production)
 * ====================================
 * Fetches puzzle queue and blunder-lab positions from the live backend state
 * stores (puzzleStore → /api/puzzles/tailored & /api/puzzles/blunders).
 *
 * What changed from mock:
 *  - START TRAINER button fetches the next due puzzle via puzzleStore.fetchNextPuzzle()
 *    (which calls the live /api/puzzles/tailored endpoint with Leitner state).
 *  - "Due for review" count is read from the live puzzleStore.dueCount field.
 *  - Blunder Lab section is populated from puzzleStore.blunderPuzzles
 *    (which calls /api/puzzles/blunders on mount).
 *  - Motif filter chips call puzzleStore.fetchByMotif(motif) to refine the queue.
 *  - Loading and error states are surfaced in the UI.
 *
 * Native-only: View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList.
 */

import React, { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { PuzzleCard } from '../../components/puzzles/PuzzleCard';
import { usePuzzleStore } from '../../store/puzzleStore';
import { useCombatStore } from '../../store/combatStore';

// ─── Motif chip list mirrors implementation.md §Module 4 ──────────────────────
const MOTIFS = ['fork', 'pin', 'skewer', 'deflection', 'decoy'];

// ─── Endgame matrix drills ────────────────────────────────────────────────────
const ENDGAME_MATRICES = [
  { label: 'Lucena Position',  id: 'lucena' },
  { label: 'Philidor Position', id: 'philidor' },
  { label: 'K+P Opposition',   id: 'kp_opposition' },
  { label: 'Two Bishops',      id: 'two_bishops' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PuzzlesTab() {
  const {
    activePuzzle,
    blunderPuzzles,
    dueCount,
    isLoading,
    error,
    fetchNextPuzzle,
    fetchBlunderPuzzles,
    fetchByMotif,
    setActivePuzzle,
  } = usePuzzleStore();

  const { setDefianceMode, setActiveEndgame } = useCombatStore();

  // ── On mount: load blunder-lab positions from live backend ────────────────
  useEffect(() => {
    fetchBlunderPuzzles();
  }, [fetchBlunderPuzzles]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStartTrainer = useCallback(async () => {
    const puzzle = await fetchNextPuzzle();
    if (puzzle) {
      setActivePuzzle(puzzle);
      router.push('/puzzle-board');
    }
  }, [fetchNextPuzzle, setActivePuzzle]);

  const handleMotifSelect = useCallback(
    async (motif: string) => {
      await fetchByMotif(motif);
      router.push('/puzzle-board');
    },
    [fetchByMotif],
  );

  const handleStartDefiance = useCallback(() => {
    setDefianceMode(true);
    setActiveEndgame('lucena');
    router.push('/combat/sparring-session');
  }, [setDefianceMode, setActiveEndgame]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Tactical Engine</Text>
        <Text style={styles.subtitle}>Spaced-Repetition Trainer</Text>
      </View>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ── Start Trainer CTA (live dueCount from backend Leitner state) ──── */}
      <TouchableOpacity
        style={styles.trainerButton}
        activeOpacity={0.9}
        onPress={handleStartTrainer}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel={`Start trainer — ${dueCount} puzzles due for review`}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" style={styles.loader} />
        ) : (
          <>
            <Text style={styles.trainerButtonText}>START TRAINER</Text>
            <Text style={styles.trainerButtonSubtext}>
              Due for review: {dueCount ?? '…'} puzzles
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* ── Endgame Library ───────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Endgame Library</Text>

        <TouchableOpacity
          style={[styles.trainerButton, styles.defianceButton]}
          activeOpacity={0.9}
          onPress={handleStartDefiance}
          accessibilityRole="button"
          accessibilityLabel="Engine Defiance Mode — face Stockfish at max depth"
        >
          <Text style={styles.trainerButtonText}>ENGINE DEFIANCE MODE</Text>
          <Text style={styles.trainerButtonSubtext}>Face Stockfish at Max Depth</Text>
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          {ENDGAME_MATRICES.map(({ label, id }) => (
            <TouchableOpacity
              key={id}
              style={styles.matrixCard}
              accessibilityRole="button"
              accessibilityLabel={`${label} matrix drill`}
              onPress={() => {
                setDefianceMode(false);
                setActiveEndgame(id);
                router.push('/combat/sparring-session');
              }}
            >
              <Text style={styles.matrixCardText}>{label}</Text>
              <Text style={styles.matrixCardSubtext}>Matrix Drill</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Motif filter chips (live fetch by motif) ──────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Motif Library</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
        >
          {MOTIFS.map((motif) => (
            <TouchableOpacity
              key={motif}
              style={styles.motifChip}
              onPress={() => handleMotifSelect(motif)}
              accessibilityRole="button"
              accessibilityLabel={`Filter puzzles by ${motif}`}
            >
              <Text style={styles.motifChipText}>
                {motif.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Blunder Lab — live from /api/puzzles/blunders ─────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Mistakes (Blunder Lab)</Text>

        {blunderPuzzles.length === 0 && !isLoading ? (
          <Text style={styles.emptyText}>
            No blunders saved yet. Analyse a game to populate your lab.
          </Text>
        ) : (
          blunderPuzzles.map((item) => (
            <PuzzleCard
              key={item.id}
              id={item.id}
              motif={item.motif}
              difficulty={item.difficulty}
              source={item.source}
              onPress={() => {
                setActivePuzzle(item);
                router.push('/puzzle-board');
              }}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F14',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    color: '#F0F4FF',
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#8A93A8',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  errorBanner: {
    backgroundColor: 'rgba(249,79,79,0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F94F4F',
  },
  errorText: {
    color: '#F94F4F',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  trainerButton: {
    backgroundColor: '#4F9CF9',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#4F9CF9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  trainerButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  trainerButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  loader: {
    marginVertical: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#F0F4FF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  motifChip: {
    backgroundColor: '#1E2330',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#2A3040',
  },
  motifChipText: {
    color: '#F0F4FF',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  defianceButton: {
    backgroundColor: '#A78BFA',
    shadowColor: '#A78BFA',
    marginBottom: 16,
  },
  matrixCard: {
    backgroundColor: '#161A23',
    padding: 16,
    borderRadius: 16,
    marginRight: 16,
    width: 140,
    borderWidth: 1,
    borderColor: '#2A3040',
  },
  matrixCardText: {
    color: '#F9A84F',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  matrixCardSubtext: {
    color: '#8A93A8',
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  emptyText: {
    color: '#8A93A8',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
