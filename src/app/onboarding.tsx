/**
 * Nexa — Onboarding Tutorial
 * First-launch walkthrough with Nexa guiding through features
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
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
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  nexaSays: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'sparkles',
    iconColor: Colors.primary,
    iconBg: Colors.accentBadgeBg,
    title: 'Welcome to Nexa',
    subtitle: 'Your AI-Powered Study Companion',
    nexaSays: "Hoot! I'm Nexa, your scholarly owl tutor. I'll help you study smarter with spaced repetition, AI-generated flashcards, and interactive quizzes!",
  },
  {
    icon: 'layers',
    iconColor: '#5a9fd4',
    iconBg: '#1a2540',
    title: 'Smart Study Decks',
    subtitle: 'Create & Import Flashcards',
    nexaSays: 'Create decks manually, or let me generate them from your documents, photos, and notes using AI. I can turn any material into study cards!',
  },
  {
    icon: 'bulb',
    iconColor: '#c046a0',
    iconBg: '#3a1a2e',
    title: 'Spaced Repetition',
    subtitle: 'Remember More, Study Less',
    nexaSays: "I use SM-2 algorithm to schedule your reviews at the perfect time. Rate cards as Easy, Hard, or Again — I'll bring them back when your brain needs them most!",
  },
  {
    icon: 'chatbubble-ellipses',
    iconColor: '#e8873a',
    iconBg: '#3a2a1a',
    title: 'AI Tutor & Quizzes',
    subtitle: 'Interactive Learning Tools',
    nexaSays: "Ask me questions about your study material anytime! I can also create multiple choice, fill-in-the-blank, and true/false quizzes from your cards.",
  },
  {
    icon: 'trophy',
    iconColor: '#5ab87a',
    iconBg: '#1a3025',
    title: "Let's Begin!",
    subtitle: 'Your Journey Starts Now',
    nexaSays: "You're all set, Scholar! Keep up your daily streak, track your progress, and together we'll master anything. Hoot hoot — let's go!",
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useNexaStore();
  const scrollRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const idx = Math.round(offsetX / SCREEN_WIDTH);
    if (idx !== currentSlide) {
      setCurrentSlide(idx);
    }
  };

  const goToSlide = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: true });
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      goToSlide(currentSlide + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    completeOnboarding();
    router.replace('/' as any);
  };

  const isLastSlide = currentSlide === SLIDES.length - 1;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Skip Button */}
      {!isLastSlide && (
        <Pressable style={styles.skipBtn} onPress={handleSkip}>
          <Text style={styles.skipBtnText}>Skip</Text>
        </Pressable>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide, idx) => (
          <View key={idx} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* Icon */}
            <View style={[styles.slideIconCircle, { backgroundColor: slide.iconBg }]}>
              <Ionicons name={slide.icon} size={40} color={slide.iconColor} />
            </View>

            {/* Title */}
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>

            {/* Nexa Speech */}
            <View style={styles.nexaSpeechCard}>
              <Image source={owlImage} style={styles.nexaAvatar} contentFit="contain" />
              <View style={styles.speechBubble}>
                <Text style={styles.speechName}>Nexa says:</Text>
                <Text style={styles.speechText}>{slide.nexaSays}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Controls */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === currentSlide && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next / Get Started Button */}
        <Pressable style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {isLastSlide ? "Let's Go!" : 'Next'}
          </Text>
          <Ionicons
            name={isLastSlide ? 'rocket' : 'arrow-forward'}
            size={18}
            color={Colors.white}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipBtn: {
    position: 'absolute',
    top: 60,
    right: Spacing.xxl,
    zIndex: 10,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  skipBtnText: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.mutedText,
  },

  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.huge,
  },

  slideIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },

  slideTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.headingText,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  slideSubtitle: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 14,
    color: Colors.mutedText,
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },

  nexaSpeechCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    padding: Spacing.xl,
    gap: Spacing.lg,
    width: '100%',
  },
  nexaAvatar: {
    width: 48,
    height: 48,
  },
  speechBubble: {
    flex: 1,
  },
  speechName: {
    fontFamily: Fonts.bodyBold,
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 4,
  },
  speechText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.headingText,
    lineHeight: 20,
  },

  bottomBar: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
    gap: Spacing.xxl,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.cardBorder,
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },

  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xxl,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  nextBtnText: {
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.white,
  },
});
