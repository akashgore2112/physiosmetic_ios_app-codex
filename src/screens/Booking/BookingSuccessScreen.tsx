import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { formatPrice } from '../../utils/formatPrice';

export default function BookingSuccessScreen(): JSX.Element {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { appointmentId, method, amount } = route.params || {};

  const methodLabel =
    method === 'razorpay'
      ? 'Razorpay'
      : method === 'stripe'
      ? 'Stripe'
      : method === 'pay_at_clinic'
      ? 'Pay at Clinic'
      : 'Unknown';

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      {/* Success Icon */}
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#dcfce7',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <Text style={{ fontSize: 48, color: '#16a34a' }}>✓</Text>
      </View>

      {/* Success Message */}
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>Booking Confirmed!</Text>
      <Text style={{ fontSize: 15, color: '#666', marginBottom: 24, textAlign: 'center' }}>
        Your appointment has been successfully booked.
      </Text>

      {/* Booking Details */}
      <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '100%', marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#666' }}>Appointment ID</Text>
          <Text style={{ fontWeight: '600' }}>#{appointmentId?.slice(-6) || 'N/A'}</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: '#666' }}>Payment Method</Text>
          <Text style={{ fontWeight: '600' }}>{methodLabel}</Text>
        </View>

        {amount && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#666' }}>Amount</Text>
            <Text style={{ fontWeight: '600' }}>{formatPrice(amount)}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Account', { screen: 'MyAppointments' })}
        style={{
          width: '100%',
          padding: 16,
          borderRadius: 12,
          backgroundColor: '#1e64d4',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>View My Appointments</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Services', { screen: 'ServicesMain' })}
        style={{
          width: '100%',
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#1e64d4',
          backgroundColor: '#fff',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#1e64d4', fontWeight: '700', fontSize: 16 }}>Book Another Service</Text>
      </TouchableOpacity>
    </View>
  );
}
