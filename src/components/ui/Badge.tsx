/**
 * Badge Component
 * Status indicators, payment method badges, and category chips
 * Usage: <Badge variant="success">Paid</Badge>
 */

import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from './Icon';

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'primary'
  | 'secondary';

export type BadgeSize = 'sm' | 'md' | 'lg';

export type BadgeShape = 'badge' | 'pill';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  shape?: BadgeShape;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export const Badge = forwardRef<View, BadgeProps>(({
  children,
  variant = 'neutral',
  size = 'md',
  shape = 'badge',
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  accessibilityLabel,
}, ref) => {
  const theme = useTheme();

  // Variant color styles
  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'success':
        return {
          container: {
            backgroundColor: theme.colors.success + '20', // 20% opacity
            borderWidth: 1,
            borderColor: theme.colors.success,
          },
          text: {
            color: theme.colors.success,
          },
        };
      case 'warning':
        return {
          container: {
            backgroundColor: theme.colors.warning + '20',
            borderWidth: 1,
            borderColor: theme.colors.warning,
          },
          text: {
            color: theme.colors.warning,
          },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: theme.colors.danger + '20',
            borderWidth: 1,
            borderColor: theme.colors.danger,
          },
          text: {
            color: theme.colors.danger,
          },
        };
      case 'info':
        return {
          container: {
            backgroundColor: theme.colors.info + '20',
            borderWidth: 1,
            borderColor: theme.colors.info,
          },
          text: {
            color: theme.colors.info,
          },
        };
      case 'primary':
        return {
          container: {
            backgroundColor: theme.colors.primary + '20',
            borderWidth: 1,
            borderColor: theme.colors.primary,
          },
          text: {
            color: theme.colors.primary,
          },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: theme.colors.secondary + '20',
            borderWidth: 1,
            borderColor: theme.colors.secondary,
          },
          text: {
            color: theme.colors.secondary,
          },
        };
      case 'neutral':
      default:
        return {
          container: {
            backgroundColor: theme.colors.cardBg,
            borderWidth: 1,
            borderColor: theme.colors.borderSecondary,
          },
          text: {
            color: theme.colors.textSecondary,
          },
        };
    }
  };

  // Size styles
  const getSizeStyles = (): { container: ViewStyle; text: TextStyle; iconSize: number } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            minHeight: 20,
          },
          text: {
            fontSize: theme.typography.fontSize.xs,
          },
          iconSize: 12,
        };
      case 'md':
        return {
          container: {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            minHeight: 24,
          },
          text: {
            fontSize: theme.typography.fontSize.sm,
          },
          iconSize: 14,
        };
      case 'lg':
        return {
          container: {
            paddingHorizontal: theme.spacing.base,
            paddingVertical: theme.spacing.sm,
            minHeight: 28,
          },
          text: {
            fontSize: theme.typography.fontSize.base,
          },
          iconSize: 16,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const containerStyle: ViewStyle = {
    borderRadius: shape === 'pill' ? 999 : theme.radius.md,
    ...variantStyles.container,
    ...sizeStyles.container,
  };

  const textContent = (
    <Text
      style={[
        styles.text,
        {
          fontWeight: theme.typography.fontWeight.medium,
        },
        variantStyles.text,
        sizeStyles.text,
        textStyle,
      ]}
    >
      {children}
    </Text>
  );

  return (
    <View
      ref={ref}
      style={[styles.container, containerStyle, style]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
      accessibilityRole="text"
    >
      {icon && iconPosition === 'left' && (
        <Icon
          name={icon}
          size={sizeStyles.iconSize}
          color={variantStyles.text.color as string}
          style={styles.iconLeft}
        />
      )}
      {textContent}
      {icon && iconPosition === 'right' && (
        <Icon
          name={icon}
          size={sizeStyles.iconSize}
          color={variantStyles.text.color as string}
          style={styles.iconRight}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: 4,
  },
  iconRight: {
    marginLeft: 4,
  },
});

export default Badge;
