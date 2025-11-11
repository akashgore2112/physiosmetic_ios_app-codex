import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSessionStore } from '../../store/useSessionStore';
import { cancelAppointment, getMyAllAppointments, syncMyPastAppointments } from '../../services/bookingService';
import { useToast } from '../../components/feedback/useToast';
import { formatDate, formatTime } from '../../utils/formatDate';
import { isPastSlot } from '../../utils/clinicTime';
import useNetworkStore from '../../store/useNetworkStore';

type Row = {
  id: string;
  status: string;
  service_id: string;
  therapist_id: string;
  slot_id: string | null;
  slot: { date: string; start_time: string; end_time: string } | null;
  service_name?: string;
  therapist_name?: string;
  payment_method?: string | null;
  payment_status?: string | null;
  amount_paid?: number | null;
  isPast?: boolean;
};

export default function MyAppointmentsScreen(): JSX.Element {
  const { userId } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [offset, setOffset] = useState(0);
  const PAGE = 20;
  const { show } = useToast();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [hadError, setHadError] = useState(false);

  async function fetchRows(reset = true) {
    if (!userId) return setRows([]);
    if (reset) setLoading(true);
    try {
      syncMyPastAppointments().catch(() => {});
      const all = await getMyAllAppointments();
      setRows(all as any);
    } catch (e: any) {
      show(e?.message ?? 'Failed to load');
      setHadError(true);
    } finally {
      if (reset) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchRows(true);
  }, [userId]);

  useEffect(() => {
    if (isOnline && hadError) fetchRows(true);
  }, [isOnline]);

  useFocusEffect(useCallback(() => {
    fetchRows(true);
    const id = setInterval(() => fetchRows(true), 60000);
    return () => clearInterval(id);
  }, []));

  const minutesUntil = (dateISO?: string, timeHHMM?: string): number | null => {
    if (!dateISO || !timeHHMM) return null;
    try {
      const [y, m, d] = dateISO.split('-').map((n) => parseInt(n, 10));
      const [hh, mm] = timeHHMM.split(':').map((n) => parseInt(n, 10));
      const target = new Date(Date.UTC(y, m - 1, d, hh, mm));
      const now = new Date();
      return Math.round((target.getTime() - now.getTime()) / 60000);
    } catch {
      return null;
    }
  };

  const onCancel = async (item: Row) => {
    try {
      // Enforce cancellation window (60 minutes before start)
      const mins = minutesUntil(item.slot?.date, item.slot?.start_time);
      if (mins !== null && mins < 60) {
        show('Cancellation is disabled within 60 minutes of start time');
        return;
      }
      await cancelAppointment(item.id);
      show('Cancelled');
      fetchRows();
    } catch (e: any) {
      show(e?.message ?? 'Cancel failed');
    }
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => {
            const past = item.slot ? isPastSlot(item.slot.date, item.slot.start_time) : false;
            const effectiveStatus = item.status === 'booked' && past ? 'completed' : item.status;
            const mins = minutesUntil(item.slot?.date, item.slot?.start_time) ?? 9999;
            const canCancel = item.status === 'booked' && !past && mins >= 60;
            const canReschedule = item.status === 'booked' && !past;
            const paymentMethodLabel = item.payment_method === 'razorpay' ? 'Razorpay' : item.payment_method === 'stripe' ? 'Stripe' : item.payment_method === 'pay_at_clinic' ? 'Pay at Clinic' : null;
            const paymentStatusColor = item.payment_status === 'paid' ? '#16a34a' : item.payment_status === 'pending' ? '#d97706' : '#666';

            return (
              <View style={{ backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', flex: 1 }}>{item.service_name || 'Service'} • {item.therapist_name || 'Therapist'}</Text>
                  {item.amount_paid && (
                    <Text style={{ fontWeight: '600', marginLeft: 8 }}>₹{item.amount_paid}</Text>
                  )}
                </View>
                {!!item.slot && <Text style={{ marginTop: 4 }}>{formatDate(item.slot.date)} • {formatTime(item.slot.start_time)}</Text>}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                  <Text style={{ color: effectiveStatus === 'booked' ? '#2e7d32' : '#666' }}>Status: {effectiveStatus}</Text>
                  {paymentMethodLabel && (
                    <View style={{ backgroundColor: '#f0f9ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: '#0369a1', fontSize: 10, fontWeight: '600' }}>{paymentMethodLabel}</Text>
                    </View>
                  )}
                  {item.payment_status && (
                    <View style={{ backgroundColor: paymentStatusColor, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' }}>{item.payment_status}</Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                  <TouchableOpacity disabled={!canCancel} onPress={() => onCancel(item)} style={{ padding: 10, backgroundColor: canCancel ? '#eee' : '#f5f5f5', borderRadius: 8 }}>
                    <Text style={{ color: canCancel ? '#000' : '#999' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!canReschedule}
                    onPress={() =>
                      (global as any).navigation?.navigate?.('Services', {
                        screen: 'SelectDate',
                        params: {
                          serviceName: item.service_name,
                          serviceId: item.service_id,
                          therapistId: item.therapist_id,
                          therapistName: item.therapist_name,
                          appointmentId: item.id,
                          oldSlotId: item.slot_id ?? undefined,
                        },
                      })
                    }
                    style={{ padding: 10, backgroundColor: canReschedule ? '#e6f2ff' : '#f5f5f5', borderRadius: 8 }}
                  >
                    <Text style={{ color: canReschedule ? '#1e64d4' : '#999' }}>Reschedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            hadError ? (
              <TouchableOpacity onPress={() => fetchRows(true)} style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#1e64d4' }}>Tap to retry</Text>
              </TouchableOpacity>
            ) : (
              <Text>No appointments</Text>
            )
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setOffset(0); fetchRows(true); }} />}
          onEndReachedThreshold={0.2}
          onEndReached={() => fetchRows(false)}
        />
      )}
    </View>
  );
}
