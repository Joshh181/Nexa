/**
 * Nexa — Active Flashcard Study Session Screen
 * Dedicated full-screen utility route for reviewing decks, flipping flashcards, rating cards with SM-2,
 * and showing owl study motivation tips.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BorderRadius, Colors, Fonts, Spacing } from '@/constants/theme';
import { useNexaStore, type Card } from '@/store/useNexaStore';

const NEXA_TIPS = [
  "Nexa says: A wise scholar reviews hard cards first.",
  "Nexa says: Spaced repetition is the ancient art of remembering.",
  "Nexa says: Mark 'Hard' freely — I'll bring them back at the right moment.",
  "Nexa says: Even the owl reviews at night. Consistency beats intensity.",
  "Nexa says: Take your time. True knowledge cannot be rushed.",
  "Nexa says: Every card reviewed is a step towards mastery.",
  "Nexa says: The journey of a thousand cards begins with a single flip.",
  "Nexa says: Trust the process, Scholar. Your brain is building connections.",
];

const owlImage = require('../../assets/Nexa.png');

function CelebrationModal({ onClose }: { onClose: () => void }) {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.spring(bounceAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.celebOverlay, { opacity: fadeAnim }]}>
      <Animated.View style={[styles.celebCard, { transform: [{ scale: bounceAnim }] }]}>
        <Image source={owlImage} style={styles.celebOwl} contentFit="contain" />
        <Text style={styles.celebTitle}>Splendid, Scholar!</Text>
        <Text style={styles.celebSub}>Nexa is proud of you. You've completed this session!</Text>
        <Pressable style={styles.celebBtn} onPress={onClose}>
          <Text style={styles.celebBtnTxt}>Continue</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function FlashCard({ card, isFlipped, onFlip }: { card: Card; isFlipped: boolean; onFlip: () => void }) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(flipAnim, { toValue: isFlipped ? 1 : 0, duration: 400, useNativeDriver: true }).start();
  }, [isFlipped]);

  const frontRotate = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '90deg', '90deg'] });
  const backRotate = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['90deg', '90deg', '0deg'] });
  const frontOp = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 0] });
  const backOp = flipAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

  return (
    <Pressable onPress={onFlip} style={styles.fcContainer}>
      <Animated.View style={[styles.fc, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }], opacity: frontOp }]}>
        <View style={styles.fcBadge}><Text style={styles.fcBadgeTxt}>Question</Text></View>
        <Text style={styles.fcQ}>{card.front}</Text>
        {!isFlipped && <Text style={styles.tapHint}>tap to reveal →</Text>}
      </Animated.View>
      <Animated.View style={[styles.fc, styles.fcBack, { transform: [{ perspective: 1000 }, { rotateY: backRotate }], opacity: backOp }]}>
        <View style={[styles.fcBadge, { backgroundColor: Colors.easyBg }]}><Text style={styles.fcBadgeTxt}>Answer</Text></View>
        <Text style={styles.fcQ}>{card.front}</Text>
        <View style={styles.fcDiv} />
        <Text style={styles.fcA}>{card.back}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function StudySessionScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ deckId?: string }>();
  const { decks, rateCard, getDueCards, recordStudySession } = useNexaStore();

  const deck = useMemo(() => decks.find((d) => d.id === params.deckId), [decks, params.deckId]);

  // Capture stable session cards list to prevent mid-session mutations and index out-of-bounds crashes
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showCeleb, setShowCeleb] = useState(false);
  const [completed, setCompleted] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const ratingFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (params.deckId) {
      const cards = getDueCards(params.deckId);
      setSessionCards(cards);
      setIdx(0);
      setCompleted(0);
      setFlipped(false);
      setShowRating(false);
      setShowCeleb(false);
    }
  }, [params.deckId]);

  useEffect(() => {
    if (sessionCards.length > 0) {
      Animated.timing(progressAnim, { toValue: (idx + 1) / sessionCards.length, duration: 300, useNativeDriver: false }).start();
    }
  }, [idx, sessionCards.length]);

  useEffect(() => {
    if (showRating) {
      Animated.timing(ratingFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    } else {
      ratingFade.setValue(0);
    }
  }, [showRating]);

  const handleFlip = () => {
    if (!flipped) {
      setFlipped(true);
      setShowRating(true);
    }
  };

  const handleRate = (rating: 'again' | 'hard' | 'easy') => {
    if (!deck || !sessionCards[idx]) return;
    rateCard(deck.id, sessionCards[idx].id, rating);
    const newC = completed + 1;
    setCompleted(newC);

    Animated.timing(slideAnim, { toValue: -400, duration: 250, useNativeDriver: true }).start(() => {
      if (idx + 1 >= sessionCards.length) {
        recordStudySession(newC);
        setShowCeleb(true);
      } else {
        setIdx(i => i + 1);
        setFlipped(false);
        setShowRating(false);
        slideAnim.setValue(300);
        Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }).start();
      }
    });
  };

  // IF NO DECK SPECIFIED OR ALL CAUGHT UP
  if (!params.deckId || sessionCards.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={16} color={Colors.primary} />
            <Text style={styles.backTxt}>Back</Text>
          </Pressable>
        </View>
        <View style={styles.emptyC}>
          <Image source={owlImage} style={styles.emptyOwl} contentFit="contain" />
          <Text style={styles.emptyT}>{!deck ? 'Select a Deck' : 'All caught up!'}</Text>
          <Text style={styles.emptySub}>
            {!deck
              ? 'Choose a study deck from the dashboard to review.'
              : 'Nexa says: Splendid! You have no reviews scheduled today.'}
          </Text>
          <Pressable style={styles.homeBtn} onPress={() => router.push('/' as any)}>
            <Text style={styles.homeBtnTxt}>Go to Dashboard</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {showCeleb && (
        <CelebrationModal
          onClose={() => {
            setShowCeleb(false);
            router.back();
          }}
        />
      )}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={16} color={Colors.primary} />
            <Text style={styles.backTxt}>Back</Text>
          </Pressable>
          <Text style={styles.deckTitle} numberOfLines={1}>{deck.name}</Text>
          <Text style={styles.counter}>{idx + 1} / {sessionCards.length}</Text>
        </View>

        <View style={styles.progTrack}>
          <Animated.View
            style={[
              styles.progFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          <FlashCard card={sessionCards[idx]} isFlipped={flipped} onFlip={handleFlip} />
        </Animated.View>

        {showRating && (
          <Animated.View style={[styles.ratingRow, { opacity: ratingFade }]}>
            <Pressable style={[styles.rBtn, styles.rAgain]} onPress={() => handleRate('again')}>
              <Text style={[styles.rLbl, { color: Colors.againText }]}>Again</Text>
            </Pressable>
            <Pressable style={[styles.rBtn, styles.rHard]} onPress={() => handleRate('hard')}>
              <Text style={[styles.rLbl, { color: Colors.hardText }]}>Hard</Text>
            </Pressable>
            <Pressable style={[styles.rBtn, styles.rEasy]} onPress={() => handleRate('easy')}>
              <Text style={[styles.rLbl, { color: Colors.easyText }]}>Easy</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.tipBox}>
          <Image source={owlImage} style={styles.tipOwl} contentFit="contain" />
          <Text style={styles.tipTxt}>{NEXA_TIPS[idx % NEXA_TIPS.length]}</Text>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg, marginBottom: Spacing.xl },
  backBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 6, gap: 4 },
  backTxt: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.primary },
  deckTitle: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.headingText, flex: 1, textAlign: 'center', marginHorizontal: Spacing.md },
  counter: { fontFamily: Fonts.bodySemiBold, fontSize: 11, color: Colors.mutedText },
  progTrack: { height: 6, backgroundColor: Colors.cardBorder, borderRadius: 3, marginBottom: Spacing.xxxl, overflow: 'hidden' },
  progFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  fcContainer: { minHeight: 280, marginBottom: Spacing.xxl },
  fc: { backgroundColor: Colors.cardSurface, borderWidth: 1.5, borderColor: '#d4c8f8', borderRadius: BorderRadius.round, padding: Spacing.xxxl, minHeight: 280, justifyContent: 'center', backfaceVisibility: 'hidden' },
  fcBack: { position: 'absolute', top: 0, left: 0, right: 0 },
  fcBadge: { position: 'absolute', top: Spacing.xl, left: Spacing.xl, backgroundColor: Colors.accentBadgeBg, paddingHorizontal: Spacing.md, paddingVertical: 3, borderRadius: BorderRadius.sm },
  fcBadgeTxt: { fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  fcQ: { fontFamily: Fonts.display, fontSize: 22, color: Colors.headingText, lineHeight: 32, textAlign: 'center', marginTop: Spacing.huge },
  fcDiv: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.xl },
  fcA: { fontFamily: Fonts.bodySemiBold, fontSize: 17, color: Colors.answerText, lineHeight: 26, textAlign: 'center' },
  tapHint: { fontFamily: Fonts.bodySemiBold, fontSize: 10, color: Colors.tabInactive, position: 'absolute', bottom: Spacing.xl, right: Spacing.xl },
  ratingRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxl },
  rBtn: { flex: 1, paddingVertical: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1.5, alignItems: 'center' },
  rAgain: { backgroundColor: Colors.againBg, borderColor: Colors.againBorder },
  rHard: { backgroundColor: Colors.hardBg, borderColor: Colors.hardBorder },
  rEasy: { backgroundColor: Colors.easyBg, borderColor: Colors.easyBorder },
  rLbl: { fontFamily: Fonts.bodyBold, fontSize: 13 },
  tipBox: { backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: BorderRadius.xxl, flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  tipOwl: { width: 32, height: 32 },
  tipTxt: { fontFamily: Fonts.body, fontSize: 12, color: Colors.tipText, fontStyle: 'italic', flex: 1, lineHeight: 18 },
  emptyC: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.huge, marginTop: Spacing.massive },
  emptyOwl: { width: 100, height: 100, marginBottom: Spacing.xxxl, opacity: 0.6 },
  emptyT: { fontFamily: Fonts.display, fontSize: 22, color: Colors.headingText, marginBottom: Spacing.md },
  emptySub: { fontFamily: Fonts.body, fontSize: 14, color: Colors.mutedText, textAlign: 'center', lineHeight: 20 },
  homeBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xxl, paddingHorizontal: Spacing.xxxl, paddingVertical: Spacing.lg, marginTop: Spacing.xxxl },
  homeBtnTxt: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.white },
  celebOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(61,43,138,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: Spacing.huge },
  celebCard: { backgroundColor: Colors.cardSurface, borderRadius: BorderRadius.round, padding: Spacing.huge, alignItems: 'center', width: '100%', maxWidth: 320 },
  celebOwl: { width: 80, height: 80, marginBottom: Spacing.xl },
  celebTitle: { fontFamily: Fonts.display, fontSize: 22, color: Colors.headingText, marginBottom: Spacing.md },
  celebSub: { fontFamily: Fonts.body, fontSize: 14, color: Colors.mutedText, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xxxl },
  celebBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xxl, paddingHorizontal: Spacing.huge, paddingVertical: Spacing.lg },
  celebBtnTxt: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.white },
});
