import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatPrice } from '../utils/formatPrice';

interface TotalsCardProps {
  subtotal: number;
  discount?: number;
  tax?: number;
  shipping?: number;
  total: number;
  couponCode?: string | null;
  pickup?: boolean;
}

export default function TotalsCard({
  subtotal,
  discount = 0,
  tax = 0,
  shipping = 0,
  total,
  couponCode,
  pickup,
}: TotalsCardProps): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Order Summary</Text>

      {/* Subtotal */}
      <View style={styles.row}>
        <Text style={styles.label}>Subtotal</Text>
        <Text style={styles.value}>{formatPrice(subtotal)}</Text>
      </View>

      {/* Discount (if coupon applied) */}
      {discount > 0 && (
        <View style={styles.row}>
          <Text style={[styles.label, styles.discount]}>
            Discount {couponCode ? `(${couponCode})` : ''}
          </Text>
          <Text style={[styles.value, styles.discount]}>-{formatPrice(discount)}</Text>
        </View>
      )}

      {/* Tax */}
      <View style={styles.row}>
        <Text style={styles.label}>Tax (10%)</Text>
        <Text style={styles.value}>{formatPrice(tax)}</Text>
      </View>

      {/* Shipping */}
      <View style={styles.row}>
        <Text style={styles.label}>Shipping</Text>
        {pickup ? (
          <Text style={[styles.value, styles.free]}>FREE (Pickup)</Text>
        ) : (
          <Text style={styles.value}>{formatPrice(shipping)}</Text>
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Total */}
      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatPrice(total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#555',
  },
  value: {
    fontSize: 14,
    color: '#333',
  },
  discount: {
    color: '#16a34a',
    fontWeight: '600',
  },
  free: {
    color: '#16a34a',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
});
