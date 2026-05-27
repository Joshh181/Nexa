/**
 * Nexa — Home Screen
 * Greeting, owl banner CTA, stats, and deck list
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
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

// ─── DeckCard ────────────────────────────────────────

function DeckCard({
  name,
  icon,
  colorTag,
  totalCards,
  dueCount,
  subject,
  onPress,
  onDelete,
}: {
  name: string;
  icon: string;
  colorTag: string;
  totalCards: number;
  dueCount: number;
  subject?: string;
  onPress: () => void;
  onDelete: () => void;
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
          <Ionicons name="layers" size={16} color={Colors.primary} />
        </View>
        <View style={styles.deckInfo}>
          <Text style={styles.deckName}>{name}</Text>
          <View style={styles.deckMetaRow}>
            <Text style={styles.deckCount}>{totalCards} cards</Text>
            {subject && (
              <View style={styles.subjectTag}>
                <Text style={styles.subjectTagTxt}>{subject}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.deckCardRight}>
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
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                'Delete Deck',
                `Are you sure you want to delete "${name}"? This will permanently delete all cards and progress.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: onDelete },
                ]
              );
            }}
            style={({ pressed }) => [
              styles.deckDeleteBtn,
              pressed && { opacity: 0.6 },
            ]}
            hitSlop={12}
          >
            <Ionicons name="trash-outline" size={16} color="#c04070" />
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── HomeScreen ──────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { decks, streak, totalMastered, getTotalDueCards, deleteDeck, getDeckMastery } = useNexaStore();
  const totalDue = getTotalDueCards();
  const deckMastery = getDeckMastery();
  const accuracy = deckMastery.length > 0
    ? Math.round(deckMastery.reduce((sum, d) => sum + d.mastery, 0) / deckMastery.length)
    : 0;

  const recentGuides = [...decks]
    .sort((a, b) => {
      const dateA = a.lastStudiedDate || a.createdDate || '';
      const dateB = b.lastStudiedDate || b.createdDate || '';
      return dateB.localeCompare(dateA);
    })
    .slice(0, 5);

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

  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options).toUpperCase();
  };

  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
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
          {/* Header Row: Streak & Circle Actions */}
          <View style={styles.topActionsRow}>
            <Pressable style={styles.streakCapsule} onPress={() => router.push('/progress' as any)}>
              <Ionicons name="flame" size={16} color="#e8873a" />
              <Text style={styles.streakCapsuleText}>{streak} day streak!</Text>
            </Pressable>

            <View style={styles.circleActionsGroup}>
              <Pressable style={styles.circleActionButton} onPress={() => Alert.alert('Notifications', 'Your Scholar notifications are all caught up!')}>
                <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
              </Pressable>
              <Pressable style={styles.circleActionButton} onPress={() => router.push('/profile' as any)}>
                <Ionicons name="settings-outline" size={18} color={Colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* Date & Bold Dynamic Greeting */}
          <View style={styles.greetingHeaderBlock}>
            <Text style={styles.dateLabelText}>{getFormattedDate()}</Text>
            <Text style={styles.greetingGreetingText}>
              {getGreetingText()} <Text style={styles.greetingNameText}>J_Stellar6!</Text>
            </Text>
          </View>

          {/* Scholar Nexa Owl Speech Bubble Mascot Banner */}
          <View style={styles.mascotSpeechContainer}>
            <View style={styles.mascotWrapper}>
              <Image
                source={require('../../assets/nexa (2).png')}
                style={styles.mascotImage}
                contentFit="contain"
              />
            </View>
            <View style={styles.speechTriangleBorder} />
            <View style={styles.speechTriangleFill} />
            <View style={styles.speechBubble}>
              <Text style={styles.speechMascotName}>Nexa</Text>
              <Text style={styles.speechBubbleText}>
                {(() => {
                  // High streak + cards due
                  if (streak >= 7 && totalDue > 0)
                    return `Amazing ${streak}-day streak, Scholar! You have ${totalDue} card${totalDue !== 1 ? 's' : ''} to review. Keep that momentum going — you're unstoppable!`;
                  // High accuracy celebration
                  if (accuracy >= 80 && totalMastered > 0)
                    return `Wow, ${accuracy}% accuracy! You've mastered ${totalMastered} card${totalMastered !== 1 ? 's' : ''}. Your dedication is truly paying off, Scholar!`;
                  // Lots of cards due — nudge
                  if (totalDue > 10)
                    return `Hoot! ${totalDue} cards are waiting for review today. A focused session now will keep your knowledge sharp. Let's dive in!`;
                  // Some cards due
                  if (totalDue > 0)
                    return `J_Stellar6, hoot! You have ${totalDue} review card${totalDue !== 1 ? 's' : ''} scheduled today. Keep your ${streak}-day streak alive!`;
                  // No cards due but low accuracy — encourage practice
                  if (accuracy < 50 && decks.length > 0)
                    return `Your accuracy is at ${accuracy}%. Try reviewing your decks or creating a practice test to strengthen your knowledge!`;
                  // All clear + has decks
                  if (decks.length > 0 && totalDue === 0)
                    return `All caught up! No reviews due today. Why not generate an AI study guide or take a practice test to level up?`;
                  // New user — no decks
                  if (decks.length === 0)
                    return `Welcome, Scholar! Create your first deck or import study materials to begin your learning journey with me!`;
                  // Default
                  return `Ready for today's session? Let's keep building your knowledge, one card at a time!`;
                })()}
              </Text>
            </View>
          </View>

          {/* Quick Stats Capsule Bar */}
          <LinearGradient
            colors={['rgba(124, 92, 191, 0.7)', 'rgba(90, 60, 160, 0.85)', 'rgba(60, 40, 120, 0.7)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickStatsBar}
          >
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIconCircle, { backgroundColor: 'rgba(90, 159, 212, 0.15)' }]}>  
                <Ionicons name="book" size={14} color="#5a9fd4" />
              </View>
              <Text style={styles.quickStatValue}>{decks.length}</Text>
              <Text style={styles.quickStatLabel}>DECKS</Text>
            </View>
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIconCircle, { backgroundColor: 'rgba(90, 184, 122, 0.15)' }]}>  
                <Ionicons name="layers" size={14} color="#5ab87a" />
              </View>
              <Text style={styles.quickStatValue}>{decks.reduce((sum, d) => sum + d.cards.length, 0)}</Text>
              <Text style={styles.quickStatLabel}>CARDS</Text>
            </View>
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIconCircle, { backgroundColor: 'rgba(200, 160, 240, 0.15)' }]}>  
                <Ionicons name="trophy" size={14} color="#c8a0f0" />
              </View>
              <Text style={styles.quickStatValue}>{totalMastered}</Text>
              <Text style={styles.quickStatLabel}>MASTERED</Text>
            </View>
            <View style={styles.quickStatItem}>
              <View style={[styles.quickStatIconCircle, { backgroundColor: 'rgba(232, 135, 58, 0.15)' }]}>  
                <Ionicons name="analytics" size={14} color="#e8873a" />
              </View>
              <Text style={styles.quickStatValue}>{accuracy}%</Text>
              <Text style={styles.quickStatLabel}>ACCURACY</Text>
            </View>
          </LinearGradient>

          {/* Quick Actions */}
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <View style={styles.quickActionsRow}>
            <Pressable
              style={styles.quickActionCard}
              onPress={() => router.push('/create-deck' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#2e2245' }]}>
                <Ionicons name="create-outline" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.quickActionTitle}>Create Deck</Text>
            </Pressable>

            <Pressable
              style={styles.quickActionCard}
              onPress={() => router.push('/import-deck' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#1a3025' }]}>
                <Ionicons name="sparkles-outline" size={18} color="#5ab87a" />
              </View>
              <Text style={styles.quickActionTitle}>AI Import</Text>
            </Pressable>

            <Pressable
              style={styles.quickActionCard}
              onPress={() => router.push({ pathname: '/study-guide' as any, params: { mode: 'document' } })}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#1a2540' }]}>
                <Ionicons name="book-outline" size={18} color="#5a9fd4" />
              </View>
              <Text style={styles.quickActionTitle}>Study Guide</Text>
            </Pressable>

            <Pressable
              style={styles.quickActionCard}
              onPress={() => router.push('/ai-tutor' as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: '#3a1a2e' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#e8873a" />
              </View>
              <Text style={styles.quickActionTitle}>Ask Nexa</Text>
            </Pressable>
          </View>


          {/* Recents Section */}
          {recentGuides.length > 0 && (
            <View style={styles.recentsContainer}>
              <Text style={styles.sectionLabel}>RECENTS</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentsScroll}
              >
                {recentGuides.map((guide) => (
                  <Pressable
                    key={guide.id}
                    style={styles.recentCard}
                    onPress={() => {
                      if (guide.keyTerms && guide.keyTerms.length > 0) {
                        router.push({
                          pathname: '/study-guide' as any,
                          params: { deckId: guide.id },
                        });
                      } else {
                        router.push({
                          pathname: '/study-session' as any,
                          params: { deckId: guide.id },
                        });
                      }
                    }}
                  >
                    <View style={styles.recentCardHeader}>
                      <View style={[styles.recentEmojiBox, { backgroundColor: '#f0eaff' }]}>
                        <Ionicons name="book" size={12} color={Colors.primary} />
                      </View>
                      <Text style={styles.recentDate}>{guide.createdDate || '19/05/2026'}</Text>
                    </View>
                    <Text style={guide.name.length > 14 ? styles.recentNameSmall : styles.recentName} numberOfLines={2}>
                      {guide.name}
                    </Text>
                    <Text style={styles.recentCardsCount}>
                      {guide.cards.length} cards
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

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
              subject={deck.subject}
              onPress={() => {
                if (deck.keyTerms && deck.keyTerms.length > 0) {
                  router.push({
                    pathname: '/study-guide' as any,
                    params: { deckId: deck.id },
                  });
                } else {
                  router.push({
                    pathname: '/study-session' as any,
                    params: { deckId: deck.id },
                  });
                }
              }}
              onDelete={() => deleteDeck(deck.id)}
            />
          ))}

          {decks.length === 0 && (
            <View style={styles.emptyState}>
              <Image
                source={require('../../assets/Nexa.png')}
                style={styles.emptyOwl}
                contentFit="contain"
              />
              <Text style={styles.emptyText}>
                No decks yet! Head over to the Study Center to get started.
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>
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
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  streakCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.accentBadgeBg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 8,
  },
  streakCapsuleText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.headingText,
  },
  circleActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  circleActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingHeaderBlock: {
    marginBottom: Spacing.lg,
  },
  dateLabelText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.mutedText,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  greetingGreetingText: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.headingText,
    lineHeight: 32,
  },
  greetingNameText: {
    fontFamily: Fonts.display,
    color: Colors.primary,
  },
  mascotSpeechContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: Spacing.md,
  },
  mascotWrapper: {
    width: 140,
    height: 140,
    marginRight: -55,
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -8 }],
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  speechBubble: {
    flex: 1,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.xl,
    paddingRight: Spacing.xl,
    paddingLeft: 44,
    position: 'relative',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  speechTriangleBorder: {
    position: 'absolute',
    left: 74.5,
    top: 41.5,
    zIndex: 3,
    width: 0,
    height: 0,
    borderTopWidth: 8.5,
    borderTopColor: 'transparent',
    borderRightWidth: 15.5,
    borderRightColor: Colors.cardBorder,
    borderBottomWidth: 8.5,
    borderBottomColor: 'transparent',
  },
  speechTriangleFill: {
    position: 'absolute',
    left: 76,
    top: 42,
    zIndex: 4,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderRightWidth: 14,
    borderRightColor: Colors.cardSurface,
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
  },
  speechMascotName: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.primary,
    marginBottom: 4,
  },
  speechBubbleText: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.headingText,
    lineHeight: 20,
  },
  speechButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: Spacing.lg,
  },
  speechButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.white,
  },

  // Quick Stats Capsule Bar (Gradient Glass)
  quickStatsBar: {
    flexDirection: 'row',
    borderRadius: BorderRadius.xxl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  quickStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickStatIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickStatValue: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: 18,
    color: Colors.white,
    lineHeight: 22,
  },
  quickStatLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
    marginTop: 1,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.headingText,
    textAlign: 'center',
  },

  // Section
  sectionLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.mutedText,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: Spacing.xxl,
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
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
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
    fontSize: 16,
    color: Colors.headingText,
  },
  deckCount: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.mutedText,
  },
  deckMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  subjectTag: {
    backgroundColor: Colors.accentBadgeBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: Colors.primary,
  },
  subjectTagTxt: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.primary,
  },
  duePill: {
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
  },
  duePillText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
  },
  deckCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deckDeleteBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#ffe8f0',
    justifyContent: 'center',
    alignItems: 'center',
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


  // Interactive FAB Overlay Styles
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99,
  },
  backdropBackground: {
    flex: 1,
    backgroundColor: '#000000',
  },
  menuCard: {
    position: 'absolute',
    bottom: 99,
    right: Spacing.xxl,
    left: Spacing.xxl,
    backgroundColor: Colors.cardSurface,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.xl,
    zIndex: 100,
    elevation: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  menuHeader: {
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    paddingBottom: Spacing.md,
  },
  menuTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: Colors.headingText,
  },
  menuSubtitle: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.mutedText,
    marginTop: 2,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  menuOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOptionTextCol: {
    flex: 1,
  },
  menuOptionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 15,
    color: Colors.headingText,
  },
  menuOptionDesc: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.mutedText,
    marginTop: 1,
  },
  subMenu: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  subMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  subMenuItemText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.headingText,
  },

  // FAB Base Container
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: Spacing.xxl,
    width: 56,
    height: 56,
    zIndex: 101,
  },
  fab: {
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

  // Recents List Styles
  recentsContainer: {
    marginTop: Spacing.md,
    marginBottom: 0,
  },
  recentsScroll: {
    paddingLeft: 2,
    paddingRight: Spacing.xxl,
    paddingVertical: Spacing.sm,
    gap: Spacing.xl,
  },
  recentCard: {
    width: 180,
    height: 95,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: 10,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  recentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recentEmojiBox: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accentBadgeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentEmoji: {
    fontSize: 16,
  },
  recentDate: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.mutedText,
  },
  recentName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.headingText,
    lineHeight: 18,
    marginBottom: 4,
  },
  recentNameSmall: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.headingText,
    lineHeight: 16,
    marginBottom: 4,
  },
  recentCardsCount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 12,
    color: Colors.primary,
    marginTop: 'auto',
  },
});
