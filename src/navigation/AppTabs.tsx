import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/Home/HomeScreen';
import BookingStackNavigator from './BookingStack';
import ShopStackNavigator from './ShopStack';
import AccountStackNavigator from './AccountStack';
import { useCartStore } from '../store/useCartStore';

export type AppTabParamList = {
  Home: undefined;
  Services: undefined;
  Shop: undefined;
  Account: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppTabs(): JSX.Element {
  const cartCount = useCartStore((s) => s.count());
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Services" component={BookingStackNavigator} options={{ tabBarLabel: 'Services' }} />
      <Tab.Screen name="Shop" component={ShopStackNavigator} options={{ tabBarLabel: 'Shop', tabBarBadge: cartCount > 0 ? cartCount : undefined }} />
      <Tab.Screen name="Account" component={AccountStackNavigator} options={{ tabBarLabel: 'Account' }} />
    </Tab.Navigator>
  );
}
