/**
 * Input Component
 * Themed text input with label, helper text, and error states
 * Usage: <Input label="Email" value={email} onChangeText={setEmail} error={emailError} />
 */

import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { useTheme } from '../../theme';
import { Icon, IconName } from './Icon';

export interface InputProps extends TextInputProps {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  disabled?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  disabled = false,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  accessibilityLabel,
  accessibilityHint,
  ...restProps
}, ref) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  // Input container states
  const getInputContainerStyle = (): ViewStyle => {
    if (disabled) {
      return {
        backgroundColor: theme.colors.cardBgLight,
        borderColor: theme.colors.borderSecondary,
        opacity: 0.5,
      };
    }
    if (error) {
      return {
        backgroundColor: theme.colors.cardBg,
        borderColor: theme.colors.danger,
        ...theme.shadows.md,
      };
    }
    if (isFocused) {
      return {
        backgroundColor: theme.colors.cardBg,
        borderColor: theme.colors.primary,
        ...theme.shadows.glowPrimary,
      };
    }
    return {
      backgroundColor: theme.colors.cardBg,
      borderColor: theme.colors.borderSecondary,
    };
  };

  const inputContainerStyle = getInputContainerStyle();

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: error ? theme.colors.danger : theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              marginBottom: theme.spacing.xs,
            },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      )}

      {/* Input Container */}
      <View
        style={[
          styles.inputContainer,
          {
            borderRadius: theme.radius.md,
            borderWidth: 1,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            minHeight: theme.accessibility.minTapTarget,
          },
          inputContainerStyle,
        ]}
      >
        {/* Left Icon */}
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={20}
            color={error ? theme.colors.danger : theme.colors.textSecondary}
            style={styles.leftIcon}
          />
        )}

        {/* Text Input */}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              fontSize: theme.typography.fontSize.base,
            },
            inputStyle,
          ]}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint || helperText}
          {...restProps}
        />

        {/* Right Icon */}
        {rightIcon && (
          <Icon
            name={rightIcon}
            size={20}
            color={error ? theme.colors.danger : theme.colors.textSecondary}
            style={styles.rightIcon}
          />
        )}
      </View>

      {/* Helper Text or Error */}
      {(helperText || error) && (
        <Text
          style={[
            styles.helperText,
            {
              color: error ? theme.colors.danger : theme.colors.textTertiary,
              fontSize: theme.typography.fontSize.xs,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    // Styled dynamically via theme
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    // No padding here, handled by inputContainer
  },
  rightIcon: {
    marginLeft: 8,
  },
  helperText: {
    // Styled dynamically via theme
  },
});

export default Input;
