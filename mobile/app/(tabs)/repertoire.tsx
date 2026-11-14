/**
 * 2ndGM — Repertoire Tab  (Production)
 * =======================================
 * Fetches saved repertoire tracks from AsyncStorage (via repertoireStore.loadLocalTracks)
 * and displays live variation counts from the Neo4j-backed backend on demand.
 *
 * What changed from mock:
 *  - mockSystems[] array removed.
 *  - Systems list is derived from live savedTracks in repertoireStore
 *    (populated from AsyncStorage and the Neo4j backend).
 *  - Each system card shows actual move count from the track array length.
 *  - ECO code and name pulled from the first move of the track (as stored in
 *    RepertoireTrackMove.eco / .name fields set during the Neo4j fetch).
 *  - Loading spinner while AsyncStorage hydration is in progress.
 *  - Empty state with CTA when no tracks exist yet.
 *  - "Add New System" navigates to the repertoire browser instead of no-op.
 *
 * Native-only: View, Text, ScrollView, TouchableOpacity, ActivityIndicator.
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
import { Link, router } from 'expo-router';
import { useRepertoireStore, RepertoireTrackMove } from '../../store/repertoireStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive a display colour from the first move's perspective. */
function trackColor(track: RepertoireTrackMove[]): 'White' | 'Black' {
  // If white plays first (ply 1 → white), convention is the user saved a White repertoire.
  // Simple heuristic: count whether the first stored FEN has white to move.
  if (track.length === 0) return 'White';
  const fen = track[0].fen_before;
  const sideToMove = fen.split(' ')[1]; // 'w' or 'b'
  return sideToMove === 'w' ? 'White' : 'Black';
}

/** Extract a human-readable system name from the track's first named node. */
function trackName(track: RepertoireTrackMove[]): string {
  const named = track.find((m) => m.name && m.name.trim().length > 0);
  return named?.name ?? 'Custom Line';
}

/** Extract ECO code from the track, or '—'. */
function trackEco(track: RepertoireTrackMove[]): string {
  const eco = track.find((m) => m.eco && m.eco.trim().length > 0);
  return eco?.eco ?? '—';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RepertoireTab() {
  const {
    savedTracks,
    isLoading,
    error,
    loadLocalTracks,
  } = useRepertoireStore();

  // ── On mount: hydrate from AsyncStorage (falls back gracefully if empty) ──
  useEffect(() => {
    loadLocalTracks();
  }, [loadLocalTracks]);

  const handleAddSystem = useCallback(() => {
    router.push('/repertoire/browser');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Opening Repertoire</Text>
        <Text style={styles.subtitle}>Manage your curated openings and variations</Text>
      </View>

      {/* ── Error banner ────────────────────────────────────────────────────── */}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ── Loading skeleton ────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F9CF9" />
          <Text style={styles.loadingText}>Loading repertoire…</Text>
        </View>
      ) : savedTracks.length === 0 ? (
        /* ── Empty state ──────────────────────────────────────────────────── */
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Systems Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your first opening system to start building your repertoire.
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={handleAddSystem}
            accessibilityRole="button"
            accessibilityLabel="Add your first opening system"
          >
            <Text style={styles.emptyAddButtonText}>+ Add First System</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Live system cards derived from persisted tracks ──────────────── */
        <View style={styles.systemsContainer}>
          {savedTracks.map((track, index) => {
            const color = trackColor(track);
            const name  = trackName(track);
            const eco   = trackEco(track);
            const moves = track.length;

            return (
              <View key={`track-${index}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{name}</Text>
                  <View style={[
                    styles.badge,
                    color === 'White' ? styles.badgeWhite : styles.badgeBlack,
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      color === 'White' ? styles.badgeTextDark : styles.badgeTextLight,
                    ]}>
                      {color}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.ecoText}>ECO: {eco}</Text>
                  <Text style={styles.movesText}>{moves} move{moves !== 1 ? 's' : ''} stored</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Link href="/repertoire/active-recall" asChild>
                    <TouchableOpacity
                      style={styles.trainButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Active recall for ${name}`}
                    >
                      <Text style={styles.trainButtonText}>Active Recall</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Add new system CTA ────────────────────────────────────────────── */}
      {!isLoading && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddSystem}
          accessibilityRole="button"
          accessibilityLabel="Add a new opening system"
        >
          <Text style={styles.addButtonText}>+ Add New System</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F14',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginTop: 40,
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#F0F4FF',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#8A93A8',
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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  loadingText: {
    color: '#8A93A8',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    color: '#F0F4FF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
  },
  emptySubtitle: {
    color: '#8A93A8',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  emptyAddButton: {
    backgroundColor: '#4F9CF9',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  systemsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#161A23',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#F0F4FF',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeWhite: {
    backgroundColor: '#F0D9B5',
  },
  badgeBlack: {
    backgroundColor: '#B58863',
  },
  badgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  badgeTextDark: {
    color: '#0D0F14',
  },
  badgeTextLight: {
    color: '#F0F4FF',
  },
  cardBody: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  ecoText: {
    fontFamily: 'RobotoMono-Regular',
    fontSize: 14,
    color: '#8A93A8',
  },
  movesText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#8A93A8',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  trainButton: {
    backgroundColor: '#4F9CF9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  trainButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#F0F4FF',
  },
  addButton: {
    marginTop: 24,
    backgroundColor: '#1E2330',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A3040',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#F9A84F',
  },
});
