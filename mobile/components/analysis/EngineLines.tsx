import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontFamily, FontSize, Radius, Shadow, Spacing } from '../../constants/theme';
import { EngineLine } from '../../hooks/useEngine';

interface EngineLinesProps {
  lines: EngineLine[];
}

export function EngineLines({ lines }: EngineLinesProps): React.ReactElement | null {
  if (!lines || lines.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {lines.map((lineObj, index) => {
        // Format eval: add "+" for positive centipawns. If it's a mate string, just show it.
        let formattedEval = '';
        if (typeof lineObj.eval === 'number') {
          // Eval is in centipawns, convert to pawns
          const pawns = lineObj.eval / 100;
          formattedEval = pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
        } else {
          formattedEval = String(lineObj.eval);
        }

        const isBest = index === 0;

        return (
          <View key={index} style={styles.lineRow}>
            <View style={[styles.evalBadge, isBest && styles.evalBadgeBest]}>
              <Text style={[styles.evalText, isBest && styles.evalTextBest]}>
                {formattedEval}
              </Text>
            </View>
            <Text style={styles.moveText}>{lineObj.move}</Text>
            <Text
              style={styles.lineText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {lineObj.line}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  evalBadge: {
    width: 50,
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  evalBadgeBest: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  evalText: {
    fontFamily: FontFamily.monoMedium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  evalTextBest: {
    color: '#FFFFFF',
    fontFamily: FontFamily.monoBold,
  },
  moveText: {
    fontFamily: FontFamily.monoBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    width: 45, // Fixed width to align lines
  },
  lineText: {
    flex: 1,
    fontFamily: FontFamily.monoRegular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
