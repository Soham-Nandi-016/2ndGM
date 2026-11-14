import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Radius, Spacing } from '../../constants/theme';

interface EvalBarProps {
  /** Evaluation in centipawns. Positive for White advantage, negative for Black. */
  scoreCp?: number;
  /** Mate in X. Positive if White is mating, negative if Black. */
  mateScore?: number;
}

export function EvalBar({ scoreCp = 0, mateScore }: EvalBarProps): React.ReactElement {
  // Shared value represents the fill percentage of White.
  // 50 = equal, 100 = White totally winning, 0 = Black totally winning.
  const fillPercentage = useSharedValue(50);

  useEffect(() => {
    let target = 50;

    if (mateScore !== undefined && mateScore !== null) {
      target = mateScore > 0 ? 100 : 0;
    } else {
      // Clamp the score to [-1000, 1000] for UI purposes
      const clampedScore = Math.max(-1000, Math.min(1000, scoreCp));
      // Formula to map -1000..1000 to 0..100% smoothly
      target = 50 + (clampedScore / 1000) * 50;
    }

    fillPercentage.value = withTiming(target, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [scoreCp, mateScore, fillPercentage]);

  const fillStyle = useAnimatedStyle(() => {
    // We render a single bar where the top part is Black and the bottom is White.
    return {
      height: `${fillPercentage.value}%`,
      backgroundColor: Colors.textPrimary, // White's color representation
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.fill, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 6,
    height: '100%',
    backgroundColor: Colors.surfaceElevated, // Black's color representation
    borderRadius: Radius.pill,
    overflow: 'hidden',
    justifyContent: 'flex-end', // Aligns the White fill to the bottom
  },
  fill: {
    width: '100%',
    borderRadius: Radius.pill,
  },
});
