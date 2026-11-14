/**
 * 2ndGM — Tab Navigator Layout
 * Five-tab bottom navigation: Home, Analyze, Repertoire, Puzzles, Profile.
 * Premium dark styling matching the 2ndGM design system.
 *
 * Native-only: Tabs from expo-router.
 */

import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';

import { Colors, FontFamily, FontSize } from '../../constants/theme';

// ─── Tab Icon (Unicode fallback — replace with expo-vector-icons later) ───────

function TabIcon({
  symbol,
  focused,
}: {
  symbol: string;
  focused: boolean;
}): React.ReactElement {
  const { Text } = require('react-native');
  return (
    <Text
      style={{
        fontSize: 22,
        opacity: focused ? 1 : 0.45,
      }}
      allowFontScaling={false}
    >
      {symbol}
    </Text>
  );
}

export default function TabLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: {
          fontFamily: FontFamily.interSemiBold,
          fontSize: FontSize.lg,
        },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: {
          fontFamily: FontFamily.interMedium,
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon symbol="♟" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="analyze"
        options={{
          title: 'Analyze',
          tabBarLabel: 'Analyze',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🔬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="repertoire"
        options={{
          title: 'Repertoire',
          tabBarLabel: 'Openings',
          tabBarIcon: ({ focused }) => <TabIcon symbol="📖" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="puzzles"
        options={{
          title: 'Puzzles',
          tabBarLabel: 'Puzzles',
          tabBarIcon: ({ focused }) => <TabIcon symbol="🧩" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon symbol="📊" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
