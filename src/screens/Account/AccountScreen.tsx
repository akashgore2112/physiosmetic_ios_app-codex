import React, { useEffect } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSessionStore } from '../../store/useSessionStore';
import { supabase } from '../../config/supabaseClient';
import { runRlsSmoke } from '../../dev/rlsSmoke';

export default function AccountScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const { isLoggedIn, displayName, userId } = useSessionStore();

  // Dev-only: run a lightweight RLS smoke once when logged in
  useEffect(() => {
    let done = false;
    if (__DEV__ && isLoggedIn && userId && !done) {
      runRlsSmoke(supabase as any, userId).finally(() => { done = true; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, userId]);

  const Button = ({ title, onPress }: { title: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={({ pressed }) => ({ padding: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', marginBottom: 10, opacity: pressed ? 0.9 : 1 })}>
      <Text style={{ fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '800' }}>Account</Text>
      <Text style={{ marginTop: 4, color: '#666' }}>{isLoggedIn ? `Hi, ${displayName ?? 'there'}` : 'Please sign in to manage your account'}</Text>

      {!isLoggedIn ? (
        <View style={{ marginTop: 16 }}>
          <Button title="Sign In" onPress={() => navigation.navigate('SignIn')} />
          <Button title="Create Account" onPress={() => navigation.navigate('SignUp')} />
        </View>
      ) : (
        <>
          <View style={{ marginTop: 16 }}>
            <Button title="My Profile" onPress={() => navigation.navigate('MyProfile')} />
            <Button title="My Appointments" onPress={() => navigation.navigate('MyAppointments')} />
            <Button title="My Orders" onPress={() => navigation.navigate('MyOrders')} />
          </View>

          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Contact & Support</Text>
            <Button title="WhatsApp Clinic" onPress={() => Linking.openURL('https://wa.me/919999999999?text=Hi%20Physiosmetic')} />
            <Button title="Call Clinic" onPress={() => Linking.openURL('tel:+919999999999')} />
            <Button title="Directions" onPress={() => Linking.openURL('https://maps.google.com/?q=Physiosmetic')} />
          </View>

          <View style={{ marginTop: 16 }}>
            <Button title="Logout" onPress={async () => { await supabase.auth.signOut(); useSessionStore.getState().clearSession(); }} />
          </View>
        </>
      )}
    </View>
  );
}
