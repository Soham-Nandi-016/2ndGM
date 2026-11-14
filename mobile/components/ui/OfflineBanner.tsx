/**
 * 2ndGM — OfflineBanner
 * Animated banner that slides in from the top when the device loses connectivity.
 * Native-only: View, Text, Animated. Zero HTML tags or onClick.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsOffline } from '../../hooks/useNetworkStatus';
import { Colors, FontFamily, FontSize, Spacing, Animation } from '../../constants/theme';

interface OfflineBannerProps {
  style?: ViewStyle;
}

export function OfflineBanner({ style }: OfflineBannerProps): React.ReactElement {
  const isOffline = useIsOffline();
  const { top } = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOffline) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 220,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: Animation.fast,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: Animation.standard,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: Animation.standard,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOffline, slideAnim, opacityAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 0],
  });

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLabel="Offline. Board works locally; analysis needs connection."
      style={[
        styles.container,
        {
          paddingTop: top + Spacing.sm,
          opacity: opacityAnim,
          transform: [{ translateY }],
        },
        style,
      ]}
    >
      <View style={styles.iconWrapper}>
        <Text style={styles.icon} accessibilityHidden>⚠️</Text>
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={1}>
          You're Offline
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          Board works locally · Analysis requires connection
        </Text>
      </View>
      <View style={styles.dot} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.danger,
    shadowColor: Colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  iconWrapper: {
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.md,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginLeft: Spacing.sm,
  },
});
