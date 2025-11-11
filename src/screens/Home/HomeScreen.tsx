import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Pressable, useWindowDimensions, Linking, Image, RefreshControl, ActionSheetIOS, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSessionStore } from '../../store/useSessionStore';
import { useCartStore } from '../../store/useCartStore';
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
import { useTheme } from '../../theme';
import { Button, Card, Icon, Badge, SectionHeader, Skeleton } from '../../components/ui';

export default function HomeScreen({ navigation, route }: any): JSX.Element {
  const theme = useTheme();
  const { isLoggedIn, userId } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [nextSlots, setNextSlots] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topLoading, setTopLoading] = useState<boolean>(false);
  const [topError, setTopError] = useState<boolean>(false);
  const [promos, setPromos] = useState<any[]>([]);
  const [promosLoading, setPromosLoading] = useState<boolean>(false);
  const [promosError, setPromosError] = useState<boolean>(false);
  const [dismissedBannerIds, setDismissedBannerIds] = useState<Record<string, true>>({});
  const { show } = useToast();
  const endRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const [tick, setTick] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.max(280, Math.floor(windowWidth - 32)); // fill screen minus outer padding
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  // Refs for deep link scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  const promosRef = useRef<View>(null);
  const productsRef = useRef<View>(null);
  const servicesRef = useRef<View>(null);

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
          // Use end_time to hide card only after appointment is fully over
          const [hh, mm] = (r.slot.end_time || r.slot.start_time || '00:00').split(':').map((n: string) => parseInt(n, 10));
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
    setTopError(false);
    try {
      const list = await getTopPurchasedProducts(4);
      setTopProducts(list ?? []);
      setTopError(false);
    } catch {
      setTopProducts([]);
      setTopError(true);
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
    setPromosError(false);
    try {
      const { data, error } = await supabase
        .from('promos')
        .select('id,title,subtitle,image_url,deep_link,is_active')
        .eq('is_active', true)
        .limit(20);
      if (error) {
        setPromos(CLINIC_PROMOS?.filter((p) => p.is_active !== false) || []);
        setPromosError(false); // Fallback available
      } else if (!data || data.length === 0) {
        setPromos(CLINIC_PROMOS?.filter((p) => p.is_active !== false) || []);
        setPromosError(false);
      } else {
        setPromos(data as any[]);
        setPromosError(false);
      }
    } catch {
      setPromos(CLINIC_PROMOS?.filter((p) => p.is_active !== false) || []);
      setPromosError(false); // Fallback available
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

  // Deep link support - handle highlight params
  useEffect(() => {
    const params = route?.params;
    if (!params?.highlight) return;

    const scrollToSection = () => {
      let targetRef: React.RefObject<View | null> | null = null;

      switch (params.highlight) {
        case 'promos':
        case 'offers':
          targetRef = promosRef;
          break;
        case 'products':
        case 'shop':
          targetRef = productsRef;
          break;
        case 'services':
          targetRef = servicesRef;
          break;
      }

      if (targetRef?.current && scrollViewRef.current) {
        setTimeout(() => {
          targetRef.current?.measureLayout(
            // @ts-ignore - measureLayout exists
            scrollViewRef.current?.getInnerViewNode(),
            (x: number, y: number) => {
              scrollViewRef.current?.scrollTo({ y: y - 60, animated: true });
            },
            () => {}
          );
        }, 300);
      }

      // Clear param to prevent re-scroll on re-renders
      navigation.setParams({ highlight: undefined });
    };

    scrollToSection();
  }, [route?.params, navigation]);

  // Cancel handler removed; upcoming card links to Appointment Detail

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: theme.colors.darkBg }}>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.base, paddingBottom: theme.spacing.base }}
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
        <Text style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary }}>Physiosmetic</Text>
      </Pressable>

      {/* Hero - Interactive with CTAs */}
      <Card
        variant="glass"
        style={{ marginTop: theme.spacing.md }}
        padding="base"
        accessibilityLabel="Physiosmetic clinic information and quick actions"
      >
        <Text style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary }}>Mumbai's First Holistic & Sports Studio</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs }}>
          <Icon name="Clock" size={16} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, marginLeft: theme.spacing.xs, fontSize: theme.typography.fontSize.sm }}>Hours: 10:00 am – 07:00 pm</Text>
        </View>

        {/* Primary CTAs */}
        <View style={{ flexDirection: 'row', marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
          <Button
            variant="primary"
            size="md"
            onPress={() => {
              if (!isLoggedIn) {
                useSessionStore.getState().setPostLoginIntent({
                  action: 'navigate_services',
                  params: {}
                });
                show({ message: 'Please sign in to book appointments', type: 'info' });
                navigation.navigate('Account', { screen: 'SignIn' });
                return;
              }
              navigation.navigate('Services', { screen: 'ServicesMain' });
            }}
            accessibilityLabel="Book physiotherapy appointment"
            accessibilityHint={isLoggedIn ? "Opens services list to book an appointment" : "Requires sign in to book"}
            style={{ flex: 1 }}
          >
            Book Physiotherapy
          </Button>
          <Button
            variant="secondary"
            size="md"
            onPress={() => navigation.navigate('Shop')}
            accessibilityLabel="Shop deals and products"
            accessibilityHint="Opens product shop"
            style={{ flex: 1 }}
          >
            Shop Deals
          </Button>
        </View>

        {/* Context CTA from server promo (first promo with deep_link) */}
        {promos.length > 0 && promos[0]?.deep_link && (
          <Pressable
            onPress={() => {
              const promo = promos[0];
              if (promo.deep_link) {
                Linking.openURL(promo.deep_link).catch(() => {
                  show({ message: 'Could not open promo link', type: 'error' });
                });
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`Special offer: ${promos[0].title}`}
            accessibilityHint="Opens promotional offer"
            style={({ pressed }) => ({
              marginTop: theme.spacing.sm,
              backgroundColor: theme.colors.warning + '20',
              paddingHorizontal: theme.spacing.base,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radius.md,
              opacity: pressed ? 0.9 : 1,
              minHeight: theme.accessibility.minTapTarget,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: theme.colors.warning
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="Star" size={16} color={theme.colors.warning} style={{ marginRight: theme.spacing.xs }} />
              <Text style={{ color: theme.colors.warning, fontWeight: theme.typography.fontWeight.bold, fontSize: theme.typography.fontSize.sm }}>
                {promos[0].title}
              </Text>
            </View>
          </Pressable>
        )}

        {/* Contact options */}
        <View style={{ flexDirection: 'row', marginTop: theme.spacing.md, flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Pressable
            onPress={() => Linking.openURL('https://maps.app.goo.gl/ftuctsKC5w3c5x957')}
            accessibilityRole="button"
            accessibilityLabel="Open location in Google Maps"
            accessibilityHint="Opens clinic location in maps app"
            style={({ pressed }) => ({
              backgroundColor: theme.colors.success + '20',
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radius.md,
              opacity: pressed ? 0.9 : 1,
              minHeight: theme.accessibility.minTapTarget,
              justifyContent: 'center',
              flexDirection: 'row',
              alignItems: 'center'
            })}
          >
            <Icon name="MapPin" size={16} color={theme.colors.success} style={{ marginRight: theme.spacing.xs }} />
            <Text style={{ color: theme.colors.success, fontWeight: theme.typography.fontWeight.bold }}>Maps</Text>
          </Pressable>
          {!!CLINIC_CALL_PHONE_E164 && (
            <Pressable
              onPress={() => Linking.openURL(`tel:${CLINIC_CALL_PHONE_E164}`)}
              accessibilityRole="button"
              accessibilityLabel="Call clinic"
              accessibilityHint="Opens phone dialer to call clinic"
              style={({ pressed }) => ({
                backgroundColor: theme.colors.info + '20',
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.9 : 1,
                minHeight: theme.accessibility.minTapTarget,
                justifyContent: 'center',
                flexDirection: 'row',
                alignItems: 'center'
              })}
            >
              <Icon name="Phone" size={16} color={theme.colors.info} style={{ marginRight: theme.spacing.xs }} />
              <Text style={{ color: theme.colors.info, fontWeight: theme.typography.fontWeight.bold }}>Call</Text>
            </Pressable>
          )}
          {(() => {
            const whatsappNumber = CLINIC_WHATSAPP_E164;
            if (!whatsappNumber) return null;
            return (
            <Pressable
              onPress={() => {
                const phone = whatsappNumber.replace(/\+/g, '');
                Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent('Hello Physiosmetic')}`);
              }}
              accessibilityRole="button"
              accessibilityLabel="Message on WhatsApp"
              accessibilityHint="Opens WhatsApp to message clinic"
              style={({ pressed }) => ({
                backgroundColor: theme.colors.secondary + '20',
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.md,
                opacity: pressed ? 0.9 : 1,
                minHeight: theme.accessibility.minTapTarget,
                justifyContent: 'center',
                flexDirection: 'row',
                alignItems: 'center'
              })}
            >
              <Icon name="MessageCircle" size={16} color={theme.colors.secondary} style={{ marginRight: theme.spacing.xs }} />
              <Text style={{ color: theme.colors.secondary, fontWeight: theme.typography.fontWeight.bold }}>WhatsApp</Text>
            </Pressable>
            );
          })()}
        </View>
      </Card>

      {/* Quick Actions */}
      <View style={{ flexDirection: 'row', marginTop: theme.spacing.base, gap: theme.spacing.md, flexWrap: 'wrap' }}>
        {[
          { label: 'Book Physio Care', category: 'Physio Care' },
          { label: 'Sports Performance Studio', category: 'Sports Performance Studio' },
          { label: 'Aesthetic Care', category: 'Skin Care' },
          { label: 'Online Consultation', category: 'Physio Care', online: true },
          { label: 'Shop Products', category: null },
        ].map((qa) => (
          <Card
            key={qa.label}
            variant="default"
            onPress={() => {
              if (qa.category) {
                // Check auth for booking services
                if (!isLoggedIn) {
                  useSessionStore.getState().setPostLoginIntent({
                    action: 'quick_action_booking',
                    params: { category: qa.category, online: qa.online, label: qa.label }
                  });
                  show({ message: 'Please sign in to book services', type: 'info' });
                  navigation.navigate('Account', { screen: 'SignIn' });
                  return;
                }

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
            accessibilityLabel={qa.category ? `Browse ${qa.label}` : 'Open Shop'}
            accessibilityHint={qa.category && !isLoggedIn ? 'Requires sign in' : undefined}
            style={{ flexBasis: '48%', minHeight: theme.accessibility.minTapTarget, justifyContent: 'center' }}
            padding="md"
          >
            <Text style={{ fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary }}>{qa.label}</Text>
            {qa.category && !isLoggedIn && (
              <Text style={{ color: theme.colors.textTertiary, fontSize: theme.typography.fontSize.xs, marginTop: theme.spacing.xs }}>Sign in required</Text>
            )}
          </Card>
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
        <View ref={promosRef} style={{ marginTop: 20 }}>
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
        <View ref={servicesRef} style={{ marginTop: 8 }}>
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
      ) : topError ? (
        <View style={{ marginTop: 20, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#fee', padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Top Products · Mostly Purchased</Text>
          <Text style={{ color: '#666', marginBottom: 12 }}>Failed to load products. Check your connection and try again.</Text>
          <Pressable
            onPress={() => loadTopProducts()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading products"
            style={({ pressed }) => ({
              backgroundColor: '#1e64d4',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              opacity: pressed ? 0.85 : 1,
              minHeight: 44
            })}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
          </Pressable>
        </View>
      ) : (topProducts.length > 0 ? (
        <View ref={productsRef} style={{ marginTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>Top Products · Mostly Purchased</Text>
            <Pressable onPress={() => navigation.navigate('Shop')} hitSlop={8}>
              <Text style={{ color: '#1e40af', fontWeight: '700' }}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {topProducts.map((p) => {
                const isOutOfStock = p.in_stock === false;
                return (
                  <View
                    key={`tp-${p.id}`}
                    style={{ width: 140, borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff', padding: 10, marginRight: 10 }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View product ${p.name}`}
                      onPress={() => navigation.navigate('Shop', { screen: 'ProductDetail', params: { id: p.id } })}
                      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                    >
                      {!!p.image_url && (
                        <Image source={{ uri: p.image_url }} resizeMode="cover" style={{ width: '100%', height: 80, borderRadius: 8 }} />
                      )}
                      {isOutOfStock && (
                        <View style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>Out of Stock</Text>
                        </View>
                      )}
                      <Text numberOfLines={1} style={{ marginTop: 8, fontWeight: '700' }}>{p.name}</Text>
                      <Text style={{ marginTop: 4, fontWeight: '600' }}>
                        {typeof p.price === 'number' ? `₹${p.price.toFixed(0)}` : ''}
                      </Text>
                    </Pressable>
                    {!isOutOfStock && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Add ${p.name} to cart`}
                        accessibilityHint="Adds one item to shopping cart"
                        onPress={() => {
                          useCartStore.getState().addItem({
                            id: p.id,
                            line_id: p.id, // No variant
                            name: p.name,
                            price: p.price,
                            qty: 1,
                            image_url: p.image_url
                          });
                          show({ message: 'Added to cart', type: 'success' });
                        }}
                        style={({ pressed }) => ({
                          marginTop: 8,
                          backgroundColor: '#16a34a',
                          paddingVertical: 8,
                          borderRadius: 8,
                          alignItems: 'center',
                          opacity: pressed ? 0.85 : 1,
                          minHeight: 36
                        })}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add to Cart</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
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
