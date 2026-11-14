/**
 * 2ndGM — Home Dashboard (index.tsx)
 * Tab 1: Live interactive chessboard + quick-access feature cards.
 * Native-only: ScrollView, View, Text, TouchableOpacity, Pressable.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChessBoard } from '../../components/board/ChessBoard';
import {
  Colors,
  FontFamily,
  FontSize,
  Spacing,
  Radius,
  Shadow,
} from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Feature Card Data ────────────────────────────────────────────────────────

interface FeatureCard {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  route: string;
  accentColor: string;
}

const FEATURE_CARDS: FeatureCard[] = [
  {
    id: 'analyze',
    emoji: '🔬',
    title: 'PGN Analyzer',
    subtitle: 'Deep Stockfish review',
    route: '/(tabs)/analyze',
    accentColor: Colors.primary,
  },
  {
    id: 'sparring',
    emoji: '⚔️',
    title: 'AI Sparring',
    subtitle: 'Play vs scaled engine',
    route: '/sparring',
    accentColor: Colors.accent,
  },
  {
    id: 'blunder-lab',
    emoji: '🧪',
    title: 'Blunder Lab',
    subtitle: 'Fix your mistakes',
    route: '/blunder-lab',
    accentColor: Colors.danger,
  },
  {
    id: 'puzzles',
    emoji: '🧩',
    title: 'Puzzles',
    subtitle: 'Spaced repetition tactics',
    route: '/(tabs)/puzzles',
    accentColor: Colors.brilliant,
  },
  {
    id: 'repertoire',
    emoji: '📖',
    title: 'Openings',
    subtitle: 'Your repertoire graph',
    route: '/(tabs)/repertoire',
    accentColor: Colors.success,
  },
  {
    id: 'otb-clock',
    emoji: '⏱️',
    title: 'OTB Clock',
    subtitle: 'Tournament simulator',
    route: '/otb-clock',
    accentColor: Colors.warning,
  },
];

// ─── Feature Card Component ───────────────────────────────────────────────────

function QuickCard({ card, onPress }: { card: FeatureCard; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      accessibilityLabel={card.title}
      accessibilityRole="button"
      style={[styles.card, Shadow.sm, { borderLeftColor: card.accentColor }]}
    >
      <Text style={styles.cardEmoji} accessibilityHidden>{card.emoji}</Text>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{card.title}</Text>
        <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
      </View>
      <Text style={[styles.cardChevron, { color: card.accentColor }]}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.appName}>2ndGM</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingLabel}>ELO</Text>
            <Text style={styles.ratingValue}>—</Text>
          </View>
        </View>

        {/* Section: Live Board */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Play</Text>
          <Text style={styles.sectionSubtitle}>Tap pieces to move</Text>
        </View>

        <View style={styles.boardWrapper}>
          <ChessBoard showCoordinates />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Section: Feature Cards */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Modules</Text>
        </View>

        <View style={styles.cardGrid}>
          {FEATURE_CARDS.map((card) => (
            <QuickCard
              key={card.id}
              card={card}
              onPress={() => router.push(card.route as never)}
            />
          ))}
        </View>

        {/* Bottom padding */}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  greeting: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  appName: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  ratingBadge: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ratingLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: 9,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  ratingValue: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.lg,
    color: Colors.primary,
  },

  // Section headers
  sectionHeader: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  // Board
  boardWrapper: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
  },

  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.lg,
  },

  // Feature cards
  cardGrid: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderLeftWidth: 3,
  },
  cardEmoji: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardChevron: {
    fontFamily: FontFamily.interBold,
    fontSize: 22,
    lineHeight: 24,
  },
});
