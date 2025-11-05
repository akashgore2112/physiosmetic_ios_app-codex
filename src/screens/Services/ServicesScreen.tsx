import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { getAllActiveServices } from '../../services/serviceCatalogService';
import type { Service } from '../../types/Service';
import { formatPrice } from '../../utils/formatPrice';
import { useToast } from '../../components/feedback/useToast';
import ServiceCard from '../../components/ServiceCard';

export default function ServicesScreen({ navigation }: any): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const { show } = useToast();
  const route = useRoute<any>();
  const [highlight, setHighlight] = useState<string | null>(null);
  const sectionY = useRef<Record<string, number>>({});
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getAllActiveServices();
        if (!cancelled) setServices(s);
      } catch (e: any) {
        show(e?.message ?? 'Failed to load services');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Handle highlightCategory param on entry
  useEffect(() => {
    const cat = route?.params?.highlightCategory as string | undefined;
    if (cat) {
      setHighlight(cat);
      setTimeout(() => {
        const y = sectionY.current[cat];
        if (y != null && scrollRef.current) scrollRef.current.scrollTo({ y, animated: true });
      }, 100);
    }
  }, [route?.params?.highlightCategory]);

  // Clear highlight when revisiting without param
  useFocusEffect(
    React.useCallback(() => {
      if (!route?.params?.highlightCategory) setHighlight(null);
    }, [route?.params?.highlightCategory])
  );

  const byCategory = useMemo(() => {
    const map: Record<string, Service[]> = {};
    for (const s of services) {
      const key = s.category || 'Other';
      (map[key] ||= []).push(s);
    }
    return map;
  }, [services]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const cats = Object.keys(byCategory);

  return (
    <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
      {cats.map((cat) => (
        <View key={cat} onLayout={(e) => { sectionY.current[cat] = e.nativeEvent.layout.y; }}>
          <Text style={{ fontSize: 18, fontWeight: '800', marginTop: 8, marginBottom: 8 }}>{cat}</Text>
          <View style={{ backgroundColor: highlight === cat ? '#fff6ef' : '#fff', borderRadius: 12, borderWidth: highlight === cat ? 2 : 1, borderColor: highlight === cat ? '#F37021' : '#eee', padding: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                {byCategory[cat].map((s) => (
                  <ServiceCard
                    key={s.id}
                    name={s.name}
                    category={s.category}
                    imageUrl={s.image_url}
                    onPress={() => navigation.navigate('ServiceDetail', { serviceId: s.id, serviceName: s.name })}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      ))}
      {services.length === 0 && <Text>No services</Text>}
    </ScrollView>
  );
}
