import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, Modal, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSessionStore } from '../../store/useSessionStore';
import { supabase } from '../../config/supabaseClient';
import { runRlsSmoke } from '../../dev/rlsSmoke';
import { useTheme } from '../../theme';
import { Button, Card, Icon, Badge, SectionHeader } from '../../components/ui';

export default function AccountScreen(): JSX.Element {
  const theme = useTheme();
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.darkBg }}>
      <View style={{ flex: 1, padding: theme.spacing.base }}>
        <Modal visible={showConsent} transparent animationType="fade" onRequestClose={() => setShowConsent(false)}>
          <View style={{ flex: 1, backgroundColor: theme.colors.overlay, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.base }}>
            <Card variant="elevated" padding="base" style={{ maxWidth: 420, width: '100%' }}>
              <Text style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md }}>Consent Required</Text>
              <Text style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.base }}>By continuing, you agree to our Terms and Privacy Policy.</Text>
              <View style={{ flexDirection: 'row', marginTop: theme.spacing.base, gap: theme.spacing.sm }}>
                <Button variant="secondary" size="md" onPress={() => setShowConsent(false)}>
                  Later
                </Button>
                <Button variant="primary" size="md" onPress={async () => {
                  try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    await AsyncStorage.setItem(`consent_v1:${userId}`, 'true');
                  } catch {}
                  setShowConsent(false);
                }}>
                  I Agree
                </Button>
              </View>
              <View style={{ flexDirection: 'row', marginTop: theme.spacing.md, gap: theme.spacing.md }}>
                <Pressable onPress={() => navigation.navigate('Terms' as never)} style={({ pressed }) => ({ padding: theme.spacing.sm, opacity: pressed ? 0.8 : 1 })}>
                  <Text style={{ color: theme.colors.primary }}>View Terms</Text>
                </Pressable>
                <Pressable onPress={() => navigation.navigate('Privacy' as never)} style={({ pressed }) => ({ padding: theme.spacing.sm, opacity: pressed ? 0.8 : 1 })}>
                  <Text style={{ color: theme.colors.primary }}>View Privacy</Text>
                </Pressable>
              </View>
            </Card>
          </View>
        </Modal>

        <Text style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.xs }}>Account</Text>
        <Text style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.lg }}>
          {isLoggedIn ? `Hi, ${displayName ?? 'there'}` : 'Please sign in to manage your account'}
        </Text>

        {!isLoggedIn ? (
          <View>
            <Card variant="glass" padding="md" style={{ marginBottom: theme.spacing.md }}>
              <Button variant="primary" size="lg" fullWidth onPress={() => navigation.navigate('SignIn')}>
                Sign In
              </Button>
            </Card>
            <Card variant="glass" padding="md">
              <Button variant="secondary" size="lg" fullWidth onPress={() => navigation.navigate('SignUp')}>
                Create Account
              </Button>
            </Card>
          </View>
        ) : (
          <>
            <View style={{ marginBottom: theme.spacing.md }}>
              <SectionHeader title="My Account" style={{ marginBottom: theme.spacing.sm }} />
              <Card variant="default" onPress={() => navigation.navigate('MyProfile')} style={{ marginBottom: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }}>
                  <Icon name="User" size={20} color={theme.colors.primary} style={{ marginRight: theme.spacing.md }} />
                  <Text style={{ flex: 1, color: theme.colors.textPrimary, fontWeight: theme.typography.fontWeight.semibold }}>My Profile</Text>
                  <Icon name="ChevronRight" size={20} color={theme.colors.textTertiary} />
                </View>
              </Card>
              <Card variant="default" onPress={() => navigation.navigate('MyAppointments')} style={{ marginBottom: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }}>
                  <Icon name="Calendar" size={20} color={theme.colors.secondary} style={{ marginRight: theme.spacing.md }} />
                  <Text style={{ flex: 1, color: theme.colors.textPrimary, fontWeight: theme.typography.fontWeight.semibold }}>My Appointments</Text>
                  <Icon name="ChevronRight" size={20} color={theme.colors.textTertiary} />
                </View>
              </Card>
              <Card variant="default" onPress={() => navigation.navigate('MyOrders')} style={{ marginBottom: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }}>
                  <Icon name="ShoppingBag" size={20} color={theme.colors.success} style={{ marginRight: theme.spacing.md }} />
                  <Text style={{ flex: 1, color: theme.colors.textPrimary, fontWeight: theme.typography.fontWeight.semibold }}>My Orders</Text>
                  <Icon name="ChevronRight" size={20} color={theme.colors.textTertiary} />
                </View>
              </Card>
              <Card variant="default" onPress={() => navigation.navigate('MyAddresses')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }}>
                  <Icon name="MapPin" size={20} color={theme.colors.warning} style={{ marginRight: theme.spacing.md }} />
                  <Text style={{ flex: 1, color: theme.colors.textPrimary, fontWeight: theme.typography.fontWeight.semibold }}>My Addresses</Text>
                  <Icon name="ChevronRight" size={20} color={theme.colors.textTertiary} />
                </View>
              </Card>
            </View>

            <View style={{ marginBottom: theme.spacing.md }}>
              <SectionHeader title="Contact & Support" style={{ marginBottom: theme.spacing.sm }} />
              <Card variant="default" onPress={() => Linking.openURL('https://wa.me/919999999999?text=Hi%20Physiosmetic')} style={{ marginBottom: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }}>
                  <Icon name="MessageCircle" size={20} color={theme.colors.success} style={{ marginRight: theme.spacing.md }} />
                  <Text style={{ flex: 1, color: theme.colors.textPrimary, fontWeight: theme.typography.fontWeight.semibold }}>WhatsApp Clinic</Text>
                  <Icon name="ExternalLink" size={16} color={theme.colors.textTertiary} />
                </View>
              </Card>
              <Card variant="default" onPress={() => Linking.openURL('tel:+919999999999')} style={{ marginBottom: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }}>
                  <Icon name="Phone" size={20} color={theme.colors.info} style={{ marginRight: theme.spacing.md }} />
                  <Text style={{ flex: 1, color: theme.colors.textPrimary, fontWeight: theme.typography.fontWeight.semibold }}>Call Clinic</Text>
                  <Icon name="ExternalLink" size={16} color={theme.colors.textTertiary} />
                </View>
              </Card>
              <Card variant="default" onPress={() => Linking.openURL('https://maps.google.com/?q=Physiosmetic')}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }}>
                  <Icon name="MapPin" size={20} color={theme.colors.danger} style={{ marginRight: theme.spacing.md }} />
                  <Text style={{ flex: 1, color: theme.colors.textPrimary, fontWeight: theme.typography.fontWeight.semibold }}>Directions</Text>
                  <Icon name="ExternalLink" size={16} color={theme.colors.textTertiary} />
                </View>
              </Card>
            </View>

            <View style={{ marginBottom: theme.spacing.md }}>
              <SectionHeader title="Legal" style={{ marginBottom: theme.spacing.sm }} />
              <Card variant="default" onPress={() => navigation.navigate('Terms' as never)} style={{ marginBottom: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }}>
                  <Icon name="FileText" size={20} color={theme.colors.textSecondary} style={{ marginRight: theme.spacing.md }} />
                  <Text style={{ flex: 1, color: theme.colors.textPrimary, fontWeight: theme.typography.fontWeight.semibold }}>Terms & Conditions</Text>
                  <Icon name="ChevronRight" size={20} color={theme.colors.textTertiary} />
                </View>
              </Card>
              <Card variant="default" onPress={() => navigation.navigate('Privacy' as never)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md }}>
                  <Icon name="Shield" size={20} color={theme.colors.textSecondary} style={{ marginRight: theme.spacing.md }} />
                  <Text style={{ flex: 1, color: theme.colors.textPrimary, fontWeight: theme.typography.fontWeight.semibold }}>Privacy Policy</Text>
                  <Icon name="ChevronRight" size={20} color={theme.colors.textTertiary} />
                </View>
              </Card>
            </View>

            <Card variant="elevated" padding="md">
              <Button variant="danger" size="lg" fullWidth onPress={async () => { await supabase.auth.signOut(); useSessionStore.getState().clearSession(); }}>
                Logout
              </Button>
            </Card>
          </>
        )}
      </View>
    </ScrollView>
  );
}
