import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { BookingStackParamList } from '../../navigation/BookingStack';
import { getSlotsForServiceAndDate, SlotWithTherapist } from '../../services/bookingService';
import { getServiceById } from '../../services/serviceCatalogService';
import { useToast } from '../../components/feedback/useToast';
import { formatTime } from '../../utils/formatDate';
import { isPastSlot } from '../../utils/clinicTime';
import useNetworkStore from '../../store/useNetworkStore';

type Props = NativeStackScreenProps<BookingStackParamList, 'SelectTimeSlot'>;

export default function SelectTimeSlotScreen({ route, navigation }: Props): JSX.Element {
  const { serviceId, serviceName, therapistId, therapistName, date } = route.params;
  const { show } = useToast();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<SlotWithTherapist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [hadError, setHadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getSlotsForServiceAndDate(serviceId, date);
        const filtered = therapistId ? s.filter((x) => x.therapist_id === therapistId) : s;
        const visible = filtered.filter((x) => !isPastSlot(x.date, x.start_time));
        if (!cancelled) {
          setSlots(visible);
          if (selectedId && !visible.some((v) => v.id === selectedId)) {
            setSelectedId(null);
          }
        }
      } catch (e: any) {
        show(e?.message ?? 'Failed to load slots');
        setHadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId, therapistId, date]);

  // Auto-prune past slots every 60s while focused
  useFocusEffect(
    React.useCallback(() => {
      const id = setInterval(() => {
        setSlots((curr) => {
          const pruned = curr.filter((s) => !isPastSlot(s.date, s.start_time));
          if (selectedId && !pruned.some((v) => v.id === selectedId)) {
            setSelectedId(null);
          }
          return pruned;
        });
      }, 60000);
      return () => clearInterval(id);
    }, [selectedId])
  );

  const selectedSlot = useMemo(() => slots.find((s) => s.id === selectedId) || null, [selectedId, slots]);

  const onContinue = async () => {
    if (!selectedSlot) return;
    setContinuing(true);

    try {
      // Fetch service to get base price
      const service = await getServiceById(serviceId);
      const basePrice = service?.base_price || 0;

      navigation.navigate('BookingCheckout' as any, {
        serviceId,
        serviceName,
        therapistId: selectedSlot.therapist_id,
        therapistName: selectedSlot.therapist?.name ?? therapistName,
        slot: {
          id: selectedSlot.id,
          date: selectedSlot.date,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
        },
        basePrice,
      });
    } catch (e: any) {
      show(e?.message || 'Failed to proceed to checkout');
      setContinuing(false);
    }
  };

  // Auto-retry on reconnect
  useEffect(() => {
    if (isOnline && hadError) {
      setHadError(false);
      setLoading(true);
      (async () => {
        try {
          const s = await getSlotsForServiceAndDate(serviceId, date);
          const filtered = therapistId ? s.filter((x) => x.therapist_id === therapistId) : s;
          const visible = filtered.filter((x) => !isPastSlot(x.date, x.start_time));
          setSlots(visible);
        } catch {}
        setLoading(false);
      })();
    }
  }, [isOnline]);

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
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        renderItem={({ item }) => {
          const selected = item.id === selectedId;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Select ${formatTime(item.start_time)} to ${formatTime(item.end_time)}`}
              onPress={() => setSelectedId(item.id)}
              activeOpacity={0.75}
              style={{ padding: 14, minHeight: 44, backgroundColor: selected ? '#fff6ef' : '#fff', borderRadius: 10, marginBottom: 8, borderWidth: selected ? 2 : 1, borderColor: selected ? '#F37021' : '#eee', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text style={{ fontWeight: '600' }}>{formatTime(item.start_time)} - {formatTime(item.end_time)}</Text>
              {selected && <Text style={{ color: '#F37021', fontSize: 18 }}>✓</Text>}
              {!!(item.therapist?.name || therapistName) && (
                <Text style={{ marginTop: 4, color: '#666' }}>Therapist: {item.therapist?.name || therapistName}</Text>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          hadError ? (
            <TouchableOpacity onPress={() => {
              setHadError(false);
              setLoading(true);
              (async () => {
                try {
                  const s = await getSlotsForServiceAndDate(serviceId, date);
                  const filtered = therapistId ? s.filter((x) => x.therapist_id === therapistId) : s;
                  const visible = filtered.filter((x) => !isPastSlot(x.date, x.start_time));
                  setSlots(visible);
                } catch {}
                setLoading(false);
              })();
            }} style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: '#1e64d4' }}>Tap to retry</Text>
            </TouchableOpacity>
          ) : (
            <Text>No slots for this date. Pick another date.</Text>
          )
        }
      />

      {/* Pick another date link aligned under slots */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ alignSelf: 'center', marginTop: 8, padding: 8 }}>
        <Text style={{ color: '#1e64d4', fontWeight: '600' }}>Pick another date</Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Continue to confirm booking"
        onPress={onContinue}
        disabled={!selectedSlot}
        style={{ backgroundColor: selectedSlot ? '#F37021' : '#ccc', padding: 16, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>{continuing ? 'Continuing…' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );
}
