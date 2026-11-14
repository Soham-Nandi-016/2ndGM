import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Typography } from '../../constants/theme';

interface ClockButtonProps {
  timeMs: number;
  isActive: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  inverted?: boolean;
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const ClockButton: React.FC<ClockButtonProps> = ({ timeMs, isActive, onPress, style, inverted }) => {
  const handlePress = () => {
    if (isActive) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onPress();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={isActive ? 0.7 : 1}
      onPress={handlePress}
      style={[
        styles.container,
        isActive ? styles.activeContainer : styles.inactiveContainer,
        inverted && styles.invertedContainer,
        style,
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.timeText, inverted && styles.invertedText]}>
          {formatTime(timeMs)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    margin: 8,
  },
  activeContainer: {
    backgroundColor: Colors.surface,
    borderColor: Colors.primary,
    elevation: 8,
  },
  inactiveContainer: {
    backgroundColor: Colors.background,
    borderColor: Colors.border,
    opacity: 0.6,
  },
  invertedContainer: {
    transform: [{ rotate: '180deg' }],
  },
  content: {
    padding: 24,
  },
  timeText: {
    ...Typography.displayBold,
    fontSize: 64,
  },
  invertedText: {
    color: Colors.textSecondary,
  },
});
