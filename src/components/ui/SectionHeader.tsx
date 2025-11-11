/**
 * SectionHeader Component
 * Section title with optional action button or "View All" link
 * Usage: <SectionHeader title="Top Products" action="View All" onActionPress={handleViewAll} />
 */

import React, { forwardRef } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from './Icon';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: string;
  onActionPress?: () => void;
  icon?: IconName;
  actionIcon?: IconName;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
  actionStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const SectionHeader = forwardRef<View, SectionHeaderProps>(({
  title,
  subtitle,
  action,
  onActionPress,
  icon,
  actionIcon = 'ChevronRight',
  style,
  titleStyle,
  subtitleStyle,
  actionStyle,
  accessibilityLabel,
  accessibilityHint,
}, ref) => {
  const theme = useTheme();

  return (
    <View ref={ref} style={[styles.container, style]}>
      {/* Left: Title & Icon */}
      <View style={styles.titleContainer}>
        {icon && (
          <Icon
            name={icon}
            size={24}
            color={theme.colors.primary}
            style={styles.icon}
          />
        )}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
              },
              titleStyle,
            ]}
            accessibilityLabel={accessibilityLabel || title}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  color: theme.colors.textTertiary,
                  fontSize: theme.typography.fontSize.sm,
                  marginTop: theme.spacing.xs,
                },
                subtitleStyle,
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {/* Right: Action Button */}
      {action && onActionPress && (
        <Pressable
          onPress={onActionPress}
          style={({ pressed }) => [
            styles.actionButton,
            {
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={action}
          accessibilityHint={accessibilityHint || `Press to ${action.toLowerCase()}`}
        >
          <Text
            style={[
              styles.actionText,
              {
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                marginRight: theme.spacing.xs,
              },
              actionStyle,
            ]}
          >
            {action}
          </Text>
          {actionIcon && (
            <Icon
              name={actionIcon}
              size={16}
              color={theme.colors.primary}
            />
          )}
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    // Styled dynamically via theme
  },
  subtitle: {
    // Styled dynamically via theme
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  actionText: {
    // Styled dynamically via theme
  },
});

export default SectionHeader;
