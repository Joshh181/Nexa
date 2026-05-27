/**
 * Nexa — Pomodoro Study Timer
 * 25 min study / 5 min break focus timer with session tracking
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useNexaStore } from '@/store/useNexaStore';

const STUDY_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60;  // 5 minutes in seconds

type TimerPhase = 'study' | 'break';
type TimerState = 'idle' | 'running' | 'paused';

export default function PomodoroScreen() {
  const insets = useSafeAreaInsets();
  const { recordPomodoroSession, totalStudyMinutes } = useNexaStore();

  const [phase, setPhase] = useState<TimerPhase>('study');
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [secondsLeft, setSecondsLeft] = useState(STUDY_DURATION);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [sessionStudySeconds, setSessionStudySeconds] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for running state
  useEffect(() => {
    if (timerState === 'running') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timerState]);

  // Progress animation
  useEffect(() => {
    const total = phase === 'study' ? STUDY_DURATION : BREAK_DURATION;
    const progress = 1 - secondsLeft / total;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [secondsLeft, phase]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePhaseComplete = useCallback(() => {
    if (phase === 'study') {
      const studyMinutes = Math.round(STUDY_DURATION / 60);
      recordPomodoroSession(studyMinutes);
      setPomodoroCount((p) => p + 1);
      setSessionStudySeconds((p) => p + STUDY_DURATION);
      // Switch to break
      setPhase('break');
      setSecondsLeft(BREAK_DURATION);
      setTimerState('running');
    } else {
      // Break done, back to study
      setPhase('study');
      setSecondsLeft(STUDY_DURATION);
      setTimerState('idle');
    }
  }, [phase, recordPomodoroSession]);

  // Timer tick
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handlePhaseComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerState, handlePhaseComplete]);

  // Track study seconds while running
  useEffect(() => {
    if (timerState === 'running' && phase === 'study') {
      const tracker = setInterval(() => {
        setSessionStudySeconds((p) => p + 1);
      }, 1000);
      return () => clearInterval(tracker);
    }
  }, [timerState, phase]);

  const handleStart = () => setTimerState('running');
  const handlePause = () => setTimerState('paused');
  const handleResume = () => setTimerState('running');

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('idle');
    setPhase('study');
    setSecondsLeft(STUDY_DURATION);
  };

  const totalDuration = phase === 'study' ? STUDY_DURATION : BREAK_DURATION;
  const progressPct = ((totalDuration - secondsLeft) / totalDuration) * 100;

  // Ring segments
  const ringSize = 260;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (router.canGoBack()) router.back();
            else router.replace('/' as any);
          }}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Pomodoro Timer</Text>
          <Text style={styles.headerSub}>Focus Session</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Phase Badge */}
        <View style={[styles.phaseBadge, phase === 'break' && styles.phaseBadgeBreak]}>
          <Ionicons
            name={phase === 'study' ? 'book' : 'cafe'}
            size={14}
            color={phase === 'study' ? Colors.primary : '#5ab87a'}
          />
          <Text style={[styles.phaseBadgeText, phase === 'break' && styles.phaseBadgeTextBreak]}>
            {phase === 'study' ? 'STUDY SESSION' : 'BREAK TIME'}
          </Text>
        </View>

        {/* Timer Ring */}
        <Animated.View style={[styles.timerContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.timerRing}>
            {/* Background ring */}
            <View style={styles.ringBg}>
              {/* Progress overlay using a simulated arc via border */}
              <View style={[styles.ringProgress, {
                borderColor: phase === 'study' ? Colors.primary : '#5ab87a',
                borderWidth: strokeWidth,
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
              }]} />
            </View>

            {/* Center content */}
            <View style={styles.timerCenter}>
              <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
              <Text style={styles.timerPhaseLabel}>
                {phase === 'study' ? '25 min focus' : '5 min break'}
              </Text>
            </View>
          </View>

          {/* Progress bar below ring */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressPct}%`,
                  backgroundColor: phase === 'study' ? Colors.primary : '#5ab87a',
                },
              ]}
            />
          </View>
        </Animated.View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          {timerState === 'idle' && (
            <Pressable style={styles.primaryBtn} onPress={handleStart}>
              <Ionicons name="play" size={22} color={Colors.white} />
              <Text style={styles.primaryBtnText}>Start</Text>
            </Pressable>
          )}
          {timerState === 'running' && (
            <Pressable style={[styles.primaryBtn, styles.pauseBtn]} onPress={handlePause}>
              <Ionicons name="pause" size={22} color={Colors.white} />
              <Text style={styles.primaryBtnText}>Pause</Text>
            </Pressable>
          )}
          {timerState === 'paused' && (
            <>
              <Pressable style={styles.primaryBtn} onPress={handleResume}>
                <Ionicons name="play" size={22} color={Colors.white} />
                <Text style={styles.primaryBtnText}>Resume</Text>
              </Pressable>
              <Pressable style={styles.resetBtn} onPress={handleReset}>
                <Ionicons name="refresh" size={18} color={Colors.mutedText} />
                <Text style={styles.resetBtnText}>Reset</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Session Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>SESSION STATS</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
              <Text style={styles.statValue}>{pomodoroCount}</Text>
              <Text style={styles.statLabel}>Pomodoros</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="time" size={18} color="#e8873a" />
              <Text style={styles.statValue}>{Math.floor(sessionStudySeconds / 60)}m</Text>
              <Text style={styles.statLabel}>This Session</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="trending-up" size={18} color="#5ab87a" />
              <Text style={styles.statValue}>{totalStudyMinutes}m</Text>
              <Text style={styles.statLabel}>All Time</Text>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipCard}>
          <Ionicons name="bulb" size={16} color={Colors.primary} />
          <Text style={styles.tipText}>
            {phase === 'study'
              ? 'Stay focused! Close distractions and review your study materials during this session.'
              : 'Take a real break — stretch, hydrate, look away from the screen.'}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.xxl, alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.headingText },
  headerSub: { fontFamily: Fonts.bodySemiBold, fontSize: 11, color: Colors.mutedText, marginTop: 1 },

  phaseBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.accentBadgeBg, borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    marginTop: Spacing.xl, marginBottom: Spacing.xxxl,
  },
  phaseBadgeBreak: { backgroundColor: 'rgba(90, 184, 122, 0.15)' },
  phaseBadgeText: { fontFamily: Fonts.bodyBold, fontSize: 11, color: Colors.primary, letterSpacing: 1.5 },
  phaseBadgeTextBreak: { color: '#5ab87a' },

  timerContainer: { alignItems: 'center', marginBottom: Spacing.xxxl },
  timerRing: {
    width: 260, height: 260, justifyContent: 'center', alignItems: 'center',
  },
  ringBg: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  ringProgress: { position: 'absolute' },
  timerCenter: { alignItems: 'center' },
  timerText: {
    fontFamily: Fonts.display, fontSize: 52, color: Colors.headingText, letterSpacing: 2,
  },
  timerPhaseLabel: {
    fontFamily: Fonts.bodySemiBold, fontSize: 13, color: Colors.mutedText, marginTop: 4,
  },

  progressTrack: {
    width: '80%', height: 6, backgroundColor: Colors.cardBorder,
    borderRadius: 3, overflow: 'hidden', marginTop: Spacing.xxl,
  },
  progressFill: { height: '100%', borderRadius: 3 },

  controlsRow: {
    flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.xxxl,
  },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.xxl,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.huge, paddingVertical: Spacing.xl,
    elevation: 4, shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  pauseBtn: { backgroundColor: '#e8873a' },
  primaryBtnText: { fontFamily: Fonts.display, fontSize: 16, color: Colors.white },
  resetBtn: {
    backgroundColor: Colors.cardSurface, borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.xxl, flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xl,
  },
  resetBtnText: { fontFamily: Fonts.bodyBold, fontSize: 14, color: Colors.mutedText },

  statsCard: {
    width: '100%', backgroundColor: Colors.cardSurface,
    borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.card, padding: Spacing.xl, marginBottom: Spacing.xl,
  },
  statsTitle: {
    fontFamily: Fonts.bodyBold, fontSize: 10, color: Colors.mutedText,
    letterSpacing: 1.5, marginBottom: Spacing.xl, textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontFamily: Fonts.bodyExtraBold, fontSize: 20, color: Colors.headingText },
  statLabel: { fontFamily: Fonts.bodySemiBold, fontSize: 10, color: Colors.mutedText },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.divider },

  tipCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.accentBadgeBg, borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  tipText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.headingText, flex: 1, lineHeight: 18 },
});
