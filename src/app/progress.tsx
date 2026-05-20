/**
 * Nexa — Progress & Scholar Analytics Screen
 * Breathtaking dashboard featuring glassmorphic metrics hero, vertical active charts,
 * custom color-mapped deck mastery gauges, and a high-fidelity streak timeline.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';
import { useNexaStore } from '@/store/useNexaStore';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getStatusBadge(mastery: number) {
  if (mastery >= 80) return { label: 'Master', bg: Colors.easyBg, text: Colors.easyText };
  if (mastery >= 40) return { label: 'Proficient', bg: Colors.blueDeckBg, text: Colors.tabActive };
  return { label: 'Novice', bg: Colors.accentBadgeBg, text: Colors.primary };
}

interface MasteryBarProps {
  name: string;
  mastery: number;
  icon: string;
  colorTag: string;
}

function MasteryBar({ name, mastery, icon, colorTag }: MasteryBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: mastery,
      tension: 20,
      friction: 6,
      useNativeDriver: false
    }).start();
  }, [mastery]);

  const deckBgMap: Record<string, string> = {
    purple: Colors.purpleDeckBg,
    pink: Colors.pinkDeckBg,
    blue: Colors.blueDeckBg,
  };

  const badge = getStatusBadge(mastery);

  return (
    <View style={styles.masteryItem}>
      <View style={styles.masteryMeta}>
        <View style={[styles.deckIconCircle, { backgroundColor: deckBgMap[colorTag] || Colors.purpleDeckBg }]}>
          <Ionicons name="layers" size={14} color={Colors.primary} />
        </View>
        <View style={styles.deckNameCol}>
          <Text style={styles.masteryName} numberOfLines={1}>{name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeTxt, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>
        <Text style={styles.masteryPct}>{mastery}%</Text>
      </View>
      
      <View style={styles.masteryTrack}>
        <Animated.View style={[
          styles.masteryFill,
          {
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
            backgroundColor: colorTag === 'pink' ? '#c046a0' : colorTag === 'blue' ? '#3598db' : Colors.primary,
          }
        ]} />
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const { getWeeklyActivity, getDeckMastery, getStreakCalendar, streak, studySessions, totalMastered, decks } = useNexaStore();
  
  const weekly = getWeeklyActivity();
  const deckMasteries = getDeckMastery();
  const calendar = getStreakCalendar();

  // Calculate total cards studied across all sessions
  const totalCardsStudied = studySessions.reduce((sum, s) => sum + s.cardsStudied, 0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 35, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // Calculate max cards studied in the last 7 days to scale bar height
  const maxWeeklyValue = Math.max(...weekly, 1);

  // Determine current day of week to highlight (0 is Mon, 6 is Sun based on getWeeklyActivity structure)
  const currentDayIndex = (new Date().getDay() + 6) % 7;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Stunning Title Header */}
          <View style={styles.headerBlock}>
            <Text style={styles.pageLabel}>Scholar Analytics</Text>
            <Text style={styles.pageTitle}>Progress & Insights</Text>
          </View>

          {/* Premium Glassmorphic Hero Metrics Banner */}
          <View style={styles.heroStatsCard}>
            <View style={styles.heroStatItem}>
              <View style={[styles.heroIconBox, { backgroundColor: '#ede8ff' }]}>
                <Ionicons name="book-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.heroStatValue}>{totalCardsStudied}</Text>
              <Text style={styles.heroStatLabel}>Cards Reviewed</Text>
            </View>
            
            <View style={styles.heroDivider} />

            <View style={styles.heroStatItem}>
              <View style={[styles.heroIconBox, { backgroundColor: '#ffe8f5' }]}>
                <Ionicons name="flame" size={20} color="#c046a0" />
              </View>
              <Text style={styles.heroStatValue}>{streak}d</Text>
              <Text style={styles.heroStatLabel}>Daily Streak</Text>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroStatItem}>
              <View style={[styles.heroIconBox, { backgroundColor: '#e8f8ee' }]}>
                <Ionicons name="ribbon-outline" size={20} color="#1a7a40" />
              </View>
              <Text style={styles.heroStatValue}>{totalMastered}</Text>
              <Text style={styles.heroStatLabel}>Mastered Decks</Text>
            </View>
          </View>

          {/* Interactive Weekly Bar Chart */}
          <Text style={styles.sectionLabel}>DAILY ACTIVITY</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Ionicons name="bar-chart" size={16} color={Colors.primary} />
              <Text style={styles.chartTitle}>Cards Studied (Past 7 Days)</Text>
            </View>
            <View style={styles.chartContainer}>
              {weekly.map((count, i) => {
                const barHeight = (count / maxWeeklyValue) * 110;
                const isToday = i === currentDayIndex;
                return (
                  <View key={i} style={styles.chartCol}>
                    <View style={styles.barTrack}>
                      <View style={[
                        styles.barFill,
                        {
                          height: Math.max(barHeight, 4),
                          backgroundColor: isToday ? Colors.primary : Colors.heatmap1,
                        }
                      ]} />
                    </View>
                    <Text style={[styles.barDay, isToday && styles.barDayActive]}>{DAY_LABELS[i]}</Text>
                    <Text style={styles.barCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Deck Mastery */}
          <Text style={styles.sectionLabel}>DECK MASTERY</Text>
          <View style={styles.masteryCard}>
            {deckMasteries.length === 0 ? (
              <View style={styles.emptyMasteryState}>
                <Ionicons name="albums-outline" size={32} color={Colors.mutedText} />
                <Text style={styles.noDataTxt}>Create decks and begin studying to view masteries</Text>
              </View>
            ) : (
              deckMasteries.map((d, i) => {
                const deckInfo = decks.find(deck => deck.name === d.name);
                return (
                  <MasteryBar
                    key={i}
                    name={d.name}
                    mastery={d.mastery}
                    icon={deckInfo?.icon || '📚'}
                    colorTag={deckInfo?.colorTag || 'purple'}
                  />
                );
              })
            )}
          </View>

          {/* Streak Calendar Grid */}
          <Text style={styles.sectionLabel}>30-DAY TIMELINE</Text>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <View style={styles.calTitleCol}>
                <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                <Text style={styles.calTitle}>Streak Heatmap</Text>
              </View>
              <Text style={styles.calRange}>Last 30 Days</Text>
            </View>
            <View style={styles.calGrid}>
              {calendar.map((active, i) => (
                <View
                  key={i}
                  style={[
                    styles.calDot,
                    {
                      backgroundColor: active ? '#7c5cbf' : Colors.heatmap0,
                      borderColor: active ? '#9984d4' : 'transparent',
                      borderWidth: active ? 1 : 0,
                    }
                  ]}
                />
              ))}
            </View>
            <View style={styles.calLegend}>
              <View style={styles.legendGroup}>
                <View style={[styles.legendIndicator, { backgroundColor: Colors.heatmap0 }]} />
                <Text style={styles.legendLabel}>Inactive</Text>
              </View>
              <View style={styles.legendGroup}>
                <View style={[styles.legendIndicator, { backgroundColor: '#7c5cbf' }]} />
                <Text style={styles.legendLabel}>Active Study</Text>
              </View>
            </View>
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
  
  headerBlock: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  pageLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.mutedText,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.headingText,
    marginTop: 4,
  },

  // Hero Stats Card
  heroStatsCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxxl,
    elevation: 3,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroStatValue: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: 20,
    color: Colors.headingText,
    lineHeight: 24,
  },
  heroStatLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.mutedText,
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.divider,
  },

  sectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.mutedText,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },

  // Interactive Chart Card
  chartCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    marginBottom: Spacing.xxxl,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
  chartTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.headingText,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingHorizontal: Spacing.xs,
  },
  chartCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 110,
    width: 12,
    backgroundColor: Colors.accentBadgeBg,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barDay: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.mutedText,
    marginTop: Spacing.md,
  },
  barDayActive: {
    color: Colors.primary,
    fontFamily: Fonts.bodyBold,
  },
  barCount: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.headingText,
    marginTop: 2,
  },

  // Mastery styles
  masteryCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    marginBottom: Spacing.xxxl,
  },
  emptyMasteryState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  masteryItem: {
    marginBottom: Spacing.xxxl,
  },
  masteryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  deckIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  deckIconEmoji: {
    fontSize: 16,
  },
  deckNameCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  masteryName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.headingText,
    maxWidth: '65%',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusBadgeTxt: {
    fontFamily: Fonts.bodyBold,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  masteryPct: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.primary,
  },
  masteryTrack: {
    height: 6,
    backgroundColor: Colors.accentBadgeBg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  masteryFill: {
    height: '100%',
    borderRadius: 3,
  },
  noDataTxt: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.mutedText,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 18,
  },

  // Calendar Heatmap Card
  calendarCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxxl,
  },
  calTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  calTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.headingText,
  },
  calRange: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.mutedText,
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.md,
  },
  calDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  calLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.mutedText,
    marginTop: Spacing.lg,
  },
  calLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xxxl,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.xl,
  },
  legendGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.mutedText,
  },
});
