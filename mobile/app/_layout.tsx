/**
 * 2ndGM — Root App Layout
 * Loads Google Fonts, sets dark background, renders OfflineBanner globally,
 * and mounts the Expo Router Stack navigator.
 *
 * Native-only: View, SafeAreaProvider, Stack.
 */

import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  RobotoMono_400Regular,
  RobotoMono_500Medium,
  RobotoMono_700Bold,
} from '@expo-google-fonts/roboto-mono';

import { OfflineBanner } from '../components/ui/OfflineBanner';
import { Colors } from '../constants/theme';

export default function RootLayout(): React.ReactElement | null {
  const [fontsLoaded] = useFonts({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    RobotoMono_400Regular,
    RobotoMono_500Medium,
    RobotoMono_700Bold,
  });

  // Prevent flash of unstyled text — hide UI until fonts are ready
  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.surface },
            headerTintColor: Colors.textPrimary,
            headerTitleStyle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="analyzer/[gameId]"
            options={{ title: 'Game Review', headerBackTitle: 'Back' }}
          />
          <Stack.Screen
            name="sparring/index"
            options={{ title: 'AI Sparring Lab' }}
          />
          <Stack.Screen
            name="blunder-lab/index"
            options={{ title: 'My Blunder Lab' }}
          />
          <Stack.Screen
            name="otb-clock/index"
            options={{ title: 'OTB Clock', headerShown: false }}
          />
        </Stack>

        {/* Global offline banner — floats above all screens */}
        <OfflineBanner />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
});
