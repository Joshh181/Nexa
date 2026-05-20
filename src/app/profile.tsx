/**
 * Nexa — Profile Screen
 * Scholar profile, stats overview, custom API Key management, and about
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';
import { useNexaStore } from '@/store/useNexaStore';
import { isAIConfigured } from '@/services/gemini';

const owlImage = require('../../assets/Nexa.png');

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
  const { decks, streak, totalMastered, getTotalDueCards, customApiKey, setCustomApiKey } = useNexaStore();
  const totalCards = decks.reduce((acc, d) => acc + d.cards.length, 0);
  const totalDue = getTotalDueCards();

  const [inputKey, setInputKey] = useState(customApiKey || '');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSaveKey = () => {
    const trimmed = inputKey.trim();
    if (trimmed !== '' && !trimmed.startsWith('AIzaSy')) {
      Alert.alert('Invalid Key format', 'Gemini API Keys typically begin with "AIzaSy". Please check your key.');
      return;
    }
    setCustomApiKey(trimmed);
    Alert.alert('Key Saved Successfully', 'Your private Gemini API key has been securely saved to this device.');
  };

  const handleClearKey = () => {
    setCustomApiKey('');
    setInputKey('');
    Alert.alert('Key Cleared', 'Your custom key has been removed. Nexa will fall back to default configurations.');
  };

  const handleOpenStudio = () => {
    Linking.openURL('https://aistudio.google.com/');
  };

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

          {/* Gemini AI Key Manager (Tarsi Style!) */}
          <Text style={styles.sectionLabel}>GEMINI AI CONFIGURATION</Text>
          <View style={styles.keyCard}>
            <View style={styles.keyCardHeader}>
              <Text style={styles.keyCardTitle}>Private Device API Key</Text>
              <View style={[
                styles.badge,
                customApiKey ? styles.badgeActive : styles.badgeDefault
              ]}>
                <Text style={[
                  styles.badgeText,
                  customApiKey ? styles.badgeTextActive : styles.badgeTextDefault
                ]}>
                  {customApiKey ? 'Custom Active' : 'Fallback Active'}
                </Text>
              </View>
            </View>
            
            <Text style={styles.keyCardDesc}>
              To study offline with custom limits, enter your own free Gemini API key. All processing occurs locally on your phone.
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.keyInput}
                placeholder="AIzaSy..."
                placeholderTextColor={Colors.mutedText}
                secureTextEntry={secureTextEntry}
                value={inputKey}
                onChangeText={setInputKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setSecureTextEntry(!secureTextEntry)}
              >
                <Ionicons
                  name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.mutedText}
                />
              </Pressable>
            </View>

            <View style={styles.actionsRow}>
              <Pressable style={styles.saveKeyBtn} onPress={handleSaveKey}>
                <Text style={styles.saveKeyBtnText}>Save Key</Text>
              </Pressable>
              {customApiKey !== '' && (
                <Pressable style={styles.clearKeyBtn} onPress={handleClearKey}>
                  <Text style={styles.clearKeyBtnText}>Clear</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.divider} />

            <Pressable style={styles.studioLink} onPress={handleOpenStudio}>
              <Ionicons name="logo-google" size={16} color={Colors.primary} />
              <Text style={styles.studioLinkText}>Get a Free Gemini Key from Google AI Studio</Text>
              <Ionicons name="open-outline" size={12} color={Colors.primary} />
            </Pressable>
          </View>

          {/* About Section */}
          <Text style={styles.sectionLabel}>ABOUT NEXA</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutText}>
              Nexa is a flashcard study app powered by spaced repetition. Create custom decks, import from PDF/PPT with AI, study with smart scheduling, and track your progress — all guided by Nexa, the wise steampunk scholar owl.
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
  profileHeader: { alignItems: 'center', paddingTop: Spacing.xxxl, paddingBottom: Spacing.xl },
  avatarRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.accentBadgeBg, marginBottom: Spacing.lg },
  avatar: { width: 64, height: 64 },
  profileName: { fontFamily: Fonts.display, fontSize: 24, color: Colors.headingText },
  profileBio: { fontFamily: Fonts.body, fontSize: 13, color: Colors.mutedText, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: Spacing.xl },
  pStat: { width: '47%', backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.xxl, padding: Spacing.xl, alignItems: 'center' },
  pStatIcon: { width: 36, height: 36, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  pStatVal: { fontFamily: Fonts.bodyExtraBold, fontSize: 22, color: Colors.headingText },
  pStatLbl: { fontFamily: Fonts.body, fontSize: 11, color: Colors.mutedText, marginTop: 2 },
  infoCard: { backgroundColor: Colors.primary, borderRadius: BorderRadius.pill, flexDirection: 'row', alignItems: 'center', padding: Spacing.xl, marginTop: Spacing.xl, gap: Spacing.lg },
  infoOwl: { width: 44, height: 44 },
  infoTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.white },
  infoSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.subtitleText, marginTop: 2, lineHeight: 16 },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.mutedText, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: Spacing.xxxl, marginBottom: Spacing.lg },
  
  // Custom API Key Card Styles
  keyCard: { backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.card, padding: Spacing.xl },
  keyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  keyCardTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.headingText },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.md },
  badgeActive: { backgroundColor: Colors.easyBg },
  badgeDefault: { backgroundColor: Colors.accentBadgeBg },
  badgeText: { fontFamily: Fonts.bodyBold, fontSize: 10 },
  badgeTextActive: { color: Colors.easyText },
  badgeTextDefault: { color: Colors.primary },
  keyCardDesc: { fontFamily: Fonts.body, fontSize: 11, color: Colors.mutedText, lineHeight: 16, marginBottom: Spacing.lg },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.lg, height: 48, backgroundColor: Colors.background },
  keyInput: { flex: 1, fontFamily: Fonts.body, fontSize: 13, color: Colors.headingText, padding: 0 },
  eyeBtn: { padding: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.xl },
  saveKeyBtn: { flex: 1, height: 44, backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center' },
  saveKeyBtnText: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.white },
  clearKeyBtn: { width: 80, height: 44, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.cardSurface },
  clearKeyBtnText: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.againText },
  divider: { height: 1, backgroundColor: Colors.cardBorder, marginVertical: Spacing.xl },
  studioLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  studioLinkText: { fontFamily: Fonts.bodySemiBold, fontSize: 11, color: Colors.primary },

  aboutCard: { backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.card, padding: Spacing.xl },
  aboutText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.headingText, lineHeight: 20 },
  aboutDivider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.xl },
  aboutVersion: { fontFamily: Fonts.bodySemiBold, fontSize: 12, color: Colors.mutedText },
  aboutCredit: { fontFamily: Fonts.body, fontSize: 11, color: Colors.mutedText, marginTop: 4 },
});
