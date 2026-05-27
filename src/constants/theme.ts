/**
 * Nexa — Steampunk Scholar Owl Flashcard App
 * Theme constants: colors, fonts, spacing
 */

import { Platform } from 'react-native';

export const Colors = {
  background: '#1a1128',
  cardSurface: '#241a38',
  cardBorder: '#3a2d55',
  primary: '#7c5cbf',
  primaryDark: '#6a4daa',
  headingText: '#ffffff',
  mutedText: '#b8a8e0',
  accentBadgeBg: '#2e2245',
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
  purpleDeckBg: '#2e2245',
  pinkDeckBg: '#3a1a2e',
  blueDeckBg: '#1a2540',
  greenDeckBg: '#1a3025',
  // Tab bar
  tabBarBg: '#1a1128',
  tabBarBorder: '#3a2d55',
  tabActive: '#7c5cbf',
  tabInactive: '#c8b8f0',
  // Misc
  divider: '#3a2d55',
  tipText: '#9984d4',
  subtitleText: '#d4c0f8',
  answerText: '#ffffff',
  // Progress heatmap
  heatmap0: '#2e2245',
  heatmap1: '#3d2d5a',
  heatmap2: '#5a3d80',
  heatmap3: '#7c5cbf',
  // Celebration
  white: '#ffffff',
  black: '#1a1128',

  // Template compatibility aliases
  text: '#ffffff',             // headingText
  textSecondary: '#b8a8e0',    // mutedText
  backgroundSelected: '#2e2245', // accentBadgeBg
  backgroundElement: '#241a38',  // cardSurface

  light: {
    background: '#1a1128',
    cardSurface: '#241a38',
    cardBorder: '#3a2d55',
    primary: '#7c5cbf',
    primaryDark: '#6a4daa',
    headingText: '#ffffff',
    mutedText: '#b8a8e0',
    accentBadgeBg: '#2e2245',
    accentBadgeText: '#7c5cbf',
    urgentPillBg: '#ffe8f5',
    urgentPillText: '#c046a0',
    againBg: '#fff0f5',
    againBorder: '#f0a0c0',
    againText: '#c04070',
    hardBg: '#fff8ee',
    hardBorder: '#f0c070',
    hardText: '#9a6010',
    easyBg: '#eef8f0',
    easyBorder: '#80d0a0',
    easyText: '#1a7a40',
    purpleDeckBg: '#2e2245',
    pinkDeckBg: '#3a1a2e',
    blueDeckBg: '#1a2540',
    greenDeckBg: '#1a3025',
    tabBarBg: '#1a1128',
    tabBarBorder: '#3a2d55',
    tabActive: '#7c5cbf',
    tabInactive: '#c8b8f0',
    divider: '#3a2d55',
    tipText: '#9984d4',
    subtitleText: '#d4c0f8',
    answerText: '#ffffff',
    heatmap0: '#2e2245',
    heatmap1: '#3d2d5a',
    heatmap2: '#5a3d80',
    heatmap3: '#7c5cbf',
    white: '#ffffff',
    black: '#1a1128',
    text: '#ffffff',
    textSecondary: '#b8a8e0',
    backgroundSelected: '#2e2245',
    backgroundElement: '#241a38',
  },
  dark: {
    background: '#1a1128',
    cardSurface: '#241a38',
    cardBorder: '#3a2d55',
    primary: '#7c5cbf',
    primaryDark: '#6a4daa',
    headingText: '#ffffff',
    mutedText: '#b8a8e0',
    accentBadgeBg: '#2e2245',
    accentBadgeText: '#7c5cbf',
    urgentPillBg: '#ffe8f5',
    urgentPillText: '#c046a0',
    againBg: '#fff0f5',
    againBorder: '#f0a0c0',
    againText: '#c04070',
    hardBg: '#fff8ee',
    hardBorder: '#f0c070',
    hardText: '#9a6010',
    easyBg: '#eef8f0',
    easyBorder: '#80d0a0',
    easyText: '#1a7a40',
    purpleDeckBg: '#2e2245',
    pinkDeckBg: '#3a1a2e',
    blueDeckBg: '#1a2540',
    greenDeckBg: '#1a3025',
    tabBarBg: '#1a1128',
    tabBarBorder: '#3a2d55',
    tabActive: '#7c5cbf',
    tabInactive: '#c8b8f0',
    divider: '#3a2d55',
    tipText: '#9984d4',
    subtitleText: '#d4c0f8',
    answerText: '#ffffff',
    heatmap0: '#2e2245',
    heatmap1: '#3d2d5a',
    heatmap2: '#5a3d80',
    heatmap3: '#7c5cbf',
    white: '#ffffff',
    black: '#1a1128',
    text: '#ffffff',
    textSecondary: '#b8a8e0',
    backgroundSelected: '#2e2245',
    backgroundElement: '#241a38',
  }
} as const;

export type ThemeColor = keyof typeof Colors.light;

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
  mono: Platform.select({
    web: "Courier New, monospace",
    default: "Courier",
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
  // Template compatibility aliases
  half: 4,
  one: 8,
  two: 12,
  three: 16,
  four: 20,
  five: 24,
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

export const MaxContentWidth = 1100;
