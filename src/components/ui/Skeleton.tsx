/**
 * Skeleton Component
 * Animated loading placeholder with shimmer effect
 * Usage: <Skeleton variant="text" width={200} height={20} />
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';
import { usePrefersReducedMotion } from '../../hooks';

export type SkeletonVariant = 'text' | 'rect' | 'circle' | 'rounded';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: DimensionValue;
  height?: number;
  style?: ViewStyle;
  animate?: boolean; // Allow disabling animation for accessibility
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  width = '100%',
  height = 20,
  style,
  animate = true,
}) => {
  const theme = useTheme();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Respect user's accessibility preference
  const shouldAnimate = animate && !prefersReducedMotion;

  // Animated opacity value
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (shouldAnimate) {
      opacity.value = withRepeat(
        withTiming(1, {
          duration: theme.motion.duration.slower,
          easing: Easing.inOut(Easing.ease),
        }),
        -1, // Infinite loop
        true // Reverse animation
      );
    }
  }, [shouldAnimate, theme.motion.duration.slower, opacity]);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Variant-specific border radius
  const getBorderRadius = (): number => {
    switch (variant) {
      case 'text':
        return theme.radius.sm;
      case 'rect':
        return theme.radius.md;
      case 'rounded':
        return theme.radius.xl;
      case 'circle':
        return 999; // Fully circular
    }
  };

  const borderRadius = getBorderRadius();

  const containerStyle: ViewStyle = {
    width,
    height,
    borderRadius,
    backgroundColor: theme.colors.cardBgLight,
    overflow: 'hidden',
  };

  // If animation is disabled (e.g., for accessibility), just show static skeleton
  if (!shouldAnimate) {
    return <View style={[containerStyle, style]} />;
  }

  // Shimmer animation using reanimated directly
  return (
    <View style={[containerStyle, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme.colors.borderPrimary,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

export default Skeleton;
