import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BookingStackParamList } from '../../navigation/BookingStack';
import { getTherapistsForService } from '../../services/bookingService';
import { useToast } from '../../components/feedback/useToast';

type Props = NativeStackScreenProps<BookingStackParamList, 'SelectTherapist'>;

export default function SelectTherapistScreen({ route, navigation }: Props): JSX.Element {
  const { serviceId, serviceName, isOnline, appointmentId, oldSlotId } = route.params as any;
  const [loading, setLoading] = useState(true);
  const [therapists, setTherapists] = useState<{ id: string; name: string }[]>([]);
  const { show } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getTherapistsForService(serviceId);
        if (!cancelled) setTherapists(list);
      } catch (e: any) {
        show(e?.message ?? 'Failed to load therapists');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [serviceId]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Text style={{ fontSize: 16, marginBottom: 8 }}>Choose a therapist for {serviceName}</Text>
      <FlatList
        data={therapists}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('SelectDate', { serviceId, serviceName, therapistId: item.id, therapistName: item.name, isOnline: !!isOnline, appointmentId, oldSlotId })}
            style={{ backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8 }}
          >
            <Text style={{ fontWeight: '700' }}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>No therapists available for this service.</Text>}
      />
    </View>
  );
}
