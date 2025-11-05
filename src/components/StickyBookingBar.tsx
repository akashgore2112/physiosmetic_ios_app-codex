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
};

export default function StickyBookingBar({
  price,
  durationMinutes,
  ctaLabel = 'Book This Service',
  onPressCta,
  disabled = false,
}: Props): JSX.Element {
  return (
    <SafeAreaView edges={['bottom']} style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <PriceTag price={price ?? null} durationMinutes={durationMinutes ?? null} />
        </View>
        <Pressable
          accessibilityRole="button"
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
  },
  ctaDisabled: {
    backgroundColor: '#ccc',
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
  },
});

