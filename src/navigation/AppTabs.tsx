import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import HomeScreen from '../screens/Home/HomeScreen';
import BookingStackNavigator, { type BookingStackParamList } from './BookingStack';
import ShopStackNavigator, { type ShopStackParamList } from './ShopStack';
import AccountStackNavigator, { type AccountStackParamList } from './AccountStack';
import { useCartStore } from '../store/useCartStore';
import { Icon } from '../components/ui';
import { useTheme } from '../theme';

export type AppTabParamList = {
  Home: undefined;
  Services: NavigatorScreenParams<BookingStackParamList>;
  Shop: NavigatorScreenParams<ShopStackParamList>;
  Account: NavigatorScreenParams<AccountStackParamList>;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppTabs(): JSX.Element {
  const cartCount = useCartStore((s) => s.count());
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.darkBg,
          borderTopColor: theme.colors.borderSecondary,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.medium,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="Home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Services"
        component={BookingStackNavigator}
        options={{
          tabBarLabel: 'Services',
          tabBarIcon: ({ color, size }) => (
            <Icon name="Calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopStackNavigator}
        options={{
          tabBarLabel: 'Shop',
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Icon name="ShoppingBag" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountStackNavigator}
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Icon name="User" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
