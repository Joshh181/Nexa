/**
 * Nexa — Profile Screen
 * Scholar profile, stats overview, and settings
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';
import { useNexaStore } from '@/store/useNexaStore';

const owlImage = require('@/assets/Gemini_Generated_Image_z7k15sz7k15sz7k1-clean-removebg-preview.png');

function ProfileStat({ icon, iconColor, iconBg, value, label }: {
  icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string; value: string; label: string;
}) {
  return (
    <View style={styles.pStat}>
      <View style={[styles.pStatIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.pStatVal}>{value}</Text>
      <Text style={styles.pStatLbl}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { decks, streak, totalMastered, getTotalDueCards } = useNexaStore();
  const totalCards = decks.reduce((acc, d) => acc + d.cards.length, 0);
  const totalDue = getTotalDueCards();

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
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarRing}>
              <Image source={owlImage} style={styles.avatar} contentFit="contain" />
            </View>
            <Text style={styles.profileName}>Scholar</Text>
            <Text style={styles.profileBio}>Guided by Nexa, the steampunk owl</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <ProfileStat icon="flame" iconColor="#e8873a" iconBg={Colors.accentBadgeBg} value={String(streak)} label="Day Streak" />
            <ProfileStat icon="layers" iconColor={Colors.primary} iconBg={Colors.accentBadgeBg} value={String(decks.length)} label="Decks" />
            <ProfileStat icon="documents" iconColor="#5a8ab8" iconBg={Colors.blueDeckBg} value={String(totalCards)} label="Total Cards" />
            <ProfileStat icon="star" iconColor="#5ab87a" iconBg={Colors.greenDeckBg} value={String(totalMastered)} label="Mastered" />
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Image source={owlImage} style={styles.infoOwl} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>
                {totalDue > 0 ? `${totalDue} cards await you!` : 'All caught up!'}
              </Text>
              <Text style={styles.infoSub}>
                {totalDue > 0
                  ? "Nexa says: The path to mastery is paved with daily practice."
                  : "Nexa says: A well-rested mind retains more. Come back tomorrow!"}
              </Text>
            </View>
          </View>

          {/* About Section */}
          <Text style={styles.sectionLabel}>ABOUT NEXA</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>
              Nexa is a flashcard study app powered by spaced repetition. Create custom decks, study with smart scheduling, and track your progress — all guided by Nexa, the wise steampunk scholar owl.
            </Text>
            <View style={styles.aboutDivider} />
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutCredit}>Inspired by Tarsi by Bryl Lim</Text>
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

  // Profile Header
  profileHeader: { alignItems: 'center', paddingTop: Spacing.xxxl, paddingBottom: Spacing.xl },
  avatarRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.accentBadgeBg, marginBottom: Spacing.lg },
  avatar: { width: 64, height: 64 },
  profileName: { fontFamily: Fonts.display, fontSize: 24, color: Colors.headingText },
  profileBio: { fontFamily: Fonts.body, fontSize: 13, color: Colors.mutedText, marginTop: 4 },

  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: Spacing.xl },
  pStat: { width: '47%', backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.xxl, padding: Spacing.xl, alignItems: 'center' },
  pStatIcon: { width: 36, height: 36, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  pStatVal: { fontFamily: Fonts.bodyExtraBold, fontSize: 22, color: Colors.headingText },
  pStatLbl: { fontFamily: Fonts.body, fontSize: 11, color: Colors.mutedText, marginTop: 2 },

  // Info Card
  infoCard: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, marginTop: Spacing.xl, gap: Spacing.lg },
  infoOwl: { width: 44, height: 44 },
  infoTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.white },
  infoSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.subtitleText, marginTop: 2, lineHeight: 16 },

  // Section
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: Spacing.xxxl, marginBottom: Spacing.lg },

  // About
  aboutCard: { backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.card, padding: Spacing.xl },
  aboutText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.headingText, lineHeight: 20 },
  aboutDivider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.xl },
  aboutVersion: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.mutedText },
  aboutCredit: { fontFamily: Fonts.body, fontSize: 11, color: Colors.mutedText, marginTop: 4 },
});
