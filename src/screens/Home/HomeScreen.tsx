import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Pressable, useWindowDimensions, Linking, Image, RefreshControl, ActionSheetIOS, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSessionStore } from '../../store/useSessionStore';
import { getMyUpcomingAppointments, getNextAvailableSlots } from '../../services/bookingService';
import { supabase } from '../../config/supabaseClient';
import { getAllActiveServices } from '../../services/serviceCatalogService';
import { getTopPurchasedProducts } from '../../services/productService';
import { useToast } from '../../components/feedback/useToast';
import { toastError } from '../../utils/toast';
import { formatDate, formatTime, formatRelativeToNow } from '../../utils/formatDate';
import { isPastSlot } from '../../utils/clinicTime';
import ServiceCard from '../../components/ServiceCard';
import { showReleaseChecklist } from '../../dev/releaseChecklist';
import { CLINIC_CALL_PHONE_E164, CLINIC_WHATSAPP_E164, CLINIC_PROMOS } from '../../config/clinicConstants';
import OfflineBanner from '../../components/feedback/OfflineBanner';
import useNetworkStore from '../../store/useNetworkStore';

export default function HomeScreen({ navigation }: any): JSX.Element {
  const { isLoggedIn, userId } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [nextSlots, setNextSlots] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topLoading, setTopLoading] = useState<boolean>(false);
  const [promos, setPromos] = useState<any[]>([]);
  const [promosLoading, setPromosLoading] = useState<boolean>(false);
  const [dismissedBannerIds, setDismissedBannerIds] = useState<Record<string, true>>({});
  const { show } = useToast();
  const endRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const [tick, setTick] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.max(280, Math.floor(windowWidth - 32)); // fill screen minus outer padding
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const refresh = useCallback(async () => {
    if (!userId) {
      setUpcoming([]);
      return;
    }
    setLoading(true);
    try {
      const list = await getMyUpcomingAppointments(5, userId);
      setUpcoming((list ?? []) as any[]);

      // Schedule an exact refresh at the nearest end_time so the card auto-hides right on time
      if (endRefreshRef.current) { clearTimeout(endRefreshRef.current as any); endRefreshRef.current = null; }
      const now = Date.now();
      const ends = (list as any[])
        .map((r) => {
          if (!r?.slot) return null;
          const [y, m, d] = r.slot.date.split('-').map((n: string) => parseInt(n, 10));
          const [hh, mm] = (r.slot.start_time || '00:00').split(':').map((n: string) => parseInt(n, 10));
          return new Date(y, (m - 1), d, hh, mm, 1).getTime();
        })
        .filter((t: any) => typeof t === 'number' && t > now) as number[];
      if (ends.length > 0) {
        const next = Math.min(...ends);
        const delay = Math.max(1000, next - now + 1000); // +1s safety
        endRefreshRef.current = setTimeout(() => refresh(), delay) as any;
      }
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

  // Lightweight ticker to refresh countdown labels every 15s
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, []);

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

  useEffect(() => () => { if (endRefreshRef.current) clearTimeout(endRefreshRef.current as any); }, []);

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

  // Load top products by purchases
  const loadTopProducts = useCallback(async () => {
    setTopLoading(true);
    try {
      const list = await getTopPurchasedProducts(4);
      setTopProducts(list ?? []);
    } catch {
      setTopProducts([]);
    } finally {
      setTopLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadTopProducts();
    })();
    return () => { cancelled = true; };
  }, [loadTopProducts]);

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

  // Load promos: Supabase first, fallback to CLINIC_PROMOS if table missing/empty
  const loadPromos = useCallback(async () => {
    setPromosLoading(true);
    try {
      const { data, error } = await supabase
        .from('promos')
        .select('id,title,subtitle,image_url,deep_link,is_active')
        .eq('is_active', true)
        .limit(20);
      if (error) {
        setPromos(CLINIC_PROMOS?.filter((p) => p.is_active !== false) || []);
      } else if (!data || data.length === 0) {
        setPromos(CLINIC_PROMOS?.filter((p) => p.is_active !== false) || []);
      } else {
        setPromos(data as any[]);
      }
    } catch {
      setPromos(CLINIC_PROMOS?.filter((p) => p.is_active !== false) || []);
    } finally {
      setPromosLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadPromos();
    })();
    return () => { cancelled = true; };
  }, [loadPromos]);

  // Auto-refresh sections when back online
  useEffect(() => {
    if (isOnline) {
      refresh();
      loadPromos();
      loadTopProducts();
    }
  }, [isOnline, refresh, loadPromos, loadTopProducts]);

  // Load next available slots callback for reuse
  const loadNextAvailable = useCallback(async () => {
    try {
      const list = await getNextAvailableSlots(3);
      const future = (list || []).filter((s: any) => !isPastSlot(s.date, s.start_time));
      setNextSlots(future);
    } catch {}
  }, []);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refresh(), loadPromos(), loadTopProducts(), loadNextAvailable()]);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, loadPromos, loadTopProducts, loadNextAvailable]);

  // Cancel handler removed; upcoming card links to Appointment Detail

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
      <OfflineBanner />
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

      {/* Hero */}
      <View style={{ marginTop: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee' }}>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>Mumbai’s First Holistic & Sports Studio</Text>
        <Text style={{ color: '#444', marginTop: 4 }}>Hours: 10:00 am – 07:00 pm</Text>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <Pressable
            onPress={() => Linking.openURL('https://maps.app.goo.gl/ftuctsKC5w3c5x957')}
            style={({ pressed }) => ({ backgroundColor: '#e8f5e9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, opacity: pressed ? 0.9 : 1 })}
          >
            <Text style={{ color: '#1b5e20', fontWeight: '700' }}>Google Maps</Text>
          </Pressable>
          {!!CLINIC_CALL_PHONE_E164 && (
            <Pressable
              onPress={() => Linking.openURL(`tel:${CLINIC_CALL_PHONE_E164}`)}
              style={({ pressed }) => ({ backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginLeft: 10, opacity: pressed ? 0.9 : 1 })}
            >
              <Text style={{ color: '#1e40af', fontWeight: '700' }}>Call</Text>
            </Pressable>
          )}
          {!!CLINIC_WHATSAPP_E164 && (
            <Pressable
              onPress={() => {
                const phone = CLINIC_WHATSAPP_E164.replace(/\+/g, '');
                Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent('Hello Physiosmetic')}`);
              }}
              style={({ pressed }) => ({ backgroundColor: '#e0f2fe', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginLeft: 10, opacity: pressed ? 0.9 : 1 })}
            >
              <Text style={{ color: '#075985', fontWeight: '700' }}>WhatsApp</Text>
            </Pressable>
          )}
        </View>
      </View>

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
                (async () => {
                  try {
                    const all = await getAllActiveServices();
                    if (qa.online) {
                      const excluded = ['Sports Performance Studio', 'Physio Care'];
                      const eligible = all.filter((s: any) => !!s.is_online_allowed && !excluded.includes(s.category));
                      if (!eligible || eligible.length === 0) {
                        navigation.navigate('Services', { screen: 'ServicesMain' });
                        return;
                      }
                      if (eligible.length === 1) {
                        const svc = eligible[0];
                        navigation.navigate('Services', { screen: 'SelectTherapist', params: { serviceId: svc.id, serviceName: svc.name, isOnline: true } });
                        return;
                      }
                      const showChooser = (list: any[]) => {
                        const names = list.map((s) => s.name);
                        if (Platform.OS === 'ios' && ActionSheetIOS) {
                          ActionSheetIOS.showActionSheetWithOptions(
                            { title: 'Choose service for online consultation', options: [...names, 'Cancel'], cancelButtonIndex: names.length },
                            (idx) => {
                              if (idx != null && idx >= 0 && idx < names.length) {
                                const svc = list[idx];
                                navigation.navigate('Services', { screen: 'SelectTherapist', params: { serviceId: svc.id, serviceName: svc.name, isOnline: true } });
                              }
                            }
                          );
                        } else {
                          const max = Math.min(names.length, 6);
                          const buttons = names.slice(0, max).map((n, i) => ({ text: n, onPress: () => {
                            const svc = list[i];
                            navigation.navigate('Services', { screen: 'SelectTherapist', params: { serviceId: svc.id, serviceName: svc.name, isOnline: true } });
                          }}));
                          buttons.push({ text: 'Cancel', style: 'cancel' } as any);
                          Alert.alert('Choose service for online consultation', '', buttons);
                        }
                      };
                      showChooser(eligible);
                      return;
                    }
                    // Non-online quick actions: open a relevant service detail within the category
                    let svc = all.find((s: any) => s.category === qa.category);
                    if (svc) {
                      navigation.navigate('Services', { screen: 'ServiceDetail', params: { serviceId: svc.id, serviceName: svc.name } });
                    } else {
                      navigation.navigate('Services', { screen: 'ServicesMain', params: { highlightCategory: qa.category } });
                    }
                  } catch {
                    navigation.navigate('Services', { screen: 'ServicesMain', params: { highlightCategory: qa.category } });
                  }
                })();
              } else {
                navigation.navigate('Shop');
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={qa.category ? `Browse ${qa.label}` : 'Open Shop'}
            style={({ pressed }) => ({ flexBasis: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 14, minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}
          >
            <Text style={{ fontWeight: '700' }}>{qa.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Offers / Promos */}
      {(promosLoading || (!isOnline && promos.length === 0)) ? (
        <View style={{ marginTop: 20 }}>
          <View style={{ width: cardWidth, height: 140, backgroundColor: '#f0f0f0', borderRadius: 12, marginBottom: 12 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {[0,1,2,3].map((i) => (
              <View key={`pr-skel-${i}`} style={{ width: '48%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 10, marginBottom: 10 }}>
                <View style={{ width: '100%', height: 90, backgroundColor: '#f2f2f2', borderRadius: 8, marginBottom: 8 }} />
                <View style={{ width: '80%', height: 12, backgroundColor: '#eee', borderRadius: 6 }} />
                <View style={{ width: '60%', height: 10, backgroundColor: '#f2f2f2', borderRadius: 6, marginTop: 6 }} />
              </View>
            ))}
          </View>
        </View>
      ) : ((!promosLoading && promos.length > 0) ? (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Offers & Promos</Text>
          {/* Banner slider */}
          {promos.some((p) => p.image_url) && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row' }}>
                {promos.filter((p) => p.image_url && !dismissedBannerIds[p.id]).map((p) => (
                  <View key={`bnr-${p.id}`} style={{ marginRight: 12 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open promo ${p.title}`}
                      onPress={() => p.deep_link && Linking.openURL(p.deep_link)}
                      style={({ pressed }) => ({ width: cardWidth, height: 140, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', overflow: 'hidden', opacity: pressed ? 0.96 : 1 })}
                    >
                      <Image source={{ uri: p.image_url }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
                      <View style={{ position: 'absolute', right: 8, top: 8 }}>
                        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss banner" onPress={() => setDismissedBannerIds((m) => ({ ...m, [p.id]: true }))} style={{ backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 8, borderRadius: 10, minHeight: 44, justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontWeight: '700' }}>×</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
          {/* Grid of small promo cards */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {promos.map((p) => (
              <Pressable
                key={`grid-${p.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Open promo ${p.title}`}
                onPress={() => p.deep_link && Linking.openURL(p.deep_link)}
                style={({ pressed }) => ({ width: '48%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 10, marginBottom: 10, opacity: pressed ? 0.95 : 1, minHeight: 120 })}
              >
                {!!p.image_url && (
                  <Image source={{ uri: p.image_url }} resizeMode="cover" style={{ width: '100%', height: 90, borderRadius: 8, marginBottom: 8 }} />
                )}
                <Text numberOfLines={1} style={{ fontWeight: '700' }}>{p.title}</Text>
                {!!p.subtitle && <Text numberOfLines={2} style={{ color: '#555', marginTop: 2 }}>{p.subtitle}</Text>}
              </Pressable>
            ))}
          </View>
          {(!promosLoading && promos.length === 0) && (
            <Text style={{ color: '#666' }}>Nothing to show right now.</Text>
          )}
        </View>
      ) : null)}

      {/* Your Upcoming Appointments (guest-hidden) */}
      <View style={{ marginTop: 20 }}>
        {userId && loading && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    padding: 12,
                    marginRight: 10,
                    width: cardWidth,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#eee',
                  }}
                >
                  <View style={{ width: '70%', height: 16, backgroundColor: '#eee', borderRadius: 8 }} />
                  <View style={{ width: '40%', height: 12, backgroundColor: '#f0f0f0', borderRadius: 6, marginTop: 10 }} />
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <View style={{ width: 90, height: 22, backgroundColor: '#f2f4ff', borderRadius: 10, marginRight: 8 }} />
                    <View style={{ width: 70, height: 22, backgroundColor: '#e6f6ff', borderRadius: 10 }} />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {userId && !loading && upcoming.length > 0 && (
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
              Your Upcoming Appointments ({upcoming.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                {upcoming.map((item: any) => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open appointment ${formatDate(item.slot?.date)} at ${formatTime(item.slot?.start_time)} for ${item.service_name}`}
                    key={item.id}
                    onPress={() =>
                      navigation.navigate('Account', {
                        screen: 'AppointmentDetail',
                        params: { id: item.id },
                      })
                    }
                    style={({ pressed }) => ({
                      backgroundColor: '#fff',
                      borderRadius: 12,
                      padding: 12,
                      marginRight: 10,
                      width: cardWidth,
                      opacity: pressed ? 0.9 : 1,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: '#eee',
                    })}
                  >
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{ fontWeight: '600', maxWidth: '100%', flexShrink: 1, lineHeight: 20 }}
                    >
                      {item.service_name || 'Service'} • {item.therapist_name || 'Therapist'}
                    </Text>
                    {!!item.slot && (
                      <>
                        <Text style={{ marginTop: 4 }}>{formatDate(item.slot.date)}</Text>
                        <View style={{ flexDirection: 'row', marginTop: 4 }}>
                          <View
                            style={{
                              backgroundColor: '#eef2ff',
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 10,
                              marginRight: 8,
                            }}
                          >
                            <Text style={{ color: '#1e40af', fontWeight: '600' }}>
                              Starts {formatTime(item.slot.start_time)}
                            </Text>
                          </View>
                          <View
                            style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}
                          >
                            <Text style={{ color: '#075985', fontWeight: '600' }}>
                              {formatRelativeToNow(item.slot.date, item.slot.start_time)}
                            </Text>
                          </View>
                        </View>
                      </>
                    )}
                    <View
                      style={{
                        marginTop: 8,
                        alignSelf: 'flex-start',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 10,
                        backgroundColor: '#e6f7ee',
                      }}
                    >
                      <Text style={{ color: '#2e7d32', fontWeight: '600' }}>{item.status}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {userId && !loading && upcoming.length === 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', padding: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>No upcoming appointments yet</Text>
            <Text style={{ color: '#555', marginTop: 6 }}>
              Book your first session and we’ll show it here.
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <Pressable
                onPress={() => navigation.navigate('Services', { screen: 'ServicesMain' })}
                style={({ pressed }) => ({
                  backgroundColor: '#efefef',
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{ fontWeight: '700' }}>Book Now</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Featured Services */}
      {services.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>Featured Services</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="View all services" onPress={() => navigation.navigate('Services', { screen: 'ServicesMain' })} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: '#1e40af', fontWeight: '700' }}>View All</Text>
            </Pressable>
          </View>
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
              accessibilityRole="button"
              accessibilityLabel={`See slot on ${formatDate(slot.date)} for ${slot.service?.name}`}
              key={slot.id}
              onPress={() => navigation.navigate('Services', { screen: 'SelectTimeSlot', params: { serviceId: slot.service_id, serviceName: slot.service?.name, therapistId: slot.therapist_id, therapistName: slot.therapist?.name, date: slot.date } })}
              style={({ pressed }) => ({ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, opacity: pressed ? 0.9 : 1, minHeight: 44, justifyContent: 'center' })}
            >
              <Text style={{ fontWeight: '600' }}>{slot.service?.name} • {slot.therapist?.name}</Text>
              <Text style={{ color: '#666', marginTop: 4 }}>{formatDate(slot.date)} • {formatTime(slot.start_time)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Top Products · Mostly Purchased */}
      {topLoading || (!isOnline && topProducts.length === 0) ? (
        <View style={{ marginTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>Top Products · Mostly Purchased</Text>
            <View style={{ width: 64, height: 16 }} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {[0,1,2,3].map((i) => (
                <View key={`tp-skel-${i}`} style={{ width: 140, borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff', padding: 10, marginRight: 10 }}>
                  <View style={{ width: '100%', height: 80, backgroundColor: '#f0f0f0', borderRadius: 8 }} />
                  <View style={{ width: '80%', height: 12, backgroundColor: '#eee', borderRadius: 6, marginTop: 8 }} />
                  <View style={{ width: '40%', height: 12, backgroundColor: '#f2f2f2', borderRadius: 6, marginTop: 6 }} />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : (topProducts.length > 0 ? (
        <View style={{ marginTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>Top Products · Mostly Purchased</Text>
            <Pressable onPress={() => navigation.navigate('Shop')} hitSlop={8}>
              <Text style={{ color: '#1e40af', fontWeight: '700' }}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {topProducts.map((p) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View product ${p.name}`}
                  key={`tp-${p.id}`}
                  onPress={() => navigation.navigate('Shop', { screen: 'ProductDetail', params: { id: p.id } })}
                  style={({ pressed }) => ({ width: 140, borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff', padding: 10, marginRight: 10, opacity: pressed ? 0.95 : 1 })}
                >
                  {!!p.image_url && (
                    <Image source={{ uri: p.image_url }} resizeMode="cover" style={{ width: '100%', height: 80, borderRadius: 8 }} />
                  )}
                  <Text numberOfLines={1} style={{ marginTop: 8, fontWeight: '700' }}>{p.name}</Text>
                  <Text style={{ marginTop: 4 }}>
                    {typeof p.price === 'number' ? `₹${p.price.toFixed(0)}` : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={{ marginTop: 8 }}>
          <Text style={{ color: '#666' }}>Nothing to show right now.</Text>
        </View>
      ))}
      </ScrollView>
    </View>
  );
}
