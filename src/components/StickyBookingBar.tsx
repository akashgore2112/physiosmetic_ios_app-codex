import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PriceTag from './PriceTag';

type Props = {
  price?: number | null;
  durationMinutes?: number | null;
  ctaLabel?: string;
  onPressCta: () => void;
  disabled?: boolean;
  secondaryCtaLabel?: string;
  onPressSecondaryCta?: () => void;
};

export default function StickyBookingBar({
  price,
  durationMinutes,
  ctaLabel = 'Book This Service',
  onPressCta,
  disabled = false,
  secondaryCtaLabel,
  onPressSecondaryCta,
}: Props): JSX.Element {
  return (
    <SafeAreaView edges={['bottom']} style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <PriceTag price={price ?? null} durationMinutes={durationMinutes ?? null} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            onPress={onPressCta}
            disabled={disabled}
            style={({ pressed }) => [
              styles.cta,
              disabled && styles.ctaDisabled,
              pressed && !disabled && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </Pressable>
          {!!secondaryCtaLabel && !!onPressSecondaryCta && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={secondaryCtaLabel}
              onPress={onPressSecondaryCta}
              style={({ pressed }) => [
                styles.ctaSecondary,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.ctaSecondaryText}>{secondaryCtaLabel}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  cta: {
    backgroundColor: '#F37021',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  ctaDisabled: {
    backgroundColor: '#ccc',
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
  },
  ctaSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  ctaSecondaryText: {
    color: '#111',
    fontWeight: '700',
  },
});
