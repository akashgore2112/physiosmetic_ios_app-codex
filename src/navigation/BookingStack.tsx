import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ServicesScreen from '../screens/Services/ServicesScreen';
import ServiceDetailScreen from '../screens/Services/ServiceDetailScreen';
import SelectTherapistScreen from '../screens/Booking/SelectTherapistScreen';
import SelectDateScreen from '../screens/Booking/SelectDateScreen';
import SelectTimeSlotScreen from '../screens/Booking/SelectTimeSlotScreen';
import BookingFlowScreen from '../screens/Booking/BookingFlowScreen';
import ConfirmBookingScreen from '../screens/Booking/ConfirmBookingScreen';

export type BookingStackParamList = {
  ServicesMain: undefined;
  ServiceDetail: { serviceName?: string; serviceId?: string };
  SelectTherapist: { serviceName: string; serviceId: string; isOnline?: boolean };
  SelectDate: { serviceName: string; serviceId: string; therapistId: string; therapistName: string; appointmentId?: string; oldSlotId?: string; isOnline?: boolean };
  SelectTimeSlot: { serviceName: string; serviceId: string; therapistId: string; therapistName: string; date: string; appointmentId?: string; oldSlotId?: string; isOnline?: boolean };
  BookingFlow: {
    serviceName: string;
    serviceId: string;
    therapistId: string;
    therapistName: string;
    date: string;
    slotId: string;
    slotStart: string;
    appointmentId?: string;
    oldSlotId?: string;
    isOnline?: boolean;
  };
};

const Stack = createNativeStackNavigator<BookingStackParamList>();

export default function BookingStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ServicesMain" component={ServicesScreen} options={{ title: 'Services' }} />
      <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ title: 'Service Details' }} />
      <Stack.Screen name="SelectTherapist" component={SelectTherapistScreen} options={{ title: 'Select Therapist' }} />
      <Stack.Screen name="SelectDate" component={SelectDateScreen} options={{ title: 'Select Date' }} />
      <Stack.Screen name="SelectTimeSlot" component={SelectTimeSlotScreen} options={{ title: 'Select Time Slot' }} />
      <Stack.Screen name="BookingFlow" component={BookingFlowScreen} options={{ title: 'Confirm Booking' }} />
      {/* Alternate confirm screen route as per contract */}
      <Stack.Screen name="ConfirmBooking" component={ConfirmBookingScreen as any} options={{ title: 'Confirm' }} />
    </Stack.Navigator>
  );
}
