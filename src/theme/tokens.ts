/**
 * Physiosmetic Design Tokens
 * Extracted from website reference: /website-reference/
 *
 * Dark futuristic medical tech aesthetic with:
 * - Orange primary (#F37021) - energetic, warm brand color
 * - Blue secondary (#4385F5) - calm, trust accent
 * - Dark backgrounds - near-black for depth
 * - Glassmorphism - translucent cards with blur
 * - Glows - luminous effects on interactive elements
 */

export const colors = {
  // Primary brand colors
  primary: '#F37021',
  primaryLight: '#ff9d5c',
  primaryDark: '#d85f15',

  // Secondary accent
  secondary: '#4385F5',
  secondaryLight: '#6fa3ff',
  secondaryDark: '#2b68cc',

  // Dark backgrounds (main aesthetic)
  darkBg: '#050A14',
  dark: '#0a1420',
  darker: '#050a14',

  // Card backgrounds (glassmorphic)
  cardBg: 'rgba(10, 15, 25, 0.95)',
  cardBgLight: 'rgba(20, 25, 35, 0.90)',

  // Text colors
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textInverse: '#050A14',

  // Status colors
  success: '#10b981',
  successLight: '#34d399',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  danger: '#ef4444',
  dangerLight: '#f87171',
  info: '#3b82f6',

  // Borders
  borderPrimary: 'rgba(243, 112, 33, 0.2)',
  borderSecondary: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',

  // Overlays
  overlay: 'rgba(5, 10, 20, 0.8)',
  overlayLight: 'rgba(5, 10, 20, 0.6)',

  // Transparent
  transparent: 'transparent',
} as const;

export const gradients = {
  // Background gradients
  mainBackground: 'linear-gradient(135deg, #050A14 0%, #0a1525 50%, #050A14 100%)',

  // Glow effects (for animated backgrounds)
  glowOrange: 'radial-gradient(circle at 20% 50%, rgba(243, 112, 33, 0.05), transparent 50%)',
  glowBlue: 'radial-gradient(circle at 80% 80%, rgba(67, 133, 245, 0.05), transparent 50%)',
  glowOrangeTop: 'radial-gradient(circle at 40% 10%, rgba(243, 112, 33, 0.03), transparent 40%)',

  // Button gradients
  primaryButton: 'linear-gradient(135deg, #F37021, #ff9d5c)',
  secondaryButton: 'linear-gradient(135deg, #4385F5, #6fa3ff)',

  // Card gradients
  cardSubtle: 'linear-gradient(135deg, rgba(243, 112, 33, 0.04), rgba(67, 133, 245, 0.04))',
  cardGlass: 'linear-gradient(135deg, rgba(5, 10, 20, 0.98), rgba(10, 20, 40, 0.98))',
  cardOverlay: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01))',

  // Shimmer for loading
  shimmer: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',

  // Badge gradients
  orangeBadge: 'linear-gradient(135deg, rgba(243, 112, 33, 0.2), rgba(243, 112, 33, 0.1))',
  blueBadge: 'linear-gradient(135deg, rgba(67, 133, 245, 0.15), rgba(67, 133, 245, 0.05))',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 10,
  base: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  round: 9999, // Fully rounded
} as const;

export const shadows = {
  // Standard shadows
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 8,
  },

  // Glow effects (futuristic)
  glowPrimary: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 6,
  },
  glowSecondary: {
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  glowSuccess: {
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
} as const;

export const typography = {
  // Font families (use system fonts for React Native)
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },

  // Font sizes
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
    '6xl': 48,
  },

  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
    loose: 2,
  },
} as const;

export const motion = {
  // Animation durations (in milliseconds)
  duration: {
    instant: 0,
    fast: 120,
    normal: 200,
    slow: 320,
    slower: 500,
    slowest: 800,
  },

  // Easing functions
  easing: {
    // Standard ease out for entrances
    easeOut: [0.4, 0, 0.2, 1] as const,
    // Ease in for exits
    easeIn: [0.4, 0, 1, 1] as const,
    // Ease in-out for transitions
    easeInOut: [0.4, 0, 0.2, 1] as const,
    // Sharp for quick actions
    sharp: [0.4, 0, 0.6, 1] as const,
  },

  // Animation presets
  transitions: {
    fast: {
      duration: 120,
      easing: [0.4, 0, 0.2, 1] as const,
    },
    normal: {
      duration: 200,
      easing: [0.4, 0, 0.2, 1] as const,
    },
    slow: {
      duration: 320,
      easing: [0.4, 0, 0.2, 1] as const,
    },
  },
} as const;

export const accessibility = {
  // Minimum tap target size
  minTapTarget: 44,

  // Focus indicator width
  focusIndicatorWidth: 2,

  // Focus indicator offset
  focusIndicatorOffset: 2,
} as const;

// Export all tokens as a single object
export const tokens = {
  colors,
  gradients,
  spacing,
  radius,
  shadows,
  typography,
  motion,
  accessibility,
} as const;

export type Colors = typeof colors;
export type Gradients = typeof gradients;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Shadows = typeof shadows;
export type Typography = typeof typography;
export type Motion = typeof motion;
export type Accessibility = typeof accessibility;
export type Tokens = typeof tokens;
