/**
 * Nexa — Study Center Dashboard Screen
 * High-fidelity premium hub for organizing study decks, managing AI Summaries,
 * and utilizing the custom Study Creator Menu.
 */

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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

import { BorderRadius, Colors, Fonts, Spacing } from '@/constants/theme';
import { useNexaStore } from '@/store/useNexaStore';

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const { decks, deleteDeck, getTotalDueCards, getDueCards, getCardDifficulty } = useNexaStore();
  const totalDue = getTotalDueCards();

  const [selectedSubject, setSelectedSubject] = useState<string>('All');

  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = { All: decks.length };
    for (const sub of ['Math', 'Science', 'Languages', 'History', 'Arts', 'Other']) {
      counts[sub] = decks.filter((d) => d.subject === sub).length;
    }
    return counts;
  }, [decks]);

  const filteredDecks = useMemo(() => {
    if (selectedSubject === 'All') return decks;
    return decks.filter((d) => d.subject === selectedSubject);
  }, [decks, selectedSubject]);

  const aiGuides = useMemo(() => filteredDecks.filter(
    (d) => (d.keyTerms && d.keyTerms.length > 0) || (d.keyConcepts && d.keyConcepts.length > 0)
  ), [filteredDecks]);

  const standardDecks = useMemo(() => filteredDecks.filter((d) => !aiGuides.includes(d)), [filteredDecks, aiGuides]);

  const activeStudiesCount = filteredDecks.length;
  const activeAiGuidesCount = aiGuides.length;
  const activeDueCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let total = 0;
    for (const deck of filteredDecks) {
      for (const card of deck.cards) {
        if (card.nextReview <= today) total++;
      }
    }
    return total;
  }, [filteredDecks]);

  const renderDifficultyHeatmap = (deckId: string, mini: boolean = false) => {
    const difficulties = getCardDifficulty(deckId);
    if (difficulties.length === 0) return null;

    return (
      <View style={[styles.heatmapContainer, mini && styles.heatmapContainerMini]}>
        <View style={styles.heatmapHeader}>
          <Text style={styles.heatmapLabel}>Heatmap</Text>
          <View style={styles.heatmapLegend}>
            <View style={[styles.legendDot, { backgroundColor: Colors.heatmap0 }]} />
            <View style={[styles.legendDot, { backgroundColor: Colors.againBorder }]} />
            <View style={[styles.legendDot, { backgroundColor: Colors.hardBorder }]} />
            <View style={[styles.legendDot, { backgroundColor: Colors.easyBorder }]} />
          </View>
        </View>
        <View style={styles.heatmapGrid}>
          {difficulties.map((diffItem) => {
            let color: string = Colors.heatmap0;
            if (diffItem.difficulty === 'easy') color = Colors.easyBorder;
            else if (diffItem.difficulty === 'moderate') color = Colors.hardBorder;
            else if (diffItem.difficulty === 'hard') color = Colors.againBorder;

            return (
              <View
                key={diffItem.card.id}
                style={[styles.heatmapSquare, mini && styles.heatmapSquareMini, { backgroundColor: color }]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  // Create menu sheet animation
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const createAnim = useRef(new Animated.Value(0)).current;

  const toggleCreateMenu = () => {
    if (isCreateOpen) {
      Animated.timing(createAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setIsCreateOpen(false));
    } else {
      setIsCreateOpen(true);
      Animated.spring(createAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  };

// Filter variables have been calculated using useMemo above

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.centerScroll} showsVerticalScrollIndicator={false}>
        {/* Header block with title */}
        <View style={styles.centerHeader}>
          <View>
            <Text style={styles.centerLabel}>Nexa Hub</Text>
            <Text style={styles.centerTitle}>Study Center</Text>
          </View>
        </View>

        {/* Horizontal Subject Filter Tabs */}
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {['All', 'Math', 'Science', 'Languages', 'History', 'Arts', 'Other'].map((sub) => {
              const count = subjectCounts[sub] || 0;
              const isActive = selectedSubject === sub;
              return (
                <Pressable
                  key={sub}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  onPress={() => setSelectedSubject(sub)}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {sub} <Text style={[styles.filterTabCount, isActive && styles.filterTabCountActive]}>({count})</Text>
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Quick stats capsule banner */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatCol}>
            <Text style={styles.quickStatNum}>{activeStudiesCount}</Text>
            <Text style={styles.quickStatLbl}>Active Studies</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatCol}>
            <Text style={styles.quickStatNum}>{activeAiGuidesCount}</Text>
            <Text style={styles.quickStatLbl}>AI Summaries</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatCol}>
            <Text style={[styles.quickStatNum, { color: activeDueCount > 0 ? Colors.primary : Colors.headingText }]}>
              {activeDueCount}
            </Text>
            <Text style={styles.quickStatLbl}>Due Reviews</Text>
          </View>
        </View>

        {/* Dedicated Pomodoro Study Timer Banner */}
        <Pressable
          style={styles.pomodoroBanner}
          onPress={() => router.push('/pomodoro' as any)}
        >
          <LinearGradient
            colors={['#2e1a47', '#1c1030']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pomodoroGradient}
          >
            <View style={styles.pomodoroBannerLeft}>
              <Ionicons name="timer" size={22} color="#e8873a" />
              <View>
                <Text style={styles.pomodoroBannerTitle}>Pomodoro Focus Timer</Text>
                <Text style={styles.pomodoroBannerSub}>Boost productivity with timed study & breaks</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#e8873a" />
          </LinearGradient>
        </Pressable>

        {/* Category 1: AI Study Guides (featured card grid layout) */}
        <Text style={styles.centerSectionTitle}>AI STUDY GUIDES & SUMMARIES</Text>
        {aiGuides.length === 0 ? (
          <View style={styles.emptyPremiumCard}>
            <Ionicons name="sparkles-outline" size={24} color={Colors.mutedText} />
            <Text style={styles.emptyPremiumText}>No AI Study Guides generated yet.</Text>
            <Pressable style={styles.premiumTextLink} onPress={toggleCreateMenu}>
              <Text style={styles.premiumTextLinkTxt}>Generate with AI →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {aiGuides.map((guide) => (
              <Pressable
                key={guide.id}
                style={styles.aiGuidePremiumCard}
                onPress={() => router.push({ pathname: '/study-guide' as any, params: { deckId: guide.id } })}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.aiCardHeader}>
                    <View style={[styles.aiEmojiCircle, { backgroundColor: '#f0eaff' }]}>
                      <Ionicons name="book" size={14} color={Colors.primary} />
                    </View>
                    <Pressable
                      style={styles.deletePremiumBtn}
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation();
                        Alert.alert(
                          'Delete Study Guide',
                          `Delete "${guide.name}" permanently?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteDeck(guide.id) }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#c04070" />
                    </Pressable>
                  </View>
                  <Text style={styles.aiCardName} numberOfLines={2}>{guide.name}</Text>

                  <View style={styles.aiCardStats}>
                    <View style={styles.aiStatBadge}>
                      <Ionicons name="layers" size={10} color={Colors.primary} />
                      <Text style={styles.aiStatTxt}>{guide.cards.length} Cards</Text>
                    </View>
                    {guide.keyTerms && (
                      <View style={[styles.aiStatBadge, { backgroundColor: '#eef8ff' }]}>
                        <Ionicons name="book" size={10} color="#3598db" />
                        <Text style={[styles.aiStatTxt, { color: '#3598db' }]}>{guide.keyTerms.length} Terms</Text>
                      </View>
                    )}
                  </View>
                  {renderDifficultyHeatmap(guide.id, true)}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Category 2: Standard Study Decks */}
        <Text style={styles.centerSectionTitle}>STANDARD FLASHCARD DECKS</Text>
        {standardDecks.length === 0 ? (
          <View style={styles.emptyPremiumCard}>
            <Ionicons name="layers-outline" size={24} color={Colors.mutedText} />
            <Text style={styles.emptyPremiumText}>No flashcard decks created yet.</Text>
            <Pressable style={styles.premiumTextLink} onPress={toggleCreateMenu}>
              <Text style={styles.premiumTextLinkTxt}>Create manually →</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.standardDecksList}>
            {standardDecks.map((deck) => (
              <Pressable
                key={deck.id}
                style={styles.premiumDeckListItem}
                onPress={() => router.push({ pathname: '/study-session' as any, params: { deckId: deck.id } })}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.listEmojiBox, { backgroundColor: Colors.purpleDeckBg }]}>
                      <Ionicons name="layers" size={14} color={Colors.primary} />
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={styles.listName} numberOfLines={1}>{deck.name}</Text>
                      <Text style={styles.listCardsCount}>{deck.cards.length} flashcards</Text>
                    </View>
                    <View style={styles.listRight}>
                      {getDueCards(deck.id).length > 0 && (
                        <View style={styles.listDuePill}>
                          <Text style={styles.listDueText}>{getDueCards(deck.id).length} due</Text>
                        </View>
                      )}
                      <Pressable
                        style={styles.deletePremiumBtn}
                        hitSlop={8}
                        onPress={(e) => {
                          e.stopPropagation();
                          Alert.alert(
                            'Delete Deck',
                            `Delete "${deck.name}" permanently?`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => deleteDeck(deck.id) }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="trash-outline" size={15} color="#c04070" />
                      </Pressable>
                    </View>
                  </View>
                  {renderDifficultyHeatmap(deck.id, false)}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Gorgeous Creation Modal Overlay ("+ button") */}
      {isCreateOpen && (
        <>
          <Pressable style={styles.modalBackdrop} onPress={toggleCreateMenu}>
            <Animated.View
              style={[
                styles.backdropBg,
                {
                  opacity: createAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  }),
                },
              ]}
            />
          </Pressable>

          <Animated.View
            style={[
              styles.modalPanel,
              {
                opacity: createAnim,
                transform: [
                  {
                    translateY: createAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.headerBar} />
              <Text style={styles.modalTitle}>Scholar Creator</Text>
              <Text style={styles.modalSub}>Select a premium study engine</Text>
            </View>

            {/* Option 1: Manual Deck */}
            <Pressable
              style={styles.engineCard}
              onPress={() => {
                toggleCreateMenu();
                router.push('/create-deck' as any);
              }}
            >
              <View style={[styles.engineIconBox, { backgroundColor: '#f0eaff' }]}>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.engineInfo}>
                <Text style={styles.engineName}>Create Manually</Text>
                <Text style={styles.engineDesc}>Build a classical flashcard deck item</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.mutedText} />
            </Pressable>



            {/* Option 3: AI Study Guide */}
            <Pressable
              style={styles.engineCard}
              onPress={() => {
                toggleCreateMenu();
                router.push({
                  pathname: '/study-guide' as any,
                  params: { mode: 'document' },
                });
              }}
            >
              <View style={[styles.engineIconBox, { backgroundColor: '#eef8ff' }]}>
                <Ionicons name="book-outline" size={20} color="#3598db" />
              </View>
              <View style={styles.engineInfo}>
                <Text style={styles.engineName}>AI Study Guide</Text>
                <Text style={styles.engineDesc}>Generate comprehensive timelines & analytic notes</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.mutedText} />
            </Pressable>

            {/* Option 4: Practice Test */}
            <Pressable
              style={styles.engineCard}
              onPress={() => {
                toggleCreateMenu();
                router.push({
                  pathname: '/practice-test' as any,
                  params: { mode: 'config' },
                });
              }}
            >
              <View style={[styles.engineIconBox, { backgroundColor: '#fff7eb' }]}>
                <Ionicons name="ribbon-outline" size={20} color="#e67e22" />
              </View>
              <View style={styles.engineInfo}>
                <Text style={styles.engineName}>Practice Test</Text>
                <Text style={styles.engineDesc}>Draft a timed diagnostic exam using Gemini</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.mutedText} />
            </Pressable>

          </Animated.View>
        </>
      )}

      {/* Floating Action Button (FAB) */}
      <Pressable style={styles.fab} onPress={toggleCreateMenu}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerScroll: { paddingHorizontal: Spacing.xxl },
  centerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  centerLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.mutedText,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  centerTitle: {
    fontFamily: Fonts.display,
    fontSize: 24,
    color: Colors.headingText,
    marginTop: 4,
  },
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
  quickStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatNum: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: 18,
    color: Colors.headingText,
  },
  quickStatLbl: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.mutedText,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.divider,
  },
  centerSectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.mutedText,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  emptyPremiumCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    paddingVertical: Spacing.giant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  emptyPremiumText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.mutedText,
    textAlign: 'center',
  },
  premiumTextLink: {
    marginTop: Spacing.sm,
  },
  premiumTextLinkTxt: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.primary,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
  aiGuidePremiumCard: {
    width: '47.5%',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  aiEmojiCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePremiumBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff0f5',
  },
  aiCardName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 14,
    color: Colors.headingText,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  aiCardStats: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  aiStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accentBadgeBg,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  aiStatTxt: {
    fontFamily: Fonts.bodyBold,
    fontSize: 8,
    color: Colors.primary,
  },
  standardDecksList: {
    gap: Spacing.md,
    marginBottom: Spacing.xxxl,
  },
  premiumDeckListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  listEmojiBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.headingText,
  },
  listCardsCount: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.mutedText,
    marginTop: 2,
  },
  listRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  listDuePill: {
    backgroundColor: Colors.urgentPillBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  listDueText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.urgentPillText,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdropBg: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  modalPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.cardSurface,
    borderTopLeftRadius: BorderRadius.round,
    borderTopRightRadius: BorderRadius.round,
    paddingHorizontal: Spacing.xxxl,
    paddingBottom: Spacing.massive,
    paddingTop: Spacing.xl,
    zIndex: 101,
    elevation: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  headerBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: 2,
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.headingText,
  },
  modalSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 4,
  },
  engineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  engineIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  engineInfo: {
    flex: 1,
  },
  engineName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.headingText,
  },
  engineDesc: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.mutedText,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 99,
  },
  filterWrapper: {
    marginBottom: Spacing.xl,
  },
  filterScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.xxl,
  },
  filterTab: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  filterTabActive: {
    backgroundColor: Colors.accentBadgeBg,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.mutedText,
  },
  filterTabTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.bodyBold,
  },
  filterTabCount: {
    fontSize: 11,
    color: Colors.mutedText,
  },
  filterTabCountActive: {
    color: Colors.primary,
  },
  heatmapContainer: {
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.md,
  },
  heatmapContainerMini: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
  },
  heatmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heatmapLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.mutedText,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  heatmapSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  heatmapSquareMini: {
    width: 8,
    height: 8,
    borderRadius: 1.5,
  },
  pomodoroBanner: {
    marginVertical: Spacing.md,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8873a',
    elevation: 4,
    shadowColor: '#e8873a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  pomodoroGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  pomodoroBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pomodoroBannerTitle: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.headingText,
  },
  pomodoroBannerSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
  },
});
