/**
 * Nexa — Progress Screen
 * Weekly heatmap, deck mastery bars, and streak calendar
 */

import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';
import { useNexaStore } from '@/store/useNexaStore';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getHeatColor(count: number): string {
  if (count === 0) return Colors.heatmap0;
  if (count <= 5) return Colors.heatmap1;
  if (count <= 15) return Colors.heatmap2;
  return Colors.heatmap3;
}

function MasteryBar({ name, mastery }: { name: string; mastery: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, { toValue: mastery, duration: 800, useNativeDriver: false }).start();
  }, [mastery]);
  return (
    <View style={styles.masteryItem}>
      <View style={styles.masteryHeader}>
        <Text style={styles.masteryName} numberOfLines={1}>{name}</Text>
        <Text style={styles.masteryPct}>{mastery}%</Text>
      </View>
      <View style={styles.masteryTrack}>
        <Animated.View style={[styles.masteryFill, {
          width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })
        }]} />
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { getWeeklyActivity, getDeckMastery, getStreakCalendar, streak } = useNexaStore();
  const weekly = getWeeklyActivity();
  const mastery = getDeckMastery();
  const calendar = getStreakCalendar();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.pageTitle}>Progress</Text>
          <Text style={styles.pageSubtitle}>Track your learning journey</Text>

          {/* This Week Heatmap */}
          <Text style={styles.sectionLabel}>THIS WEEK</Text>
          <View style={styles.heatmapCard}>
            <View style={styles.heatmapRow}>
              {weekly.map((count, i) => (
                <View key={i} style={styles.heatCol}>
                  <View style={[styles.heatCell, { backgroundColor: getHeatColor(count) }]}>
                    {count > 0 && <Text style={styles.heatCount}>{count}</Text>}
                  </View>
                  <Text style={styles.heatDay}>{DAY_LABELS[i]}</Text>
                </View>
              ))}
            </View>
            <View style={styles.heatLegend}>
              <Text style={styles.legendLabel}>Less</Text>
              {[Colors.heatmap0, Colors.heatmap1, Colors.heatmap2, Colors.heatmap3].map((c, i) => (
                <View key={i} style={[styles.legendDot, { backgroundColor: c }]} />
              ))}
              <Text style={styles.legendLabel}>More</Text>
            </View>
          </View>

          {/* Deck Mastery */}
          <Text style={styles.sectionLabel}>DECK MASTERY</Text>
          <View style={styles.masteryCard}>
            {mastery.length === 0 ? (
              <Text style={styles.noDataTxt}>No decks yet</Text>
            ) : (
              mastery.map((d, i) => <MasteryBar key={i} name={d.name} mastery={d.mastery} />)
            )}
          </View>

          {/* Streak Calendar */}
          <Text style={styles.sectionLabel}>STREAK CALENDAR</Text>
          <View style={styles.calendarCard}>
            <View style={styles.streakHeader}>
              <Text style={styles.streakNum}>{streak}</Text>
              <Text style={styles.streakTxt}>day streak</Text>
            </View>
            <View style={styles.calGrid}>
              {calendar.map((active, i) => (
                <View key={i} style={[styles.calDot, { backgroundColor: active ? Colors.primary : Colors.heatmap0 }]} />
              ))}
            </View>
            <Text style={styles.calLabel}>Last 30 days</Text>
          </View>

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xxl },
  pageTitle: { fontFamily: Fonts.display, fontSize: 24, color: Colors.headingText, marginTop: Spacing.xl },
  pageSubtitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.mutedText, marginTop: 4 },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: Spacing.xxxl, marginBottom: Spacing.lg },

  // Heatmap
  heatmapCard: { backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.card, padding: Spacing.xl },
  heatmapRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  heatCol: { alignItems: 'center', flex: 1 },
  heatCell: { width: 34, height: 34, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  heatCount: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.white },
  heatDay: { fontFamily: Fonts.body, fontSize: 10, color: Colors.mutedText, marginTop: 4 },
  heatLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: Spacing.lg },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendLabel: { fontFamily: Fonts.body, fontSize: 9, color: Colors.mutedText },

  // Mastery
  masteryCard: { backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.card, padding: Spacing.xl },
  masteryItem: { marginBottom: Spacing.lg },
  masteryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  masteryName: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.headingText, flex: 1, marginRight: Spacing.md },
  masteryPct: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.primary },
  masteryTrack: { height: 8, backgroundColor: Colors.accentBadgeBg, borderRadius: 4, overflow: 'hidden' },
  masteryFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  noDataTxt: { fontFamily: Fonts.body, fontSize: 13, color: Colors.mutedText, textAlign: 'center', paddingVertical: Spacing.xl },

  // Calendar
  calendarCard: { backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.card, padding: Spacing.xl, alignItems: 'center' },
  streakHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: Spacing.xl },
  streakNum: { fontFamily: Fonts.bodyExtraBold, fontSize: 32, color: Colors.primary },
  streakTxt: { fontFamily: Fonts.body, fontSize: 14, color: Colors.mutedText },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 200 },
  calDot: { width: 10, height: 10, borderRadius: 5 },
  calLabel: { fontFamily: Fonts.body, fontSize: 10, color: Colors.mutedText, marginTop: Spacing.lg },
});
