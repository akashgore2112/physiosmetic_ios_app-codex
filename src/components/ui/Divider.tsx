/**
 * Divider Component
 * Visual separator between sections or list items
 * Usage: <Divider /> or <Divider vertical height={40} />
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../../theme';

export type DividerVariant = 'solid' | 'dashed' | 'dotted';

export interface DividerProps {
  variant?: DividerVariant;
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  spacing?: keyof typeof import('../../theme').tokens.spacing;
  color?: string;
  style?: ViewStyle;
  width?: DimensionValue;
  height?: DimensionValue;
}

export const Divider: React.FC<DividerProps> = ({
  variant = 'solid',
  orientation = 'horizontal',
  thickness = 1,
  spacing = 'base',
  color,
  style,
  width,
  height,
}) => {
  const theme = useTheme();

  const dividerColor = color || theme.colors.borderSecondary;
  const spacingValue = theme.spacing[spacing];

  const getDividerStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: variant === 'solid' ? dividerColor : 'transparent',
      borderColor: dividerColor,
    };

    if (orientation === 'horizontal') {
      return {
        ...baseStyle,
        width: width || '100%',
        height: thickness,
        marginVertical: spacingValue,
        borderTopWidth: variant === 'dashed' ? thickness : 0,
        borderStyle: variant === 'solid' ? 'solid' : variant,
      };
    } else {
      // vertical
      return {
        ...baseStyle,
        width: thickness,
        height: height || '100%',
        marginHorizontal: spacingValue,
        borderLeftWidth: variant === 'dashed' ? thickness : 0,
        borderStyle: variant === 'solid' ? 'solid' : variant,
      };
    }
  };

  return <View style={[getDividerStyle(), style]} />;
};

const styles = StyleSheet.create({
  // Styles handled dynamically
});

export default Divider;
