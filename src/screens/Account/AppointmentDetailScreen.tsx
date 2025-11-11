import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { supabase } from '../../config/supabaseClient';
import { formatDate, formatTime } from '../../utils/formatDate';
import { formatPrice } from '../../utils/formatPrice';

type Props = {
  route: { params: { id: string } };
  navigation: any;
};

export default function AppointmentDetailScreen({ route, navigation }: Props): JSX.Element {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('appointments')
          .select('id,status,notes, payment_method, payment_status, payment_gateway, gateway_payment_id, amount_paid, discount_amount, coupon_code, services:service_id(name), therapists:therapist_id(name), availability_slots:slot_id(date,start_time,end_time)')
          .eq('id', id)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled) setData(data as any);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', textAlign: 'center' }}>This appointment doesn’t exist or may have expired.</Text>
        <Text style={{ marginTop: 6, color: '#555', textAlign: 'center' }}>Please check My Appointments for the latest status.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation?.goBack?.()} style={({ pressed }) => ({ marginTop: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: '#efefef', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.9 : 1 })}>
          <Text style={{ fontWeight: '700' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const svcName = data?.services?.name ?? 'Service';
  const thName = data?.therapists?.name ?? 'Therapist';
  const date = data?.availability_slots?.date as string | undefined;
  const start = data?.availability_slots?.start_time as string | undefined;
  const end = data?.availability_slots?.end_time as string | undefined;

  const paymentMethodLabel = data.payment_method === 'razorpay' ? 'Razorpay' : data.payment_method === 'stripe' ? 'Stripe' : data.payment_method === 'pay_at_clinic' ? 'Pay at Clinic' : 'Unknown';
  const paymentStatusLabel = data.payment_status === 'paid' ? 'Paid' : data.payment_status === 'pending' ? 'Pending' : data.payment_status === 'failed' ? 'Failed' : data.payment_status === 'refunded' ? 'Refunded' : 'Unknown';
  const paymentStatusColor = data.payment_status === 'paid' ? '#16a34a' : data.payment_status === 'failed' ? '#dc2626' : data.payment_status === 'refunded' ? '#ea580c' : '#d97706';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>{svcName}</Text>
      <Text style={{ marginTop: 6, color: '#444' }}>{thName}</Text>
      {(date && start) && (
        <Text style={{ marginTop: 6 }}>{formatDate(date)} • {formatTime(start)}{end ? ` – ${formatTime(end)}` : ''}</Text>
      )}

      {/* Appointment Status */}
      <View style={{ marginTop: 12, padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee' }}>
        <Text>Status: <Text style={{ fontWeight: '700' }}>{data.status}</Text></Text>
        {!!data.notes && <Text style={{ marginTop: 8 }}>Notes: {data.notes}</Text>}
      </View>

      {/* Payment Information */}
      {(data.payment_method || data.amount_paid) && (
        <View style={{ marginTop: 12, padding: 12, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#eee' }}>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Payment Information</Text>

          {data.amount_paid && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: '#666' }}>Amount:</Text>
              <Text style={{ fontWeight: '600' }}>{formatPrice(data.amount_paid)}</Text>
            </View>
          )}

          {data.payment_method && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: '#666' }}>Method:</Text>
              <Text style={{ fontWeight: '600' }}>{paymentMethodLabel}</Text>
            </View>
          )}

          {data.payment_status && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ color: '#666' }}>Status:</Text>
              <View style={{ backgroundColor: paymentStatusColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{paymentStatusLabel}</Text>
              </View>
            </View>
          )}

          {data.gateway_payment_id && (
            <Text style={{ color: '#666', fontSize: 11, marginTop: 6 }}>Transaction ID: {data.gateway_payment_id}</Text>
          )}

          {data.discount_amount > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
              <Text style={{ color: '#16a34a' }}>Discount{data.coupon_code ? ` (${data.coupon_code})` : ''}:</Text>
              <Text style={{ color: '#16a34a', fontWeight: '600' }}>-{formatPrice(data.discount_amount)}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
