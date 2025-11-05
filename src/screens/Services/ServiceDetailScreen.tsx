import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getServiceById } from '../../services/serviceCatalogService';
import { formatPrice } from '../../utils/formatPrice';

export default function ServiceDetailScreen({ route, navigation }: any): JSX.Element {
  const { serviceId, serviceName } = route.params ?? {};
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState<any | null>(null);

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

      <TouchableOpacity
        onPress={() => navigation.navigate('SelectTherapist', { serviceId: serviceId, serviceName: service?.name ?? serviceName })}
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
