import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BookingStackParamList } from '../../navigation/BookingStack';
import { getSlotsForServiceAndDate, SlotWithTherapist } from '../../services/bookingService';
import { useToast } from '../../components/feedback/useToast';
import { formatTime } from '../../utils/formatDate';

type Props = NativeStackScreenProps<BookingStackParamList, 'SelectTimeSlot'>;

export default function SelectTimeSlotScreen({ route, navigation }: Props): JSX.Element {
  const { serviceId, serviceName, therapistId, therapistName, date } = route.params;
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<SlotWithTherapist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getSlotsForServiceAndDate(serviceId, date);
        const filtered = therapistId ? s.filter((x) => x.therapist_id === therapistId) : s;
        if (!cancelled) setSlots(filtered);
      } catch (e: any) {
        show(e?.message ?? 'Failed to load slots');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId, therapistId, date]);

  const selectedSlot = useMemo(() => slots.find((s) => s.id === selectedId) || null, [selectedId, slots]);

  const onContinue = () => {
    if (!selectedSlot) return;
    setContinuing(true);
    navigation.navigate('ConfirmBooking' as any, {
      serviceId,
      serviceName,
      slot: {
        id: selectedSlot.id,
        date: selectedSlot.date,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        therapist_id: selectedSlot.therapist_id,
        therapistName: selectedSlot.therapist?.name ?? therapistName,
      },
      appointmentId: route.params?.appointmentId,
      oldSlotId: route.params?.oldSlotId,
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontSize: 16, marginBottom: 8 }}>Select a time on {date}</Text>
      <FlatList
        data={slots}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const selected = item.id === selectedId;
          return (
            <TouchableOpacity
              onPress={() => setSelectedId(item.id)}
              activeOpacity={0.75}
              style={{ padding: 14, backgroundColor: selected ? '#fff6ef' : '#fff', borderRadius: 10, marginBottom: 8, borderWidth: selected ? 2 : 1, borderColor: selected ? '#F37021' : '#eee', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text style={{ fontWeight: '600' }}>{formatTime(item.start_time)} - {formatTime(item.end_time)}</Text>
              {selected && <Text style={{ color: '#F37021', fontSize: 18 }}>✓</Text>}
              {!!(item.therapist?.name || therapistName) && (
                <Text style={{ marginTop: 4, color: '#666' }}>Therapist: {item.therapist?.name || therapistName}</Text>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text>No slots for this date. Pick another date.</Text>}
      />

      {/* Pick another date link aligned under slots */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'center', marginTop: 8, padding: 8 }}>
        <Text style={{ color: '#1e64d4', fontWeight: '600' }}>Pick another date</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onContinue}
        disabled={!selectedSlot}
        style={{ backgroundColor: selectedSlot ? '#F37021' : '#ccc', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>{continuing ? 'Continuing…' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );
}
