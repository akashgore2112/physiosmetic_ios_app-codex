import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BookingStackParamList } from '../../navigation/BookingStack';
import { getTherapistsForService, getNextSlotForTherapist } from '../../services/bookingService';
import { useToast } from '../../components/feedback/useToast';
import TherapistCard from '../../components/TherapistCard';
import { supabase } from '../../config/supabaseClient';
import { formatDate, formatTime } from '../../utils/formatDate';

type Props = NativeStackScreenProps<BookingStackParamList, 'SelectTherapist'>;

export default function SelectTherapistScreen({ route, navigation }: Props): JSX.Element {
  const { serviceId, isOnline, serviceName, category } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [therapists, setTherapists] = useState<any[]>([]);
  const [nextMap, setNextMap] = useState<Record<string, string | null>>({});
  const { show } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Prefer availability-backed list; else fallback to active therapists by category
        let list = await getTherapistsForService(serviceId);
        if (!list || list.length === 0) {
          const q = supabase.from('therapists').select('id,name,speciality,about,photo_url').eq('is_active', true);
          const { data, error } = await q;
          if (error) throw error;
          list = (data ?? []).filter((t: any) => !category || (t.speciality || '').toLowerCase().includes(String(category).toLowerCase()));
        }
        if (!cancelled) setTherapists(list as any);
      } catch (e: any) {
        show(e?.message ?? 'Failed to load therapists');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [serviceId, category]);

  useEffect(() => {
    // Fire-and-forget next slot fetch per therapist
    therapists.forEach(async (t) => {
      try {
        const slot = await getNextSlotForTherapist(serviceId, t.id);
        const text = slot ? `${formatDate(slot.date)} · ${formatTime(slot.start_time)}` : null;
        setNextMap((m) => ({ ...m, [t.id]: text }));
      } catch {
        setNextMap((m) => ({ ...m, [t.id]: null }));
      }
    });
  }, [therapists, serviceId]);

  if (loading) {
    return (
      <View style={{ flex: 1, padding: 12 }}>
        {[1,2,3].map((i) => (
          <View key={i} style={{ height: 120, backgroundColor: '#f3f3f3', borderRadius: 12, marginBottom: 12 }} />
        ))}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 8 }}>Choose Specialist</Text>
      <FlatList
        data={therapists}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TherapistCard
            therapist={item}
            nextSlotText={nextMap[item.id] ?? null}
            showOnlineBadge={!!isOnline}
            onSelect={(tid) => navigation.navigate('SelectDate', { serviceId, serviceName, therapistId: tid, therapistName: item.name, isOnline: !!isOnline })}
          />
        )}
        ListEmptyComponent={<Text>Our team list is being updated.</Text>}
      />
    </View>
  );
}
