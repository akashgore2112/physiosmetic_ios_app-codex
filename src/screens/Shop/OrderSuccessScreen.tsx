import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function OrderSuccessScreen(): JSX.Element {
  const navigation = useNavigation();
  return (
    <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <Text style={{ fontSize: 24, marginBottom: 12 }}>✓</Text>
      <Text style={{ fontSize: 18, marginBottom: 16 }}>Order placed!</Text>
      <TouchableOpacity onPress={() => (navigation as any).navigate('Account', { screen: 'MyOrders' })} style={{ padding: 12, backgroundColor: '#222', marginBottom: 8, width: '80%' }}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>View My Orders</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => (navigation as any).navigate('Shop', { screen: 'ProductsList' })} style={{ padding: 12, borderWidth: 1, borderColor: '#ccc', width: '80%' }}>
        <Text style={{ textAlign: 'center' }}>Continue Shopping</Text>
      </TouchableOpacity>
    </View>
  );
}

