import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BookingStackParamList } from '../../navigation/BookingStack';
import { getBookableDatesForService } from '../../services/bookingService';
import { formatDate } from '../../utils/formatDate';
import { useToast } from '../../components/feedback/useToast';
import useNetworkStore from '../../store/useNetworkStore';

type Props = NativeStackScreenProps<BookingStackParamList, 'SelectDate'>;

export default function SelectDateScreen({ route, navigation }: Props): JSX.Element {
  const { serviceId, serviceName, therapistId, therapistName, appointmentId, oldSlotId } = route.params;
  const { show } = useToast();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [hadError, setHadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await getBookableDatesForService(serviceId);
        if (!cancelled) setDates(d);
      } catch (e: any) {
        show(e?.message ?? 'Failed to load dates');
        setHadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serviceId]);

  // Auto-retry on reconnect
  useEffect(() => {
    if (isOnline && hadError) {
      setHadError(false);
      setLoading(true);
      (async () => {
        try {
          const d = await getBookableDatesForService(serviceId);
          setDates(d);
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
      <Text style={{ fontSize: 16, marginBottom: 8 }}>Select a date for {serviceName}</Text>
      <FlatList
        data={dates}
        keyExtractor={(d) => d}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ padding: 14, backgroundColor: '#fff', borderRadius: 10, marginBottom: 8 }}
            onPress={() => navigation.navigate('SelectTimeSlot', { serviceId, serviceName, therapistId, therapistName, date: item, appointmentId, oldSlotId })}
          >
            <Text style={{ fontWeight: '600' }}>{formatDate(item)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>No dates available. Please pick another service.</Text>}
      />
    </View>
  );
}
