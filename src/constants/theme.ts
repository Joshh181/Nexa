/**
 * Nexa — Steampunk Scholar Owl Flashcard App
 * Theme constants: colors, fonts, spacing
 */

import { Platform } from 'react-native';

export const Colors = {
  background: '#f5f0ff',
  cardSurface: '#ffffff',
  cardBorder: '#e0d6f8',
  primary: '#7c5cbf',
  primaryDark: '#6a4daa',
  headingText: '#3d2b8a',
  mutedText: '#b8a8e0',
  accentBadgeBg: '#ede8ff',
  accentBadgeText: '#7c5cbf',
  urgentPillBg: '#ffe8f5',
  urgentPillText: '#c046a0',
  // Rating buttons
  againBg: '#fff0f5',
  againBorder: '#f0a0c0',
  againText: '#c04070',
  hardBg: '#fff8ee',
  hardBorder: '#f0c070',
  hardText: '#9a6010',
  easyBg: '#eef8f0',
  easyBorder: '#80d0a0',
  easyText: '#1a7a40',
  // Deck color tags
  purpleDeckBg: '#ede8ff',
  pinkDeckBg: '#ffe8f5',
  blueDeckBg: '#e8f0ff',
  greenDeckBg: '#e8f8ee',
  // Tab bar
  tabBarBg: '#f5f0ff',
  tabBarBorder: '#e0d6f8',
  tabActive: '#7c5cbf',
  tabInactive: '#c8b8f0',
  // Misc
  divider: '#e8e0f8',
  tipText: '#9984d4',
  subtitleText: '#d4c0f8',
  answerText: '#5d4a9a',
  // Progress heatmap
  heatmap0: '#e0d6f8',
  heatmap1: '#c8b0f0',
  heatmap2: '#a880d8',
  heatmap3: '#7c5cbf',
  // Celebration
  white: '#ffffff',
  black: '#000000',
} as const;

export const Fonts = {
  display: Platform.select({
    web: "'Playfair Display', serif",
    default: 'PlayfairDisplay_700Bold',
  }),
  displayRegular: Platform.select({
    web: "'Playfair Display', serif",
    default: 'PlayfairDisplay_400Regular',
  }),
  body: Platform.select({
    web: "'Nunito', sans-serif",
    default: 'Nunito_400Regular',
  }),
  bodySemiBold: Platform.select({
    web: "'Nunito', sans-serif",
    default: 'Nunito_600SemiBold',
  }),
  bodyBold: Platform.select({
    web: "'Nunito', sans-serif",
    default: 'Nunito_700Bold',
  }),
  bodyExtraBold: Platform.select({
    web: "'Nunito', sans-serif",
    default: 'Nunito_800ExtraBold',
  }),
} as const;

export const Spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 18,
  xxxl: 24,
  huge: 32,
  massive: 48,
  giant: 64,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  xxl: 16,
  card: 18,
  pill: 20,
  round: 24,
  full: 28,
} as const;
