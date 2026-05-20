/**
 * Nexa — Profile Screen
 * Premium scholar profile with avatar hero, achievement badges,
 * study statistics, settings menu items, and about section.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
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

const owlImage = require('../../assets/Nexa.png');

// ─── Achievement Badge ───────────────────────────────
function AchievementBadge({ icon, iconColor, iconBg, title, subtitle, unlocked }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  unlocked: boolean;
}) {
  return (
    <View style={[styles.badge, !unlocked && styles.badgeLocked]}>
      <View style={[styles.badgeIcon, { backgroundColor: unlocked ? iconBg : '#e8e4f0' }]}>
        <Ionicons name={icon} size={18} color={unlocked ? iconColor : '#c0b8d8'} />
      </View>
      <Text style={[styles.badgeTitle, !unlocked && styles.badgeTitleLocked]}>{title}</Text>
      <Text style={styles.badgeSub}>{subtitle}</Text>
      {unlocked && (
        <View style={styles.badgeCheck}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.easyText} />
        </View>
      )}
    </View>
  );
}

// ─── Settings Menu Row ───────────────────────────────
function SettingsRow({ icon, iconColor, iconBg, title, subtitle, onPress, danger }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingsRow, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={[styles.settingsIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.settingsInfo}>
        <Text style={[styles.settingsTitle, danger && { color: Colors.againText }]}>{title}</Text>
        {subtitle && <Text style={styles.settingsSub}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.mutedText} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { decks, streak, totalMastered, getTotalDueCards, studySessions } = useNexaStore();
  const totalCards = decks.reduce((acc, d) => acc + d.cards.length, 0);
  const totalDue = getTotalDueCards();
  const totalReviewed = studySessions.reduce((sum, s) => sum + s.cardsStudied, 0);
  const aiGuides = decks.filter(d => (d.keyTerms && d.keyTerms.length > 0) || (d.keyConcepts && d.keyConcepts.length > 0));

  // Achievements logic
  const hasFirstDeck = decks.length >= 1;
  const hasStreak3 = streak >= 3;
  const hasStreak7 = streak >= 7;
  const hasMastered10 = totalMastered >= 10;
  const hasReviewed50 = totalReviewed >= 50;
  const hasAIGuide = aiGuides.length >= 1;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 35, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ─── Premium Profile Hero Card ─── */}
          <View style={styles.heroCard}>
            <View style={styles.heroGradientOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.avatarRing}>
                <Image source={owlImage} style={styles.avatar} contentFit="contain" />
              </View>
              <View style={styles.heroTextCol}>
                <Text style={styles.profileName}>J_Stellar6</Text>
                <Text style={styles.profileBio}>Guided by Nexa, the Scholar Owl</Text>
                <View style={styles.levelBadge}>
                  <Ionicons name="shield-checkmark" size={12} color={Colors.white} />
                  <Text style={styles.levelText}>
                    {totalReviewed >= 100 ? 'Master Scholar' : totalReviewed >= 30 ? 'Rising Scholar' : 'New Scholar'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Mini stat pills inside hero */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatPill}>
                <Ionicons name="flame" size={14} color="#e8873a" />
                <Text style={styles.heroStatValue}>{streak}</Text>
                <Text style={styles.heroStatLabel}>Streak</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatPill}>
                <Ionicons name="layers" size={14} color={Colors.primary} />
                <Text style={styles.heroStatValue}>{decks.length}</Text>
                <Text style={styles.heroStatLabel}>Decks</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatPill}>
                <Ionicons name="documents" size={14} color="#3598db" />
                <Text style={styles.heroStatValue}>{totalCards}</Text>
                <Text style={styles.heroStatLabel}>Cards</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStatPill}>
                <Ionicons name="ribbon" size={14} color="#1a7a40" />
                <Text style={styles.heroStatValue}>{totalMastered}</Text>
                <Text style={styles.heroStatLabel}>Mastered</Text>
              </View>
            </View>
          </View>

          {/* ─── Nexa Motivation Banner ─── */}
          <View style={styles.motivationCard}>
            <Image source={owlImage} style={styles.motivOwl} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.motivTitle}>
                {totalDue > 0 ? `${totalDue} cards await you!` : 'All caught up!'}
              </Text>
              <Text style={styles.motivSub}>
                {totalDue > 0
                  ? "The path to mastery is paved with daily practice."
                  : "A well-rested mind retains more. Come back tomorrow!"}
              </Text>
            </View>
          </View>

          {/* ─── Achievements Section ─── */}
          <Text style={styles.sectionLabel}>ACHIEVEMENTS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
            <AchievementBadge
              icon="rocket"
              iconColor="#7c5cbf"
              iconBg="#ede8ff"
              title="First Deck"
              subtitle="Create your first study deck"
              unlocked={hasFirstDeck}
            />
            <AchievementBadge
              icon="flame"
              iconColor="#e8873a"
              iconBg="#fff7eb"
              title="On Fire"
              subtitle="3-day study streak"
              unlocked={hasStreak3}
            />
            <AchievementBadge
              icon="trophy"
              iconColor="#e67e22"
              iconBg="#fff7eb"
              title="Dedicated"
              subtitle="7-day study streak"
              unlocked={hasStreak7}
            />
            <AchievementBadge
              icon="star"
              iconColor="#1a7a40"
              iconBg="#e8f8ee"
              title="Scholar"
              subtitle="Master 10 cards"
              unlocked={hasMastered10}
            />
            <AchievementBadge
              icon="sparkles"
              iconColor="#3598db"
              iconBg="#eef8ff"
              title="AI Explorer"
              subtitle="Generate an AI study guide"
              unlocked={hasAIGuide}
            />
            <AchievementBadge
              icon="book"
              iconColor="#c046a0"
              iconBg="#ffe8f5"
              title="Reviewer"
              subtitle="Review 50 cards total"
              unlocked={hasReviewed50}
            />
          </ScrollView>

          {/* ─── Study Overview Card ─── */}
          <Text style={styles.sectionLabel}>STUDY OVERVIEW</Text>
          <View style={styles.overviewCard}>
            <View style={styles.overviewRow}>
              <View style={[styles.overviewIconBox, { backgroundColor: '#ede8ff' }]}>
                <Ionicons name="checkmark-done" size={16} color={Colors.primary} />
              </View>
              <View style={styles.overviewInfo}>
                <Text style={styles.overviewLabel}>Cards Reviewed</Text>
                <Text style={styles.overviewVal}>{totalReviewed} lifetime reviews</Text>
              </View>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewRow}>
              <View style={[styles.overviewIconBox, { backgroundColor: '#eef8ff' }]}>
                <Ionicons name="sparkles" size={16} color="#3598db" />
              </View>
              <View style={styles.overviewInfo}>
                <Text style={styles.overviewLabel}>AI Study Guides</Text>
                <Text style={styles.overviewVal}>{aiGuides.length} generated</Text>
              </View>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewRow}>
              <View style={[styles.overviewIconBox, { backgroundColor: '#e8f8ee' }]}>
                <Ionicons name="time" size={16} color="#1a7a40" />
              </View>
              <View style={styles.overviewInfo}>
                <Text style={styles.overviewLabel}>Study Sessions</Text>
                <Text style={styles.overviewVal}>{studySessions.length} total sessions</Text>
              </View>
            </View>
          </View>

          {/* ─── Settings & Preferences ─── */}
          <Text style={styles.sectionLabel}>SETTINGS</Text>
          <View style={styles.settingsCard}>
            <SettingsRow
              icon="notifications-outline"
              iconColor={Colors.primary}
              iconBg="#ede8ff"
              title="Notifications"
              subtitle="Study reminders & alerts"
              onPress={() => Alert.alert('Notifications', 'Notification settings coming soon!')}
            />
            <View style={styles.settingsDivider} />
            <SettingsRow
              icon="color-palette-outline"
              iconColor="#e67e22"
              iconBg="#fff7eb"
              title="Appearance"
              subtitle="Theme & display"
              onPress={() => Alert.alert('Appearance', 'Theme customization coming soon!')}
            />
            <View style={styles.settingsDivider} />
            <SettingsRow
              icon="cloud-download-outline"
              iconColor="#1a7a40"
              iconBg="#e8f8ee"
              title="Data & Backup"
              subtitle="Export or restore your study data"
              onPress={() => Alert.alert('Backup', 'Data backup feature coming soon!')}
            />
            <View style={styles.settingsDivider} />
            <SettingsRow
              icon="trash-outline"
              iconColor={Colors.againText}
              iconBg={Colors.againBg}
              title="Clear All Data"
              subtitle="Permanently delete all decks & progress"
              onPress={() => {
                Alert.alert(
                  'Clear All Data',
                  'Are you sure? This will permanently delete all your decks, cards, and study progress. This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete Everything',
                      style: 'destructive',
                      onPress: () => {
                        // Clear all decks
                        const store = useNexaStore.getState();
                        store.decks.forEach(d => store.deleteDeck(d.id));
                      },
                    },
                  ]
                );
              }}
              danger
            />
          </View>

          {/* ─── About Section ─── */}
          <Text style={styles.sectionLabel}>ABOUT NEXA</Text>
          <View style={styles.aboutCard}>
            <View style={styles.aboutHeader}>
              <Image source={owlImage} style={styles.aboutOwl} contentFit="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.aboutAppName}>Nexa</Text>
                <Text style={styles.aboutTagline}>Your AI-Powered Study Companion</Text>
              </View>
            </View>
            <View style={styles.aboutDivider} />
            <Text style={styles.aboutText}>
              Nexa is a premium flashcard study app powered by spaced repetition and AI. Create custom decks, import from PDF/PPT with Gemini AI, generate comprehensive study guides, and track your progress — all guided by Nexa, the wise scholar owl.
            </Text>
            <View style={styles.aboutDivider} />
            <View style={styles.aboutFooter}>
              <Text style={styles.aboutVersion}>Version 1.0.0</Text>
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

  // ─── Hero Card ───
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.round,
    overflow: 'hidden',
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  heroGradientOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(61,43,138,0.15)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  avatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginRight: Spacing.lg,
  },
  avatar: { width: 44, height: 44 },
  heroTextCol: { flex: 1 },
  profileName: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.white,
  },
  profileBio: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  levelText: {
    fontFamily: Fonts.bodyBold,
    fontSize: 9,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.12)',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  heroStatPill: { alignItems: 'center', flex: 1 },
  heroStatValue: {
    fontFamily: Fonts.bodyExtraBold,
    fontSize: 16,
    color: Colors.white,
    marginTop: 2,
  },
  heroStatLabel: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 8,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginTop: 1,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // ─── Motivation Banner ───
  motivationCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  motivOwl: { width: 36, height: 36 },
  motivTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.headingText,
  },
  motivSub: {
    fontFamily: Fonts.body,
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 2,
    lineHeight: 16,
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

  // ─── Achievements ───
  achievementsScroll: {
    gap: Spacing.md,
    paddingRight: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  badge: {
    width: 110,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    alignItems: 'center',
    position: 'relative',
  },
  badgeLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  badgeTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.headingText,
    textAlign: 'center',
  },
  badgeTitleLocked: {
    color: Colors.mutedText,
  },
  badgeSub: {
    fontFamily: Fonts.body,
    fontSize: 8,
    color: Colors.mutedText,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 11,
  },
  badgeCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  // ─── Study Overview ───
  overviewCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  overviewInfo: { flex: 1 },
  overviewLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.headingText,
  },
  overviewVal: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.mutedText,
    marginTop: 1,
  },
  overviewDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.lg,
  },

  // ─── Settings ───
  settingsCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  settingsInfo: { flex: 1 },
  settingsTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: 13,
    color: Colors.headingText,
  },
  settingsSub: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.mutedText,
    marginTop: 1,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.md,
  },

  // ─── About ───
  aboutCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  aboutOwl: { width: 36, height: 36 },
  aboutAppName: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.headingText,
  },
  aboutTagline: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 10,
    color: Colors.mutedText,
    marginTop: 2,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.lg,
  },
  aboutText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.headingText,
    lineHeight: 19,
  },
  aboutFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutVersion: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 11,
    color: Colors.mutedText,
  },
  aboutCredit: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.mutedText,
  },
});
