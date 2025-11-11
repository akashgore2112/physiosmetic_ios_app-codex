/**
 * Card Component
 * Glassmorphic card with elevation and optional press interaction
 */

import React, { forwardRef } from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';

export type CardVariant = 'default' | 'glass' | 'elevated' | 'flat';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  disabled?: boolean;
  padding?: keyof typeof import('../../theme').tokens.spacing;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Card = forwardRef<View, CardProps>(({
  children,
  variant = 'default',
  onPress,
  disabled = false,
  padding = 'base',
  style,
  accessibilityLabel,
  accessibilityHint,
}, ref) => {
  const theme = useTheme();

  // Variant styles
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: theme.colors.cardBg,
          borderWidth: 1,
          borderColor: theme.colors.borderSecondary,
          ...theme.shadows.md,
        };
      case 'glass':
        return {
          backgroundColor: theme.colors.cardBg,
          borderWidth: 1,
          borderColor: theme.colors.borderPrimary,
          ...theme.shadows.lg,
        };
      case 'elevated':
        return {
          backgroundColor: theme.colors.cardBgLight,
          borderWidth: 1,
          borderColor: theme.colors.borderSecondary,
          ...theme.shadows.lg,
        };
      case 'flat':
        return {
          backgroundColor: theme.colors.cardBg,
          borderWidth: 0,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const containerStyle: ViewStyle = {
    borderRadius: theme.radius.xl,
    padding: theme.spacing[padding],
    ...variantStyles,
  };

  const content = (
    <View
      ref={ref}
      style={[containerStyle, style]}
      accessible={!onPress && !!accessibilityLabel}
      accessibilityLabel={!onPress ? accessibilityLabel : undefined}
    >
      {children}
    </View>
  );

  // If pressable, wrap in Pressable
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          containerStyle,
          {
            opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
            transform: [{ translateY: pressed ? -2 : 0 }],
          },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  // Otherwise, just a View
  return content;
});

export default Card;
