import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSessionStore } from '../../store/useSessionStore';
import { getNextAppointmentForUser, getUpcomingAppointmentsForUser, getNextAvailableSlots } from '../../services/bookingService';
import { supabase } from '../../config/supabaseClient';
import { getAllActiveServices } from '../../services/serviceCatalogService';
import { useToast } from '../../components/feedback/useToast';
import { toastError } from '../../utils/toast';
import { formatDate, formatTime } from '../../utils/formatDate';
import { isPastSlot } from '../../utils/clinicTime';
import ServiceCard from '../../components/ServiceCard';

export default function HomeScreen({ navigation }: any): JSX.Element {
  const { isLoggedIn, userId } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [nextAppt, setNextAppt] = useState<any | null>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [nextSlots, setNextSlots] = useState<any[]>([]);
  const { show } = useToast();

  const refresh = useCallback(async () => {
    if (!userId) return setNextAppt(null);
    setLoading(true);
    try {
      console.debug('[home][next-appt] session-ok, querying for user:', userId);
      const appt = await getNextAppointmentForUser(userId);
      if (appt) console.debug('[home][next-appt] appt-found', appt.id, appt.availability_slots?.date, appt.availability_slots?.start_time);
      else console.debug('[home][next-appt] appt-none');
      setNextAppt(appt as any);
      const list = await getUpcomingAppointmentsForUser(userId, 10);
      setUpcoming(list as any[]);
    } catch (e: any) {
      console.debug('[home][next-appt] query-error (silent):', e?.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Realtime: reflect appointment changes immediately
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`home_next_appt_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `user_id=eq.${userId}` }, () => {
        refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getAllActiveServices();
        if (!cancelled) setServices(s.slice(0, 6));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getNextAvailableSlots(3);
        const future = (list || []).filter((s: any) => !isPastSlot(s.date, s.start_time));
        if (!cancelled) setNextSlots(future);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const onCancel = async () => {
    if (!nextAppt?.id) return;
    try {
      await cancelAppointment(nextAppt.id);
      show('Appointment cancelled');
      refresh();
    } catch (e: any) {
      show(e?.message ?? 'Cancel failed');
    }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {/* Header */}
      <Text style={{ fontSize: 22, fontWeight: '800' }}>Physiosmetic</Text>
      <Text style={{ color: '#666', marginTop: 4 }}>Hours: 10:00–19:00 · Mumbai</Text>

      {/* Quick Actions */}
      <View style={{ flexDirection: 'row', marginTop: 16, gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Book Physio Care', category: 'Physio Care' },
          { label: 'Sports Performance Studio', category: 'Sports Performance Studio' },
          { label: 'Aesthetic Care', category: 'Skin Care' },
          { label: 'Online Consultation', category: 'Physio Care', online: true },
          { label: 'Shop Products', category: null },
        ].map((qa) => (
          <Pressable
            key={qa.label}
            onPress={() => {
              if (qa.category) {
                navigation.navigate('Services', { screen: 'ServicesMain', params: { highlightCategory: qa.category } });
              } else {
                navigation.navigate('Shop');
              }
            }}
            style={({ pressed }) => ({ flexBasis: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 14, opacity: pressed ? 0.85 : 1 })}
          >
            <Text style={{ fontWeight: '700' }}>{qa.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Your Next Appointment (compact, tappable) */}
      <View style={{ marginTop: 20 }}>
        {loading ? null : ((!!userId) && upcoming.length > 0 ? (
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Your Upcoming Appointments ({upcoming.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                {upcoming.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => navigation.navigate('Account', { screen: 'MyAppointments', params: { highlightId: item.id } })}
                    style={({ pressed }) => ({ backgroundColor: '#fff', borderRadius: 12, padding: 12, marginRight: 10, width: 220, opacity: pressed ? 0.9 : 1 })}
                  >
                    <Text numberOfLines={1} style={{ fontWeight: '600' }}>{item.services?.name || 'Service'} • {item.therapists?.name || 'Therapist'}</Text>
                    <Text style={{ marginTop: 4 }}>{formatDate(item.availability_slots.date)} • {formatTime(item.availability_slots.start_time)}</Text>
                    <View style={{ marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: '#e6f7ee' }}>
                      <Text style={{ color: '#2e7d32', fontWeight: '600' }}>{item.status}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null)}
      </View>

      {/* Featured Services */}
      {services.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Featured Services</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {services.slice(0, 6).map((s) => (
                <ServiceCard key={s.id} name={s.name} category={s.category} imageUrl={s.image_url} onPress={() => navigation.navigate('Services', { screen: 'ServiceDetail', params: { serviceId: s.id, serviceName: s.name } })} />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Next Available Slots */}
      {nextSlots.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Next Available Slots</Text>
          {nextSlots.map((slot) => (
            <Pressable
              key={slot.id}
              onPress={() => navigation.navigate('Services', { screen: 'SelectTimeSlot', params: { serviceId: slot.service_id, serviceName: slot.service?.name, therapistId: slot.therapist_id, therapistName: slot.therapist?.name, date: slot.date } })}
              style={({ pressed }) => ({ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, opacity: pressed ? 0.9 : 1 })}
            >
              <Text style={{ fontWeight: '600' }}>{slot.service?.name} • {slot.therapist?.name}</Text>
              <Text style={{ color: '#666', marginTop: 4 }}>{formatDate(slot.date)} • {formatTime(slot.start_time)}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
