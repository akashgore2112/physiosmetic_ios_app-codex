import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Image, Pressable, ScrollView } from 'react-native';
import { getServiceById } from '../../services/serviceCatalogService';
import { getNextSlotsForService } from '../../services/bookingService';
import PriceTag from '../../components/PriceTag';
import NextSlotsRow from '../../components/NextSlotsRow';
import StickyBookingBar from '../../components/StickyBookingBar';
import { useToast } from '../../components/feedback/useToast';
import { toastError } from '../../utils/toast';

export default function ServiceDetailScreen({ route, navigation }: any): JSX.Element {
  const { serviceId: routeServiceId } = route.params ?? {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<any | null>(null);
  const [nextSlots, setNextSlots] = useState<any[]>([]);
  const [descExpanded, setDescExpanded] = useState(false);
  const { show } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const svc = await getServiceById(routeServiceId);
      setService(svc);
      if (svc?.id) {
        const slots = await getNextSlotsForService(svc.id, 3);
        setNextSlots(
          slots.map((s: any) => ({
            id: s.id,
            date: s.date,
            start_time: s.start_time,
            therapist_id: s.therapist_id,
            therapist_name: s.therapist?.name,
          }))
        );
      } else setNextSlots([]);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load service');
      toastError(e);
    } finally {
      setLoading(false);
    }
  }, [routeServiceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await load(); })();
    return () => { cancelled = true; };
  }, [load]);

  const onPressSlot = useCallback((slot: any) => {
    if (!service?.id) return;
    navigation.navigate('SelectTimeSlot', {
      serviceId: service.id,
      therapistId: slot.therapist_id,
      date: slot.date,
      therapistName: slot.therapist_name,
      serviceName: service.name,
    });
  }, [navigation, service]);

  const onPressBook = useCallback(() => {
    if (!service?.id) return;
    navigation.navigate('SelectTherapist', { serviceId: service.id });
  }, [navigation, service]);

  if (loading) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ height: 180, backgroundColor: '#f2f2f2', borderRadius: 12 }} />
        <View style={{ height: 16, backgroundColor: '#eee', marginTop: 12, borderRadius: 8, width: '60%' }} />
        <View style={{ height: 12, backgroundColor: '#eee', marginTop: 8, borderRadius: 8, width: '40%' }} />
        <View style={{ height: 80, backgroundColor: '#f5f5f5', marginTop: 16, borderRadius: 12 }} />
      </View>
    );
  }

  if (!service) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ marginBottom: 12 }}>{error ?? 'Service not found'}</Text>
        <Pressable onPress={load} style={({ pressed }) => ({ padding: 12, backgroundColor: '#eee', borderRadius: 8, opacity: pressed ? 0.9 : 1 })}>
          <Text>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/** onlineAllowed used for clarity; set from service.is_online_allowed */}
      {/** eslint-disable-next-line @typescript-eslint/no-unused-vars */}
      {(() => { const onlineAllowed = !!service?.is_online_allowed; return null; })()}
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} style={{ flex: 1 }}>
        {/* (A) Header */}
        <View style={{ padding: 16 }}>
          {service.image_url ? (
            <Image source={{ uri: service.image_url }} style={{ width: '100%', height: 200, borderRadius: 12, backgroundColor: '#eee' }} />
          ) : (
            <View style={{ width: '100%', height: 200, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
              <Text>No Image</Text>
            </View>
          )}
          {!!service.category && (
            <Text style={{ marginTop: 12, color: '#1e64d4', fontWeight: '700' }}>{service.category}</Text>
          )}
          <Text numberOfLines={2} style={{ fontSize: 20, fontWeight: '800', marginTop: 4 }}>{service.name}</Text>
          <View style={{ marginTop: 6 }}>
            <PriceTag price={service.base_price} durationMinutes={service.duration_minutes} />
          </View>
          {!!service.is_online_allowed && (
            <View style={{ alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#e6f2ff', borderRadius: 12 }}>
              <Text style={{ color: '#1e64d4', fontWeight: '600', fontSize: 12 }}>Online consult available</Text>
            </View>
          )}

          {!!service.description && (
            <View style={{ marginTop: 12 }}>
              <Text numberOfLines={descExpanded ? undefined : 4}>{service.description}</Text>
              {service.description.length > 120 && (
                <Pressable onPress={() => setDescExpanded((v) => !v)} style={({ pressed }) => ({ marginTop: 6, opacity: pressed ? 0.85 : 1 })}>
                  <Text style={{ color: '#1e64d4', fontWeight: '600' }}>{descExpanded ? 'Read less' : 'Read more'}</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* (B) Next 3 available slots */}
        <View style={{ paddingHorizontal: 16 }}>
          <NextSlotsRow slots={nextSlots} onPressSlot={onPressSlot} />
        </View>
      </ScrollView>

      {/* Sticky footer booking bar */}
      <StickyBookingBar
        price={service.base_price}
        durationMinutes={service.duration_minutes}
        onPressCta={onPressBook}
      />
    </View>
  );
}
