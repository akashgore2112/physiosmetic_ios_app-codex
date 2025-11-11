/**
 * Button Component
 * Themed button with variants, sizes, and press animations
 */

import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  textStyle,
}) => {
  const theme = useTheme();

  // Variant styles
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: theme.colors.primary,
            ...theme.shadows.glowPrimary,
          },
          text: {
            color: theme.colors.textPrimary,
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: theme.colors.primary,
          },
          text: {
            color: theme.colors.primary,
          },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: 'transparent',
          },
          text: {
            color: theme.colors.textPrimary,
          },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: theme.colors.danger,
            ...theme.shadows.md,
          },
          text: {
            color: theme.colors.textPrimary,
          },
        };
    }
  };

  // Size styles
  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            minHeight: 36,
          },
          text: {
            fontSize: theme.typography.fontSize.sm,
          },
        };
      case 'md':
        return {
          container: {
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
            minHeight: theme.accessibility.minTapTarget,
          },
          text: {
            fontSize: theme.typography.fontSize.base,
          },
        };
      case 'lg':
        return {
          container: {
            paddingHorizontal: theme.spacing.xl,
            paddingVertical: theme.spacing.base,
            minHeight: 52,
          },
          text: {
            fontSize: theme.typography.fontSize.lg,
          },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.base,
        {
          borderRadius: theme.radius.md,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyles.text.color}
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              fontWeight: theme.typography.fontWeight.bold,
            },
            variantStyles.text,
            sizeStyles.text,
            textStyle,
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    textAlign: 'center',
  },
});

export default Button;
