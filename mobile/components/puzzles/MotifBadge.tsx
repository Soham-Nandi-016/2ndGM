import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MotifBadgeProps {
  motif: string;
}

const formatMotif = (motif: string) => {
  return motif
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const MotifBadge: React.FC<MotifBadgeProps> = ({ motif }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{formatMotif(motif)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(249, 168, 79, 0.15)', // Token Accent with opacity
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999, // Pill shape
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(249, 168, 79, 0.3)',
  },
  text: {
    color: '#F9A84F', // Token Accent
    fontFamily: 'Inter-SemiBold', // Assuming fonts are loaded
    fontSize: 12,
    fontWeight: '600',
  },
});
