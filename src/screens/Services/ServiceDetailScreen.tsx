import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getServiceById } from '../../services/serviceCatalogService';
import { formatPrice } from '../../utils/formatPrice';
import TherapistChips from '../../components/TherapistChips';
import { getTherapistsForService } from '../../services/bookingService';

export default function ServiceDetailScreen({ route, navigation }: any): JSX.Element {
  const { serviceId, serviceName } = route.params ?? {};
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<any | null>(null);
  const [therapists, setTherapists] = useState<Array<{ id: string; name: string; speciality?: string; photo_url?: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getServiceById(serviceId);
        if (!cancelled) setService(s);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [serviceId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getTherapistsForService(serviceId);
        if (!cancelled) setTherapists(list as any);
        console.debug('[ServiceDetail] therapists', list?.length ?? 0);
      } catch {
        console.debug('[ServiceDetail] therapists fetch failed');
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
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>{service?.name ?? serviceName}</Text>
      {!!service?.base_price && <Text style={{ marginTop: 8, color: '#666' }}>{formatPrice(service.base_price)}</Text>}
      {!!service?.description && <Text style={{ marginTop: 12 }}>{service.description}</Text>}

      {/* Who treats */}
      <Text style={{ marginTop: 18, fontWeight: '700' }}>Who treats</Text>
      {therapists?.length ? (
        <TherapistChips
          therapists={therapists}
          onPressTherapist={(id: string) =>
            navigation.navigate('SelectTherapist', { serviceId: serviceId, serviceName: service?.name ?? serviceName, preselectTherapistId: id })
          }
        />
      ) : (
        <Text style={{ opacity: 0.6, marginTop: 6 }}>Our team details are being updated.</Text>
      )}

      <TouchableOpacity
        onPress={() => navigation.navigate('SelectTherapist', {
          serviceId: service?.id ?? serviceId,
          isOnline: !!service?.is_online_allowed,
          serviceName: service?.name ?? serviceName,
          category: service?.category,
        })}
        style={{ backgroundColor: '#F37021', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Book This Service</Text>
      </TouchableOpacity>

      {service?.is_online_allowed && (
        <TouchableOpacity
          onPress={() => navigation.navigate('SelectTherapist', { serviceId: serviceId, serviceName: service?.name ?? serviceName, isOnline: true })}
          style={{ backgroundColor: '#1e64d4', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Book Online Consultation</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
