import React, { useRef, useEffect } from 'react';
import { FlatList, TouchableOpacity, Text, StyleSheet, ListRenderItemInfo } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '../../constants/theme';
import { MoveClassBadge } from './MoveClassBadge';
import { MoveAnalysis } from '../../hooks/useEngine';

export interface MoveItem {
  index: number;      // 0-based ply index
  moveNumber: number; // Full-move number
  san: string;        // SAN notation e.g. "Nf3"
  isWhite: boolean;
  analysis?: MoveAnalysis;
}

interface MoveListProps {
  moves: MoveItem[];
  activePly: number | null;
  onMoveTap: (ply: number) => void;
}

function MoveChip({
  item,
  isActive,
  onPress,
}: {
  item: MoveItem;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`Move ${item.moveNumber}${item.isWhite ? '' : '...'} ${item.san}`}
      style={[
        styles.moveChip,
        isActive && styles.moveChipActive,
      ]}
    >
      {item.isWhite && (
        <Text style={styles.moveNumber}>{item.moveNumber}.</Text>
      )}
      <Text style={[styles.moveSan, isActive && styles.moveSanActive]}>
        {item.san}
      </Text>
      {item.analysis?.classification && (
        <MoveClassBadge classification={item.analysis.classification} />
      )}
    </TouchableOpacity>
  );
}

export function MoveList({ moves, activePly, onMoveTap }: MoveListProps): React.ReactElement {
  const flatListRef = useRef<FlatList<MoveItem>>(null);

  useEffect(() => {
    if (activePly !== null && moves.length > 0 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({
          index: activePly,
          animated: true,
          viewPosition: 0.5,
        });
      } catch (e) {
        // Ignore scroll errors if items are not yet rendered
      }
    }
  }, [activePly, moves.length]);

  return (
    <FlatList
      ref={flatListRef}
      data={moves}
      renderItem={({ item }: ListRenderItemInfo<MoveItem>) => (
        <MoveChip
          item={item}
          isActive={activePly === item.index}
          onPress={() => onMoveTap(item.index)}
        />
      )}
      keyExtractor={(item) => String(item.index)}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.moveListContent}
      onScrollToIndexFailed={(info) => {
        const wait = new Promise(resolve => setTimeout(resolve, 500));
        wait.then(() => {
          flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
        });
      }}
    />
  );
}

const styles = StyleSheet.create({
  moveListContent: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  moveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 3,
  },
  moveChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  moveNumber: {
    fontFamily: FontFamily.monoRegular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  moveSan: {
    fontFamily: FontFamily.monoBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  moveSanActive: {
    color: '#FFFFFF',
  },
});
