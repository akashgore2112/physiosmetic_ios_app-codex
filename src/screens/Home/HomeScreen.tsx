import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSessionStore } from '../../store/useSessionStore';
import { getMyUpcomingAppointments, getMyAllAppointments, getNextAvailableSlots } from '../../services/bookingService';
import { supabase } from '../../config/supabaseClient';
import { getAllActiveServices } from '../../services/serviceCatalogService';
import { useToast } from '../../components/feedback/useToast';
import { toastError } from '../../utils/toast';
import { formatDate, formatTime } from '../../utils/formatDate';
import { isPastSlot } from '../../utils/clinicTime';
import ServiceCard from '../../components/ServiceCard';
import { showReleaseChecklist } from '../../dev/releaseChecklist';

export default function HomeScreen({ navigation }: any): JSX.Element {
  const { isLoggedIn, userId } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [nextSlots, setNextSlots] = useState<any[]>([]);
  const { show } = useToast();

  const refresh = useCallback(async () => {
    if (!userId) {
      setUpcoming([]);
      return;
    }
    setLoading(true);
    try {
      let list = await getMyUpcomingAppointments(10, userId);
      if (!list || list.length === 0) {
        // Fallback: compute next upcoming from all appointments
        const all = await getMyAllAppointments();
        const future = (all as any[]).filter((r) => r.status === 'booked' && r.slot && !isPastSlot(r.slot.date, r.slot.end_time));
        // Sort by (date, start_time)
        future.sort((a, b) => {
          const ad = a.slot.date, bd = b.slot.date;
          if (ad !== bd) return ad < bd ? -1 : 1;
          const at = a.slot.start_time, bt = b.slot.start_time;
          return at < bt ? -1 : at > bt ? 1 : 0;
        });
        list = future.slice(0, 10);
      }
      setUpcoming(list as any[]);
    } catch (e: any) {
      console.debug('[home][upcoming] query-error (silent):', e?.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);
  useFocusEffect(useCallback(() => {
    refresh();
    const id = setInterval(() => refresh(), 60000);
    return () => clearInterval(id);
  }, [refresh]));

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

  // Cancel handler removed; upcoming card is a link to My Appointments

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {/* Header */}
      <Pressable
        onPress={() => {
          if (!__DEV__) return;
          // simple 3-tap within 1.2s gate
          const now = Date.now();
          // @ts-ignore attach to component instance via closure var on module scope not available; use (globalThis as any)
          const g: any = globalThis as any;
          const key = '__rls_tap__';
          const last = g[key]?.last || 0;
          const count = g[key]?.count || 0;
          const within = now - last < 1200;
          const nextCount = within ? count + 1 : 1;
          g[key] = { last: now, count: nextCount };
          if (nextCount >= 3) {
            g[key] = { last: 0, count: 0 };
            showReleaseChecklist();
          }
        }}
        hitSlop={20}
      >
        <Text style={{ fontSize: 22, fontWeight: '800' }}>Physiosmetic</Text>
      </Pressable>
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
                {upcoming.map((item: any) => (
                  <Pressable
                    key={item.id}
                    onPress={() => navigation.navigate('Account', { screen: 'MyAppointments', params: { highlightId: item.id } })}
                    style={({ pressed }) => ({ backgroundColor: '#fff', borderRadius: 12, padding: 12, marginRight: 10, width: 220, opacity: pressed ? 0.9 : 1 })}
                  >
                    <Text numberOfLines={1} style={{ fontWeight: '600' }}>{item.service_name || 'Service'} • {item.therapist_name || 'Therapist'}</Text>
                    {!!item.slot && (
                      <Text style={{ marginTop: 4 }}>{formatDate(item.slot.date)} • {formatTime(item.slot.start_time)}</Text>
                    )}
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
