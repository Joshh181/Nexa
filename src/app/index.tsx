/**
 * Nexa — Home Screen
 * Greeting, owl banner CTA, stats, and deck list
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';
import { useNexaStore } from '@/store/useNexaStore';



function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, Scholar';
  if (hour < 17) return 'Good afternoon, Scholar';
  return 'Good evening, Scholar';
}

// ─── StatBox ─────────────────────────────────────────

function StatBox({
  icon,
  iconColor,
  iconBg,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  value: number;
  label: string;
}) {
  const countAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(countAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.statBox}>
      <View style={[styles.statIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View>
        <Animated.Text
          style={[
            styles.statValue,
            { opacity: countAnim, transform: [{ scale: countAnim }] },
          ]}
        >
          {value}
        </Animated.Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

// ─── DeckCard ────────────────────────────────────────

function DeckCard({
  name,
  icon,
  colorTag,
  totalCards,
  dueCount,
  onPress,
}: {
  name: string;
  icon: string;
  colorTag: string;
  totalCards: number;
  dueCount: number;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const deckBgMap: Record<string, string> = {
    purple: Colors.purpleDeckBg,
    pink: Colors.pinkDeckBg,
    blue: Colors.blueDeckBg,
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const isUrgent = dueCount > 5;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[styles.deckCard, { transform: [{ scale: scaleAnim }] }]}
      >
        <View
          style={[
            styles.deckIconBox,
            { backgroundColor: deckBgMap[colorTag] || Colors.purpleDeckBg },
          ]}
        >
          <Text style={styles.deckEmoji}>{icon}</Text>
        </View>
        <View style={styles.deckInfo}>
          <Text style={styles.deckName}>{name}</Text>
          <Text style={styles.deckCount}>{totalCards} cards</Text>
        </View>
        {dueCount > 0 && (
          <View
            style={[
              styles.duePill,
              {
                backgroundColor: isUrgent
                  ? Colors.urgentPillBg
                  : Colors.accentBadgeBg,
              },
            ]}
          >
            <Text
              style={[
                styles.duePillText,
                {
                  color: isUrgent
                    ? Colors.urgentPillText
                    : Colors.accentBadgeText,
                },
              ]}
            >
              {dueCount} due
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ─── HomeScreen ──────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { decks, streak, totalMastered, getTotalDueCards } = useNexaStore();
  const totalDue = getTotalDueCards();

  // Screen enter animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getToday = () => new Date().toISOString().split('T')[0];

  const getDueCountForDeck = (deckId: string): number => {
    const today = getToday();
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return 0;
    return deck.cards.filter((c) => c.nextReview <= today).length;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Header */}
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.title}>What shall we{'\n'}study today?</Text>

          {/* Owl Banner CTA */}
          <View style={styles.bannerCard}>
            <Image
              source={require('@/assets/Gemini_Generated_Image_z7k15sz7k15sz7k1-clean-removebg-preview.png')}
              style={styles.bannerOwl}
              contentFit="contain"
            />
            <View style={styles.bannerTextCol}>
              <Text style={styles.bannerTitle}>
                {totalDue} card{totalDue !== 1 ? 's' : ''} due today
              </Text>
              <Text style={styles.bannerSubtitle}>
                Keep your streak alive, Scholar!
              </Text>
              <Pressable
                style={styles.bannerButton}
                onPress={() => {
                  // Find first deck with due cards
                  const today = getToday();
                  const deckWithDue = decks.find((d) =>
                    d.cards.some((c) => c.nextReview <= today)
                  );
                  if (deckWithDue) {
                    router.push({
                      pathname: '/study' as any,
                      params: { deckId: deckWithDue.id },
                    });
                  } else {
                    router.push('/study' as any);
                  }
                }}
              >
                <Text style={styles.bannerButtonText}>Study now</Text>
              </Pressable>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <StatBox
              icon="flame"
              iconColor="#e8873a"
              iconBg={Colors.accentBadgeBg}
              value={streak}
              label="Day Streak"
            />
            <StatBox
              icon="star"
              iconColor="#5ab87a"
              iconBg={Colors.greenDeckBg}
              value={totalMastered}
              label="Cards Mastered"
            />
          </View>

          {/* Deck Section */}
          <Text style={styles.sectionLabel}>YOUR DECKS</Text>

          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              name={deck.name}
              icon={deck.icon}
              colorTag={deck.colorTag}
              totalCards={deck.cards.length}
              dueCount={getDueCountForDeck(deck.id)}
              onPress={() =>
                router.push({
                  pathname: '/study' as any,
                  params: { deckId: deck.id },
                })
              }
            />
          ))}

          {decks.length === 0 && (
            <View style={styles.emptyState}>
              <Image
                source={require('@/assets/Gemini_Generated_Image_z7k15sz7k15sz7k1-clean-removebg-preview.png')}
                style={styles.emptyOwl}
                contentFit="contain"
              />
              <Text style={styles.emptyText}>
                No decks yet! Tap + to create one.
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/create-deck' as any)}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xxl,
  },
  greeting: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.mutedText,
    letterSpacing: 0.5,
    marginTop: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.headingText,
    marginTop: Spacing.md,
    lineHeight: 32,
  },

  // Banner
  bannerCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    marginTop: Spacing.xxxl,
    overflow: 'hidden',
  },
  bannerOwl: {
    width: 52,
    height: 52,
  },
  bannerTextCol: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  bannerTitle: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.white,
  },
  bannerSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.subtitleText,
    marginTop: 2,
  },
  bannerButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
  },
  bannerButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.primary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.xl,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statIconBox: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: 18,
    color: Colors.headingText,
  },
  statLabel: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.mutedText,
  },

  // Section
  sectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.mutedText,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: Spacing.xxxl,
    marginBottom: Spacing.lg,
  },

  // Deck Card
  deckCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  deckIconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckEmoji: {
    fontSize: 20,
  },
  deckInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  deckName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.headingText,
  },
  deckCount: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 1,
  },
  duePill: {
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  duePillText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.massive,
  },
  emptyOwl: {
    width: 80,
    height: 80,
    opacity: 0.5,
    marginBottom: Spacing.xl,
  },
  emptyText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.mutedText,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 90,
    right: Spacing.xxl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});
