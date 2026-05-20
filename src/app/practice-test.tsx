/**
 * Nexa — Practice Test Screen
 * Generates custom interactive mock tests from Decks using Gemini AI
 */

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/theme';
import { generatePracticeTest, isAIConfigured, type PracticeQuestion } from '@/services/gemini';
import { useNexaStore } from '@/store/useNexaStore';

const owlImage = require('../../assets/Nexa.png');

type TestStep = 'config' | 'loading' | 'quiz' | 'score';

export default function PracticeTestScreen() {
  const insets = useSafeAreaInsets();
  const { decks } = useNexaStore();

  const [testStep, setTestStep] = useState<TestStep>('config');
  const [selectedDeckId, setSelectedDeckId] = useState<string>(decks[0]?.id || '');
  const [questionCount, setQuestionCount] = useState('10');
  
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');

  const handleStartTest = async () => {
    const deck = decks.find(d => d.id === selectedDeckId);
    if (!deck) {
      setError('Please select a valid deck.');
      return;
    }
    if (deck.cards.length === 0) {
      setError('The selected deck is empty. Add cards first.');
      return;
    }
    if (!isAIConfigured()) {
      setError('Gemini API key is not configured. Please set up the EXPO_PUBLIC_GEMINI_API_KEY environment variable to enable practice test generation!');
      return;
    }

    setError('');
    setTestStep('loading');

    try {
      const cardsText = deck.cards
        .map((c, i) => `Card ${i + 1}:\nQuestion: ${c.front}\nAnswer: ${c.back}`)
        .join('\n\n');
      
      const generated = await generatePracticeTest(cardsText, parseInt(questionCount) || 10);
      if (generated.length === 0) {
        throw new Error('Failed to parse test questions.');
      }
      setQuestions(generated);
      setCurrentIdx(0);
      setSelectedAnswer(null);
      setScore(0);
      setTestStep('quiz');
    } catch (e: any) {
      setError(e.message || 'Failed to generate practice test.');
      setTestStep('config');
    }
  };

  const handleSelectAnswer = (ans: string) => {
    if (selectedAnswer !== null) return; // Prevent clicking multiple times
    setSelectedAnswer(ans);
    if (ans === questions[currentIdx].answer) {
      setScore(p => p + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(p => p + 1);
      setSelectedAnswer(null);
    } else {
      setTestStep('score');
    }
  };

  const getNexaComment = (percentage: number) => {
    if (percentage === 100) {
      return "Incredible! Your gear-works are perfectly aligned! The library of wisdom lies completely open to you.";
    }
    if (percentage >= 80) {
      return "Marvelous effort, Scholar! A few minor squeaks, but your mind is running like clockwork.";
    }
    return "Do not fret, Scholar! Add a bit of oil to the gears and review the study deck once more.";
  };

  // ─── Score Step ────────────────────────────────────
  if (testStep === 'score') {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Test Results</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>YOUR SCORE</Text>
            <Text style={styles.scorePercentage}>{percentage}%</Text>
            <Text style={styles.scoreFraction}>
              {score} of {questions.length} questions correct
            </Text>
          </View>

          {/* Nexa feedback */}
          <View style={styles.feedbackCard}>
            <Image source={owlImage} style={styles.feedbackOwl} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.feedbackTitle}>Scholar Nexa says:</Text>
              <Text style={styles.feedbackText}>{getNexaComment(percentage)}</Text>
            </View>
          </View>

          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              setQuestions([]);
              setTestStep('config');
            }}
          >
            <Ionicons name="refresh" size={18} color={Colors.white} />
            <Text style={styles.retryBtnText}>Assemble New Exam</Text>
          </Pressable>

          <Pressable
            style={[styles.retryBtn, styles.finishBtn]}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/' as any);
              }
            }}
          >
            <Text style={styles.finishBtnText}>Finish Practice</Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── Config Step ───────────────────────────────────
  if (testStep === 'config') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/' as any);
              }
            }}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Practice Tests</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Intro */}
          <View style={styles.introCard}>
            <Image source={owlImage} style={styles.introOwl} contentFit="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.introTitle}>Interactive Mock Exams</Text>
              <Text style={styles.introSub}>
                Test your mastery with customized multiple-choice and true-false quizzes made by Nexa.
              </Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>SELECT SOURCE DECK</Text>
          {decks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTxt}>You do not have any decks to test on.</Text>
            </View>
          ) : (
            <View style={styles.deckList}>
              {decks.map(deck => (
                <Pressable
                  key={deck.id}
                  style={[
                    styles.deckItem,
                    selectedDeckId === deck.id && styles.deckItemActive,
                  ]}
                  onPress={() => setSelectedDeckId(deck.id)}
                >
                  <Text style={styles.deckItemEmoji}>{deck.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deckItemName}>{deck.name}</Text>
                    <Text style={styles.deckItemCards}>{deck.cards.length} cards</Text>
                  </View>
                  {selectedDeckId === deck.id && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          )}

          <Text style={styles.fieldLabel}>NUMBER OF QUESTIONS</Text>
          <View style={styles.countRow}>
            {['5', '10', '15', '20'].map(n => (
              <Pressable
                key={n}
                style={[styles.countBtn, questionCount === n && styles.countActive]}
                onPress={() => setQuestionCount(n)}
              >
                <Text style={[styles.countTxt, questionCount === n && styles.countTxtActive]}>
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>

          {error !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.againText} />
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          )}

          <Pressable
            style={[styles.startBtn, decks.length === 0 && styles.disabled]}
            onPress={handleStartTest}
            disabled={decks.length === 0}
          >
            <Ionicons name="sparkles" size={18} color={Colors.white} />
            <Text style={styles.startBtnText}>Assemble Practice Exam</Text>
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ─── Loading Step ──────────────────────────────────
  if (testStep === 'loading') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <Image source={owlImage} style={styles.loadingOwl} contentFit="contain" />
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xl }} />
          <Text style={styles.loadingTitle}>Formulating Exam Questions...</Text>
          <Text style={styles.loadingSub}>
            Scholar Nexa is designing high-quality questions to challenge and verify your mastery.
          </Text>
        </View>
      </View>
    );
  }

  // ─── Quiz Step ─────────────────────────────────────
  const currentQuestion = questions[currentIdx];
  const isAnswered = selectedAnswer !== null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => setTestStep('config')}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          Question {currentIdx + 1} of {questions.length}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${((currentIdx + 1) / questions.length) * 100}%` },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.quizCard}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsList}>
          {currentQuestion.options?.map((opt, i) => {
            const isCorrect = opt === currentQuestion.answer;
            const isSelected = opt === selectedAnswer;

            let optStyle: any = styles.optionItem;
            let iconName: keyof typeof Ionicons.glyphMap = 'radio-button-off';
            let iconColor: string = Colors.mutedText;

            if (isAnswered) {
              if (isSelected) {
                if (isCorrect) {
                  optStyle = [styles.optionItem, styles.optionCorrect];
                  iconName = 'checkmark-circle';
                  iconColor = Colors.easyText;
                } else {
                  optStyle = [styles.optionItem, styles.optionIncorrect];
                  iconName = 'close-circle';
                  iconColor = Colors.againText;
                }
              } else if (isCorrect) {
                optStyle = [styles.optionItem, styles.optionCorrect];
                iconName = 'checkmark-circle';
                iconColor = Colors.easyText;
              } else {
                optStyle = [styles.optionItem, styles.optionDisabled];
              }
            }

            return (
              <Pressable
                key={i}
                style={optStyle}
                onPress={() => handleSelectAnswer(opt)}
                disabled={isAnswered}
              >
                <Ionicons name={iconName} size={20} color={iconColor} />
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        {isAnswered && (
          <Pressable style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {currentIdx + 1 === questions.length ? 'Show Results' : 'Next Question'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </Pressable>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Score Step ────────────────────────────────────
// Rendered separately inside final block

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.xxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.headingText },

  introCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  introOwl: { width: 48, height: 48 },
  introTitle: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.white },
  introSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.subtitleText, marginTop: 2, lineHeight: 16 },

  fieldLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 10,
    color: Colors.mutedText,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },

  // Deck Selection List
  deckList: { gap: Spacing.md },
  deckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  deckItemActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.accentBadgeBg,
  },
  deckItemEmoji: { fontSize: 22 },
  deckItemName: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.headingText },
  deckItemCards: { fontFamily: Fonts.body, fontSize: 11, color: Colors.mutedText, marginTop: 1 },

  countRow: { flexDirection: 'row', gap: Spacing.md },
  countBtn: {
    flex: 1,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
  },
  countActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  countTxt: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.headingText },
  countTxtActive: { color: Colors.white },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.againBg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  errorTxt: { fontFamily: Fonts.body, fontSize: 12, color: Colors.againText, flex: 1 },

  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xxl,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xxxl,
  },
  startBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.white },
  disabled: { opacity: 0.5 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.huge },
  loadingOwl: { width: 80, height: 80 },
  loadingTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.headingText, marginTop: Spacing.xl },
  loadingSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.mutedText, textAlign: 'center', marginTop: Spacing.md, lineHeight: 20 },

  // Progress Bar
  progressBarBg: { height: 6, backgroundColor: Colors.cardBorder, marginHorizontal: Spacing.xxl, borderRadius: 3, overflow: 'hidden', marginBottom: Spacing.xl },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },

  // Quiz content
  quizCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    padding: Spacing.xxl,
    marginBottom: Spacing.xl,
    minHeight: 120,
    justifyContent: 'center',
  },
  questionText: { fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.headingText, lineHeight: 22 },

  optionsList: { gap: Spacing.md, marginBottom: Spacing.xl },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  optionText: { fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.headingText, flex: 1 },
  
  optionCorrect: { borderColor: Colors.easyText, backgroundColor: Colors.easyBg, borderWidth: 2 },
  optionIncorrect: { borderColor: Colors.againText, backgroundColor: Colors.againBg, borderWidth: 2 },
  optionDisabled: { opacity: 0.5 },

  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xxl,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  nextBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.white },

  emptyState: { paddingVertical: Spacing.xl, alignItems: 'center' },
  emptyTxt: { fontFamily: Fonts.body, fontSize: 12, color: Colors.mutedText },

  // Score Screen Styles
  scoreCard: {
    backgroundColor: Colors.cardSurface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card,
    paddingVertical: Spacing.massive,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  scoreLabel: {
    fontFamily: Fonts.bodyBold,
    fontSize: 11,
    color: Colors.mutedText,
    letterSpacing: 1.5,
  },
  scorePercentage: {
    fontFamily: Fonts.display,
    fontSize: 48,
    color: Colors.primary,
    marginVertical: Spacing.md,
  },
  scoreFraction: {
    fontFamily: Fonts.bodySemiBold,
    fontSize: 13,
    color: Colors.headingText,
  },
  feedbackCard: {
    backgroundColor: Colors.accentBadgeBg,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  feedbackOwl: { width: 44, height: 44 },
  feedbackTitle: { fontFamily: Fonts.bodyBold, fontSize: 13, color: Colors.primary },
  feedbackText: { fontFamily: Fonts.body, fontSize: 11, color: Colors.headingText, marginTop: 2, lineHeight: 16 },
  
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xxl,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  retryBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.white },
  finishBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  finishBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.mutedText },
});
