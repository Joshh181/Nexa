/**
 * Nexa — Study Center Dashboard Screen
 * High-fidelity premium hub for organizing study decks, managing AI Summaries,
 * and utilizing the custom Study Creator Menu.
 */

import { Ionicons } from '@expo/vector-icons';
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

import { BorderRadius, Colors, Fonts, Spacing } from '@/constants/theme';
import { useNexaStore } from '@/store/useNexaStore';

export default function StudyScreen() {
  const insets = useSafeAreaInsets();
  const { decks, deleteDeck, getTotalDueCards, getDueCards } = useNexaStore();
  const totalDue = getTotalDueCards();

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

  const aiGuides = decks.filter(
    (d) => (d.keyTerms && d.keyTerms.length > 0) || (d.keyConcepts && d.keyConcepts.length > 0)
  );
  const standardDecks = decks.filter((d) => !aiGuides.includes(d));

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

        {/* Quick stats capsule banner */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatCol}>
            <Text style={styles.quickStatNum}>{decks.length}</Text>
            <Text style={styles.quickStatLbl}>Active Studies</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatCol}>
            <Text style={styles.quickStatNum}>{aiGuides.length}</Text>
            <Text style={styles.quickStatLbl}>AI Summaries</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatCol}>
            <Text style={[styles.quickStatNum, { color: totalDue > 0 ? Colors.primary : Colors.headingText }]}>
              {totalDue}
            </Text>
            <Text style={styles.quickStatLbl}>Due Reviews</Text>
          </View>
        </View>

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

            {/* Option 2: AI Import */}
            <Pressable
              style={styles.engineCard}
              onPress={() => {
                toggleCreateMenu();
                router.push('/import-deck' as any);
              }}
            >
              <View style={[styles.engineIconBox, { backgroundColor: '#e8f8ee' }]}>
                <Ionicons name="sparkles-outline" size={20} color="#1a7a40" />
              </View>
              <View style={styles.engineInfo}>
                <Text style={styles.engineName}>AI Document Import</Text>
                <Text style={styles.engineDesc}>Convert PDF/PPT textbook materials instantly</Text>
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
                router.push('/practice-test' as any);
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
});
