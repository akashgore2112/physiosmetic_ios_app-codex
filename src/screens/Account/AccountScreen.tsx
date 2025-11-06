import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSessionStore } from '../../store/useSessionStore';
import { supabase } from '../../config/supabaseClient';
import { runRlsSmoke } from '../../dev/rlsSmoke';

export default function AccountScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const { isLoggedIn, displayName, userId } = useSessionStore();
  const [showConsent, setShowConsent] = useState(false);

  // Dev-only: run a lightweight RLS smoke once when logged in
  useEffect(() => {
    let done = false;
    if (__DEV__ && isLoggedIn && userId && !done) {
      runRlsSmoke(supabase as any, userId).finally(() => { done = true; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, userId]);

  // One-time consent prompt after first login
  useEffect(() => {
    (async () => {
      if (!isLoggedIn || !userId) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const key = `consent_v1:${userId}`;
        const v = await AsyncStorage.getItem(key);
        if (!v) setShowConsent(true);
      } catch {
        // if storage not available, skip
      }
    })();
  }, [isLoggedIn, userId]);

  const Button = ({ title, onPress }: { title: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={({ pressed }) => ({ padding: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', marginBottom: 10, opacity: pressed ? 0.9 : 1 })}>
      <Text style={{ fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Modal visible={showConsent} transparent animationType="fade" onRequestClose={() => setShowConsent(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, maxWidth: 420, width: '100%' }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>Consent Required</Text>
            <Text style={{ marginTop: 10 }}>By continuing, you agree to our Terms and Privacy Policy.</Text>
            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <Pressable onPress={() => setShowConsent(false)} style={({ pressed }) => ({ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', opacity: pressed ? 0.9 : 1, marginRight: 8 })}>
                <Text>Later</Text>
              </Pressable>
              <Pressable onPress={async () => {
                try {
                  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                  await AsyncStorage.setItem(`consent_v1:${userId}`, 'true');
                } catch {}
                setShowConsent(false);
              }} style={({ pressed }) => ({ padding: 12, borderRadius: 8, backgroundColor: '#1e64d4', opacity: pressed ? 0.9 : 1 })}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>I Agree</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <Pressable onPress={() => navigation.navigate('Terms' as never)} style={({ pressed }) => ({ padding: 8, marginRight: 12, opacity: pressed ? 0.8 : 1 })}>
                <Text style={{ color: '#1e64d4' }}>View Terms</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('Privacy' as never)} style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.8 : 1 })}>
                <Text style={{ color: '#1e64d4' }}>View Privacy</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Legal</Text>
            <Button title="Terms & Conditions" onPress={() => navigation.navigate('Terms' as never)} />
            <Button title="Privacy Policy" onPress={() => navigation.navigate('Privacy' as never)} />
          </View>

          <View style={{ marginTop: 16 }}>
            <Button title="Logout" onPress={async () => { await supabase.auth.signOut(); useSessionStore.getState().clearSession(); }} />
          </View>
        </>
      )}
    </View>
  );
}
