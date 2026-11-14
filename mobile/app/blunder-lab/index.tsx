import React from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';
import { useProfileStore } from '../../store/profileStore';

export default function BlunderLabScreen() {
  const { savedBlunders } = useProfileStore();

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>My Blunder Lab</Text>
      <Text style={styles.subtitle}>
        Train on isolated positions exactly 2 plies before an unforced error.
      </Text>

      {savedBlunders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No blunders saved yet.</Text>
          <Text style={styles.emptySubtext}>Analyze your games to populate the lab.</Text>
        </View>
      ) : (
        <FlatList
          data={savedBlunders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Blunder Puzzle</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.motif}</Text>
                </View>
              </View>
              <Text style={styles.fenText} numberOfLines={1}>{item.fen}</Text>
              <Text style={styles.difficultyText}>Difficulty: {item.difficulty}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.base,
  },
  headerTitle: {
    ...Typography.headingLarge,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySecondary,
    marginBottom: Spacing.xl,
  },
  listContainer: {
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    ...Typography.subheading,
    color: Colors.textPrimary,
  },
  badge: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.accent,
  },
  fenText: {
    ...Typography.notation,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  difficultyText: {
    ...Typography.caption,
    color: Colors.textPrimary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.headingMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    ...Typography.bodySecondary,
    textAlign: 'center',
  },
});
