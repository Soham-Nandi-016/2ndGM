import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize, Spacing, Radius } from '../../constants/theme';
import { useTelemetryStore } from '../../store/telemetryStore';
import FatigueChart from '../../components/analytics/FatigueChart';
import ChronologyChart from '../../components/analytics/ChronologyChart';
import RadarMap from '../../components/analytics/RadarMap';

export default function ProfileScreen(): React.ReactElement {
  const { data, isLoading, fetchTelemetry } = useTelemetryStore();

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Telemetry Dashboard</Text>
          <Text style={styles.subtitle}>Deep cognitive and chronobiological insights</Text>
        </View>

        {isLoading && !data ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Synthesizing metrics...</Text>
          </View>
        ) : data ? (
          <>
            {/* Fatigue Chart Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Cognitive Fatigue Curve</Text>
                <Text style={styles.cardSubtitle}>Accuracy decay vs. total moves played</Text>
              </View>
              <FatigueChart data={data.fatigueCurve} height={200} />
            </View>

            {/* Chronology Chart Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Chronobiological Performance</Text>
                <Text style={styles.cardSubtitle}>Win rates across a 24-hour horizontal timeline</Text>
              </View>
              <ChronologyChart data={data.chronology} height={180} />
            </View>

            {/* Radar Map Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Tactical Radar Map</Text>
                <Text style={styles.cardSubtitle}>Spatial blind spot detection</Text>
              </View>
              <View style={styles.radarContainer}>
                 <RadarMap data={data.radarMap} />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unable to load telemetry data.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.base, paddingBottom: Spacing.xxxl },
  header: { marginBottom: Spacing.xl, marginTop: Spacing.sm },
  title: { fontFamily: FontFamily.interBold, fontSize: FontSize.xxl, color: Colors.textPrimary, marginBottom: 4 },
  subtitle: { fontFamily: FontFamily.interMedium, fontSize: FontSize.md, color: Colors.textSecondary },
  
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: { marginBottom: Spacing.base },
  cardTitle: { fontFamily: FontFamily.interSemiBold, fontSize: FontSize.lg, color: Colors.textPrimary, marginBottom: 2 },
  cardSubtitle: { fontFamily: FontFamily.interRegular, fontSize: FontSize.sm, color: Colors.textSecondary },
  
  radarContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, fontFamily: FontFamily.interMedium, color: Colors.primary },
  errorContainer: { paddingVertical: 40, alignItems: 'center' },
  errorText: { color: Colors.danger, fontFamily: FontFamily.interMedium },
});
