import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSessionStore } from '../../store/useSessionStore';
import { cancelAppointment } from '../../services/bookingService';
import { supabase } from '../../config/supabaseClient';
import { useToast } from '../../components/feedback/useToast';
import { formatDate, formatTime } from '../../utils/formatDate';
import useNetworkStore from '../../store/useNetworkStore';

type Row = { id: string; status: string; slot: { id: string; date: string; start_time: string; end_time: string } };

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
      const { data, error } = await supabase
        .from('appointments')
        .select('id,status, service_id, therapist_id, availability_slots:slot_id(id,date,start_time,end_time), services:service_id(name), therapists:therapist_id(name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(reset ? 0 : offset, (reset ? 0 : offset) + PAGE - 1);
      if (error) throw error;
      const mapped = (data ?? []) as any;
      setRows(reset ? mapped : [...rows, ...mapped]);
      if (!reset) setOffset(offset + PAGE);
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

  useFocusEffect(useCallback(() => { fetchRows(true); }, []));

  const onCancel = async (id: string) => {
    try {
      await cancelAppointment(id);
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
            const future = true; // server enforces; simplify here
            const canAct = item.status === 'booked' && future;
            return (
              <View style={{ backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8 }}>
                <Text style={{ fontWeight: '700' }}>{item.services?.name || 'Service'} • {item.therapists?.name || 'Therapist'}</Text>
                <Text style={{ marginTop: 4 }}>{formatDate(item.availability_slots.date)} • {formatTime(item.availability_slots.start_time)}</Text>
                <Text style={{ marginTop: 6, color: item.status === 'booked' ? '#2e7d32' : '#666' }}>Status: {item.status}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                  <TouchableOpacity disabled={!canAct} onPress={() => onCancel(item.id)} style={{ padding: 10, backgroundColor: canAct ? '#eee' : '#f5f5f5', borderRadius: 8 }}>
                    <Text style={{ color: canAct ? '#000' : '#999' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!canAct}
                    onPress={() =>
                      (global as any).navigation?.navigate?.('Services', {
                        screen: 'SelectDate',
                        params: {
                          serviceName: item.services?.name,
                          serviceId: item.service_id,
                          therapistId: item.therapist_id,
                          therapistName: item.therapists?.name,
                          appointmentId: item.id,
                          oldSlotId: item.availability_slots?.id,
                        },
                      })
                    }
                    style={{ padding: 10, backgroundColor: canAct ? '#e6f2ff' : '#f5f5f5', borderRadius: 8 }}
                  >
                    <Text style={{ color: canAct ? '#1e64d4' : '#999' }}>Reschedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text>No appointments</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setOffset(0); fetchRows(true); }} />}
          onEndReachedThreshold={0.2}
          onEndReached={() => fetchRows(false)}
        />
      )}
    </View>
  );
}
