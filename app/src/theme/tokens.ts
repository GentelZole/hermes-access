/**
 * Hermes Access — Design Tokens
 * Three switchable identity directions (owner-mandated: ship all three).
 *
 *  - aurum   "Aurum Noir"      warm obsidian · molten gold · serif whispers
 *  - daylight "Riyadh Daylight" warm paper · burnt clay · Arabic editorial
 *  - courier "Night Courier"   obsidian ops-deck · mono · neon-gold signals
 *
 * Every screen/component reads colors + typography + radii from the ACTIVE
 * theme object — never hardcode hex values in components.
 */

export type ThemeId = 'aurum' | 'daylight' | 'courier';

export interface ThemeTokens {
  id: ThemeId;
  /** Human label (English) */
  label: string;
  /** Human label (Arabic) */
  labelAr: string;
  /** One-line vibe for the theme picker */
  tagline: string;
  /** Base surface colors */
  bg: string;
  bgElevated: string;      // raised surface (cards, sheets)
  bgInput: string;         // input wells
  /** Text */
  text: string;
  textSecondary: string;
  textMuted: string;
  /** Accent (the single interaction driver) */
  accent: string;
  accentSoft: string;      // tinted accent surface
  accentText: string;      // text sitting on accent fills
  accentGradient: [string, string] | null;
  /** Borders + dividers */
  border: string;
  borderStrong: string;
  /** Semantic */
  success: string;
  danger: string;
  warning: string;
  /** Message bubbles */
  bubbleAgent: string;
  bubbleAgentBorder: string;
  bubbleUser: string;
  bubbleUserText: string;
  /** Typography family names (loaded via expo-font) */
  fontDisplay: string;     // headings / brand
  fontArabic: string;      // Arabic UI text
  fontBody: string;        // general body
  fontMono: string;        // code / ops labels
  /** Shape */
  radiusS: number;
  radiusM: number;
  radiusL: number;
  radiusPill: number;
  /** Whether the theme is dark (status bar + splash) */
  dark: boolean;
  /** Tab bar / chrome */
  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  aurum: {
    id: 'aurum',
    label: 'Aurum Noir',
    labelAr: 'الذهبي الأسود',
    tagline: 'Warm obsidian & molten gold',
    bg: '#0e0c09',
    bgElevated: '#1a1610',
    bgInput: '#16120c',
    text: '#ece5d8',
    textSecondary: '#b3a88f',
    textMuted: '#776c58',
    accent: '#d4af37',
    accentSoft: 'rgba(212,175,55,0.14)',
    accentText: '#171307',
    accentGradient: ['#e8ca5f', '#bd972a'],
    border: '#2c2518',
    borderStrong: '#3a3020',
    success: '#7fc77f',
    danger: '#e06c5b',
    warning: '#e8ca5f',
    bubbleAgent: '#1a1610',
    bubbleAgentBorder: '#2c2518',
    bubbleUser: '#d9b53a',
    bubbleUserText: '#191408',
    fontDisplay: 'CormorantGaramond_600SemiBold',
    fontArabic: 'Tajawal_500Medium',
    fontBody: 'Tajawal_400Regular',
    fontMono: 'IBMPlexMono_400Regular',
    radiusS: 8,
    radiusM: 16,
    radiusL: 24,
    radiusPill: 999,
    dark: true,
    tabBarBg: '#0b0a08',
    tabBarBorder: '#221d15',
    tabBarActive: '#d4af37',
    tabBarInactive: '#6f654f',
  },

  daylight: {
    id: 'daylight',
    label: 'Riyadh Daylight',
    labelAr: 'نهار الرياض',
    tagline: 'Warm paper & burnt clay',
    bg: '#faf6ee',
    bgElevated: '#ffffff',
    bgInput: '#ffffff',
    text: '#221c12',
    textSecondary: '#6f6653',
    textMuted: '#a2987f',
    accent: '#a1542f',
    accentSoft: 'rgba(161,84,47,0.10)',
    accentText: '#fdf9f1',
    accentGradient: null,
    border: '#e5dcc8',
    borderStrong: '#d8cdb6',
    success: '#4a7a4a',
    danger: '#b0402e',
    warning: '#c08a2e',
    bubbleAgent: '#ffffff',
    bubbleAgentBorder: '#e5dcc8',
    bubbleUser: '#a1542f',
    bubbleUserText: '#fdf9f1',
    fontDisplay: 'Amiri_700Bold',
    fontArabic: 'Tajawal_500Medium',
    fontBody: 'Tajawal_400Regular',
    fontMono: 'IBMPlexMono_400Regular',
    radiusS: 2,
    radiusM: 14,
    radiusL: 18,
    radiusPill: 999,
    dark: false,
    tabBarBg: '#f4eee0',
    tabBarBorder: '#e5dcc8',
    tabBarActive: '#a1542f',
    tabBarInactive: '#a2987f',
  },

  courier: {
    id: 'courier',
    label: 'Night Courier',
    labelAr: 'ساعي الليل',
    tagline: 'Ops-deck & neon gold',
    bg: '#09090b',
    bgElevated: '#111116',
    bgInput: '#111116',
    text: '#e8e8ea',
    textSecondary: '#c9c9d1',
    textMuted: '#55555f',
    accent: '#ffd95e',
    accentSoft: 'rgba(255,217,94,0.12)',
    accentText: '#09090b',
    accentGradient: null,
    border: '#212129',
    borderStrong: '#2c2c36',
    success: '#6fd08c',
    danger: '#ff6b5e',
    warning: '#ffd95e',
    bubbleAgent: '#111116',
    bubbleAgentBorder: '#212129',
    bubbleUser: '#1d1d26',
    bubbleUserText: '#e8e8ea',
    fontDisplay: 'SpaceGrotesk_600SemiBold',
    fontArabic: 'Tajawal_500Medium',
    fontBody: 'SpaceGrotesk_400Regular',
    fontMono: 'IBMPlexMono_500Medium',
    radiusS: 6,
    radiusM: 12,
    radiusL: 14,
    radiusPill: 999,
    dark: true,
    tabBarBg: '#0b0b0e',
    tabBarBorder: '#1b1b21',
    tabBarActive: '#ffd95e',
    tabBarInactive: '#55555f',
  },
};

export const THEME_IDS: ThemeId[] = ['aurum', 'daylight', 'courier'];
