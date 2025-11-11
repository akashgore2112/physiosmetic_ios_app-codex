/**
 * Physiosmetic Theme System
 *
 * Provides centralized access to design tokens throughout the app.
 * Usage: const theme = useTheme();
 */

import { tokens } from './tokens';

// Theme object structure
export interface Theme {
  colors: typeof tokens.colors;
  gradients: typeof tokens.gradients;
  spacing: typeof tokens.spacing;
  radius: typeof tokens.radius;
  shadows: typeof tokens.shadows;
  typography: typeof tokens.typography;
  motion: typeof tokens.motion;
  accessibility: typeof tokens.accessibility;
}

// Create the theme object
export const theme: Theme = {
  colors: tokens.colors,
  gradients: tokens.gradients,
  spacing: tokens.spacing,
  radius: tokens.radius,
  shadows: tokens.shadows,
  typography: tokens.typography,
  motion: tokens.motion,
  accessibility: tokens.accessibility,
};

// Simple hook to access theme (no context needed for static theme)
export const useTheme = (): Theme => {
  return theme;
};

// Re-export tokens for direct access
export { tokens } from './tokens';
export type { Colors, Spacing, Radius, Typography, Motion } from './tokens';

// Helper functions for common patterns
export const helpers = {
  /**
   * Get spacing value
   * @param size - Size key from spacing scale
   * @returns Spacing value in pixels
   */
  spacing: (size: keyof typeof tokens.spacing): number => {
    return tokens.spacing[size];
  },

  /**
   * Get radius value
   * @param size - Size key from radius scale
   * @returns Radius value in pixels
   */
  radius: (size: keyof typeof tokens.radius): number => {
    return tokens.radius[size];
  },

  /**
   * Get color with opacity
   * @param color - Hex color string
   * @param opacity - Opacity value (0-1)
   * @returns RGBA color string
   */
  colorWithOpacity: (color: string, opacity: number): string => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  },

  /**
   * Create a shadow style from shadow token
   * @param shadow - Shadow token key
   * @returns Shadow style object
   */
  shadow: (shadow: keyof typeof tokens.shadows) => {
    return tokens.shadows[shadow];
  },
};

// Export default theme
export default theme;
