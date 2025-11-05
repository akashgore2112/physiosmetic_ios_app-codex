import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { formatPrice } from '../utils/formatPrice';

type Props = {
  price: number | null | undefined;
  durationMinutes?: number | null;
};

export default function PriceTag({ price, durationMinutes }: Props): JSX.Element | null {
  const hasPrice = typeof price === 'number' && !Number.isNaN(price);
  const hasDuration = typeof durationMinutes === 'number' && !Number.isNaN(durationMinutes);

  if (!hasPrice && !hasDuration) return null;

  const parts: string[] = [];
  if (hasPrice) parts.push(`From ${formatPrice(price as number)}`);
  if (hasDuration) parts.push(`~${durationMinutes} min`);

  return (
    <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
      {parts.join(' • ')}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    color: '#666',
    fontSize: 12,
  },
});

