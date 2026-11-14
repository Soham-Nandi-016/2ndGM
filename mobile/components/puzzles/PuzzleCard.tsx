import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MotifBadge } from './MotifBadge';

interface PuzzleCardProps {
  id: string;
  motif: string;
  difficulty: number;
  source: string;
  onPress: () => void;
}

export const PuzzleCard: React.FC<PuzzleCardProps> = ({ id, motif, difficulty, source, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.header}>
        <MotifBadge motif={motif} />
        <Text style={styles.difficulty}>Elo {difficulty}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.id}>#{id}</Text>
        <Text style={styles.source}>{source}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#161A23', // Surface token
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#2A3040', // Border token
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  difficulty: {
    color: '#F0F4FF', // Text Primary
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  id: {
    color: '#8A93A8', // Text Secondary
    fontFamily: 'Roboto-Mono',
    fontSize: 12,
  },
  source: {
    color: '#8A93A8',
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
});
