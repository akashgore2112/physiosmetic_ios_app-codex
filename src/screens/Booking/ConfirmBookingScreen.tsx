import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSessionStore } from '../../store/useSessionStore';
import { bookAppointment, rescheduleAppointment } from '../../services/bookingService';
import { useToast } from '../../components/feedback/useToast';
import { isPastSlot } from '../../utils/clinicTime';
import { startSpan } from '../../monitoring/instrumentation';
import { formatDate, formatTime } from '../../utils/formatDate';

type Params = {
  serviceId: string;
  serviceName: string;
  slot: { id: string; date: string; start_time: string; end_time: string; therapist_id: string; therapistName?: string };
};

export default function ConfirmBookingScreen({ route, navigation }: any): JSX.Element {
  const params = route?.params as Params;
  const { show } = useToast();
  const userId = useSessionStore((s) => s.userId);
  const [loading, setLoading] = useState(false);

  const canConfirm = useMemo(() => Boolean(userId && params?.slot?.id && params?.serviceId), [userId, params]);

  const onConfirm = async () => {
    const span = startSpan('booking.confirm');
    if (!canConfirm) {
      show('Please sign in to confirm');
      span.end();
      return;
    }
    // Race guard: ensure slot is still in the future
    if (params?.slot && isPastSlot(params.slot.date, params.slot.start_time)) {
      show('This slot just expired, please pick another time.');
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      if (route?.params?.appointmentId) {
        await rescheduleAppointment({
          apptId: route.params.appointmentId,
          newSlotId: params.slot.id,
          userId: userId!,
          serviceId: params.serviceId,
          therapistId: params.slot.therapist_id,
        });
        show('Appointment rescheduled');
      } else {
        await bookAppointment({
          userId: userId!,
          serviceId: params.serviceId,
          therapistId: params.slot.therapist_id,
          slotId: params.slot.id,
        });
        show('Appointment booked');
      }
      navigation.popToTop();
      navigation.navigate('Account', { screen: 'MyAppointments' });
    } catch (e: any) {
      show(e?.message ?? 'Booking failed');
    } finally {
      setLoading(false);
      span.end();
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Confirm Booking</Text>
      <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{params?.serviceName}</Text>
        <Text style={{ marginTop: 8 }}>{formatDate(params?.slot?.date)} • {formatTime(params?.slot?.start_time)} - {formatTime(params?.slot?.end_time)}</Text>
        {!!params?.slot?.therapistName && <Text style={{ marginTop: 4 }}>Therapist: {params.slot.therapistName}</Text>}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Confirm booking"
        onPress={onConfirm}
        disabled={!canConfirm || loading}
        style={{ backgroundColor: canConfirm ? '#F37021' : '#ccc', padding: 16, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Confirm</Text>}
      </TouchableOpacity>
    </View>
  );
}
