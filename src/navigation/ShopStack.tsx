import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ShopScreen from '../screens/Shop/ShopScreen';
import ProductDetailScreen from '../screens/Shop/ProductDetailScreen';
import CartScreen from '../screens/Shop/CartScreen';
import OrderSuccessScreen from '../screens/Shop/OrderSuccessScreen';
import { Pressable, Text } from 'react-native';
import { useCartStore } from '../store/useCartStore';

export type ShopStackParamList = {
  ProductsList: undefined;
  ProductDetail: { id: string } | undefined;
  Cart: undefined;
  OrderSuccess: undefined;
};

const Stack = createNativeStackNavigator<ShopStackParamList>();

export default function ShopStackNavigator(): JSX.Element {
  const count = useCartStore((s) => s.count());
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerRight: () => (
          <Pressable onPress={() => navigation.navigate('Cart')} hitSlop={10}>
            <Text>🛒{count > 0 ? ` ${count}` : ''}</Text>
          </Pressable>
        ),
      })}
    >
      <Stack.Screen name="ProductsList" component={ShopScreen} options={{ title: 'Products' }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Cart' }} />
      <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ title: 'Success' }} />
    </Stack.Navigator>
  );
}
