import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AccountScreen from '../screens/Account/AccountScreen';
import MyAppointmentsScreen from '../screens/Account/MyAppointmentsScreen';
import MyProfileScreen from '../screens/Account/MyProfileScreen';
import MyOrdersScreen from '../screens/Account/MyOrdersScreen';
import MyAddressesScreen from '../screens/Account/MyAddressesScreen';
import OrderDetailScreen from '../screens/Account/OrderDetailScreen';
import AppointmentDetailScreen from '../screens/Account/AppointmentDetailScreen';
import TermsScreen from '../screens/Legal/TermsScreen';
import PrivacyScreen from '../screens/Legal/PrivacyScreen';
import SignInScreen from '../screens/Auth/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';

export type AccountStackParamList = {
  AccountMain: undefined;
  SignIn: undefined;
  SignUp: undefined;
  MyAppointments: undefined;
  AppointmentDetail: { id: string };
  MyProfile: undefined;
  MyOrders: undefined;
  MyAddresses: undefined;
  OrderDetail: { id: string } | undefined;
  Terms: undefined;
  Privacy: undefined;
};

const Stack = createNativeStackNavigator<AccountStackParamList>();

export default function AccountStackNavigator(): JSX.Element {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AccountMain" component={AccountScreen} options={{ title: 'Account' }} />
      <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign In' }} />
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Create Account' }} />
      <Stack.Screen name="MyAppointments" component={MyAppointmentsScreen} options={{ title: 'My Appointments' }} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} options={{ title: 'Appointment Detail' }} />
      <Stack.Screen name="MyProfile" component={MyProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} options={{ title: 'My Orders' }} />
      <Stack.Screen name="MyAddresses" component={MyAddressesScreen} options={{ title: 'My Addresses' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Order Detail' }} />
      <Stack.Screen name="Terms" component={TermsScreen} options={{ title: 'Terms & Conditions' }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy Policy' }} />
    </Stack.Navigator>
  );
}
