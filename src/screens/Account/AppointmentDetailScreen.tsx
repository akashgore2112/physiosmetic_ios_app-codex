import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../../config/supabaseClient';
import { formatDate, formatTime } from '../../utils/formatDate';

type Props = {
  route: { params: { id: string } };
};

export default function AppointmentDetailScreen({ route }: Props): JSX.Element {
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
          .select('id,status,notes, services:service_id(name), therapists:therapist_id(name), availability_slots:slot_id(date,start_time,end_time)')
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
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => (navigation as any)?.goBack?.()} style={({ pressed }) => ({ marginTop: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: '#efefef', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.9 : 1 })}>
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

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '800' }}>{svcName}</Text>
      <Text style={{ marginTop: 6, color: '#444' }}>{thName}</Text>
      {(date && start) && (
        <Text style={{ marginTop: 6 }}>{formatDate(date)} • {formatTime(start)}{end ? ` – ${formatTime(end)}` : ''}</Text>
      )}
      <View style={{ marginTop: 12, padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee' }}>
        <Text>Status: <Text style={{ fontWeight: '700' }}>{data.status}</Text></Text>
        {!!data.notes && <Text style={{ marginTop: 8 }}>Notes: {data.notes}</Text>}
      </View>
    </ScrollView>
  );
}
