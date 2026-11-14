/**
 * 2ndGM AI Chess Lab — Design System Tokens
 * Source of truth: implementation.md § DESIGN SYSTEM
 * Strict TypeScript — zero `any` escapes.
 */

// ─── COLOR PALETTE ────────────────────────────────────────────────────────────

export const Colors = {
  // Backgrounds
  background: '#0D0F14',
  surface: '#161A23',
  surfaceElevated: '#1E2330',

  // Brand
  primary: '#4F9CF9',      // Electric blue — CTAs
  accent: '#F9A84F',       // Amber — highlights / badges

  // Move Classification
  success: '#3DD68C',      // Best / Excellent
  warning: '#F9C74F',      // Inaccuracy
  danger: '#F94F4F',       // Blunder
  brilliant: '#A78BFA',    // Brilliant (!!)

  // Text
  textPrimary: '#F0F4FF',
  textSecondary: '#8A93A8',

  // Structure
  border: '#2A3040',

  // Board (Neo Style)
  boardLight: '#F0D9B5',
  boardDark: '#B58863',
  boardHighlightLastMove: 'rgba(255, 255, 0, 0.4)',
  boardHighlightSelected: 'rgba(79, 156, 249, 0.5)',
  boardLegalMoveDot: 'rgba(0, 0, 0, 0.25)',

  // Transparency helpers
  overlay10: 'rgba(13, 15, 20, 0.10)',
  overlay60: 'rgba(13, 15, 20, 0.60)',
  overlay80: 'rgba(13, 15, 20, 0.80)',
} as const;

export type ColorKey = keyof typeof Colors;

// ─── TYPOGRAPHY ───────────────────────────────────────────────────────────────

export const FontFamily = {
  /** Inter — headings, UI labels, body text */
  interLight: 'Inter_300Light',
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',

  /** Roboto Mono — PGN notation, FEN strings */
  monoRegular: 'RobotoMono_400Regular',
  monoMedium: 'RobotoMono_500Medium',
  monoBold: 'RobotoMono_700Bold',
} as const;

export type FontFamilyKey = keyof typeof FontFamily;

export const FontSize = {
  /** 10px — tiny labels, badges */
  xs: 10,
  /** 12px — secondary metadata */
  sm: 12,
  /** 14px — body / move notation */
  md: 14,
  /** 16px — subheadings, prominent text */
  lg: 16,
  /** 20px — section headings */
  xl: 20,
  /** 24px — screen titles */
  xxl: 24,
  /** 32px — hero display text */
  display: 32,
} as const;

export type FontSizeKey = keyof typeof FontSize;

export const LineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// ─── TYPOGRAPHY PRESETS ───────────────────────────────────────────────────────

export const Typography = {
  displayBold: {
    fontFamily: FontFamily.interBold,
    fontSize: FontSize.display,
    color: Colors.textPrimary,
    lineHeight: FontSize.display * 1.2,
  },
  headingLarge: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
    lineHeight: FontSize.xxl * 1.25,
  },
  headingMedium: {
    fontFamily: FontFamily.interSemiBold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    lineHeight: FontSize.xl * 1.3,
  },
  subheading: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    lineHeight: FontSize.lg * 1.4,
  },
  body: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: FontSize.md * 1.5,
  },
  bodySecondary: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: FontSize.md * 1.5,
  },
  caption: {
    fontFamily: FontFamily.interRegular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.5,
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  /** PGN / FEN notation — always monospace */
  notation: {
    fontFamily: FontFamily.monoRegular,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: FontSize.md * 1.6,
  },
  notationBold: {
    fontFamily: FontFamily.monoBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: FontSize.md * 1.6,
  },
} as const;

// ─── SPACING ──────────────────────────────────────────────────────────────────

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type SpacingKey = keyof typeof Spacing;

// ─── BORDER RADIUS ────────────────────────────────────────────────────────────

export const Radius = {
  /** Small: inputs, tags */
  sm: 8,
  /** Default: cards */
  md: 16,
  /** Sheets: bottom panels */
  sheet: 24,
  /** Pills: badges / chips */
  pill: 999,
} as const;

// ─── ELEVATION / SHADOW ───────────────────────────────────────────────────────

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

// ─── ANIMATION ────────────────────────────────────────────────────────────────

export const Animation = {
  /** Fast micro-interactions: 150ms */
  fast: 150,
  /** Standard transitions: 250ms */
  standard: 250,
  /** Deliberate animations: 400ms */
  slow: 400,
} as const;

// ─── MOVE CLASSIFICATION COLORS ───────────────────────────────────────────────

export const MoveClassColor: Record<string, string> = {
  brilliant: Colors.brilliant,
  great: Colors.success,
  best: Colors.success,
  excellent: Colors.success,
  good: Colors.textSecondary,
  inaccuracy: Colors.warning,
  mistake: Colors.accent,
  blunder: Colors.danger,
} as const;

// ─── BOARD CONSTANTS ──────────────────────────────────────────────────────────

export const Board = {
  files: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const,
  ranks: [8, 7, 6, 5, 4, 3, 2, 1] as const,
  /** Board occupies full screen width with equal-height squares */
  squaresPerSide: 8,
} as const;
