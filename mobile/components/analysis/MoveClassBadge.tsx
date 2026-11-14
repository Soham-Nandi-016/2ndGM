import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MoveClassColor, FontFamily, FontSize, Colors, Radius } from '../../constants/theme';

interface MoveClassBadgeProps {
  classification: string;
}

export function MoveClassBadge({ classification }: MoveClassBadgeProps): React.ReactElement | null {
  const color = MoveClassColor[classification.toLowerCase()];
  
  if (!color) return null;

  let symbol = '';
  switch (classification.toLowerCase()) {
    case 'brilliant': symbol = '!!'; break;
    case 'great': symbol = '!'; break;
    case 'inaccuracy': symbol = '?!'; break;
    case 'mistake': symbol = '?'; break;
    case 'blunder': symbol = '??'; break;
    default: return null; // Don't show badges for normal moves to keep UI clean
  }

  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{symbol}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.xs,
    color: Colors.background, // Near-black for contrast against vibrant badge backgrounds
    lineHeight: FontSize.xs * 1.2,
  },
});
