import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { ClockButton } from '../../components/ui/ClockButton';
import { useProfileStore } from '../../store/profileStore';
import { Colors, Spacing, Typography } from '../../constants/theme';

type Player = 'white' | 'black';

export default function OTBClockScreen() {
  const { clockConfig, setClockConfig } = useProfileStore();
  
  const [whiteTime, setWhiteTime] = useState(clockConfig.whiteTimeMs);
  const [blackTime, setBlackTime] = useState(clockConfig.blackTimeMs);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickRef = useRef<number>(0);

  useEffect(() => {
    if (activePlayer) {
      lastTickRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTickRef.current;
        lastTickRef.current = now;

        if (activePlayer === 'white') {
          setWhiteTime((prev) => Math.max(0, prev - delta));
        } else {
          setBlackTime((prev) => Math.max(0, prev - delta));
        }
      }, 50); // High frequency update for smoothness
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activePlayer]);

  const handleWhitePress = () => {
    if (activePlayer === 'white') {
      setWhiteTime((prev) => prev + clockConfig.whiteIncrementMs);
      setActivePlayer('black');
    } else if (activePlayer === null) {
      setActivePlayer('black');
    }
  };

  const handleBlackPress = () => {
    if (activePlayer === 'black') {
      setBlackTime((prev) => prev + clockConfig.blackIncrementMs);
      setActivePlayer('white');
    } else if (activePlayer === null) {
      setActivePlayer('white');
    }
  };

  const resetClock = () => {
    setActivePlayer(null);
    setWhiteTime(clockConfig.whiteTimeMs);
    setBlackTime(clockConfig.blackTimeMs);
  };

  return (
    <View style={styles.container}>
      <View style={styles.clockWrapper}>
        <ClockButton 
          timeMs={blackTime} 
          isActive={activePlayer === 'black' || activePlayer === null} 
          onPress={handleBlackPress}
          inverted 
        />
      </View>
      
      <View style={styles.controlsBar}>
        <TouchableOpacity style={styles.resetButton} onPress={resetClock}>
          <Text style={styles.resetText}>Reset Game</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.toggleButton} 
          onPress={() => setClockConfig({ hideNotation: !clockConfig.hideNotation })}
        >
          <Text style={styles.toggleText}>
            {clockConfig.hideNotation ? 'Show Notation' : 'Hide Notation'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.clockWrapper}>
        <ClockButton 
          timeMs={whiteTime} 
          isActive={activePlayer === 'white' || activePlayer === null} 
          onPress={handleWhitePress} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  clockWrapper: {
    flex: 1,
    padding: Spacing.base,
  },
  controlsBar: {
    height: 80,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  resetButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
  },
  resetText: {
    ...Typography.label,
    color: Colors.danger,
  },
  toggleButton: {
    padding: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
  },
  toggleText: {
    ...Typography.label,
    color: Colors.primary,
  },
});
