import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../config/supabaseClient';
import { fetchProfile, updateProfile } from '../../services/profileService';
import { useSessionStore } from '../../store/useSessionStore';
import { onlyDigits, normalizeToE164 } from '../../utils/phone';
import CountryCodePicker from '../../components/CountryCodePicker';

export default function MyProfileScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  // --- HOOKS: TOP-LEVEL (do not move below) ---
  const userId = useSessionStore((s) => s.userId);
  const profile = useSessionStore((s) => s.profile);
  const setProfile = useSessionStore((s) => s.setProfile);
  const [email, setEmail] = useState<string>(profile?.email ?? '');
  const [fullName, setFullName] = useState<string>(profile?.full_name ?? '');
  const [phone, setPhone] = useState<string>(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  // --- END HOOKS ---
  const [countryCode, setCountryCode] = useState('+91');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Derived guards
  const isGuest = !userId;
  const canSave = fullName.trim().length > 0;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const authUser = data.user;
      setEmail(authUser?.email ?? '');
      if (!userId) {
        setLoading(false);
        return;
      }
      const prof = await fetchProfile(userId);
      if (mounted && prof) {
        setFullName(prof.full_name ?? '');
        const e164 = prof.phone ?? '';
        if (e164.startsWith('+')) {
          const dial = e164.match(/^\+\d{1,3}/)?.[0] ?? '+91';
          setCountryCode(dial);
          setPhone(onlyDigits(e164.replace(dial, '')));
        }
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const onSave = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    let phoneE164: string | null = null;
    const hasDigits = onlyDigits(phone).length > 0;
    if (hasDigits) {
      const res = normalizeToE164(`${countryCode}${phone}`);
      if (!res) {
        setPhoneError('Enter a valid phone number');
        setSaving(false);
        return;
      }
      phoneE164 = res;
    }
    setPhoneError(null);
    const res = await updateProfile(userId, { full_name: fullName || null, phone: phoneE164 });
    setSaving(false);
    if (!res.ok) {
      setError('Failed to save changes');
      return;
    }
    const { data } = await supabase.auth.getUser();
    setProfile(res.profile as any, { email: data.user?.email ?? null, user_metadata: data.user?.user_metadata as any });
    Alert.alert('Profile updated');
  }, [userId, countryCode, phone, fullName, setProfile]);

  if (loading) {
    return (
      <View style={{ padding: 16 }}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 18, marginBottom: 12 }}>My Profile</Text>
        <Text>Email (read-only)</Text>
        <Text style={{ marginBottom: 12 }}>{email}</Text>
        <Text>Full Name</Text>
        <TextInput
        ref={nameRef}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Full Name"
          returnKeyType="next"
          blurOnSubmit={false}
          onSubmitEditing={() => phoneRef.current?.focus()}
          style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12 }}
        />
        <Text>Phone</Text>
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <CountryCodePicker value={countryCode} onChange={setCountryCode} />
          <TextInput
          ref={phoneRef}
            value={phone}
            onChangeText={(t) => setPhone(onlyDigits(t))}
            keyboardType="phone-pad"
            placeholder="Phone number"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={onSave}
            style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 8 }}
          />
        </View>
        {phoneError && <Text style={{ color: 'crimson', marginBottom: 8 }}>{phoneError}</Text>}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save profile" onPress={onSave} disabled={saving || !canSave} style={{ padding: 12, minHeight: 44, justifyContent: 'center', backgroundColor: '#222', borderRadius: 8, opacity: saving || !canSave ? 0.6 : 1 }}>
          <Text style={{ color: '#fff', textAlign: 'center' }}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
        {error && <Text style={{ color: 'crimson', marginTop: 8 }}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
