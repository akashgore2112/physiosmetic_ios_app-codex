import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../config/supabaseClient';
import { fetchProfile, updateProfile } from '../../services/profileService';
import { useSessionStore } from '../../store/useSessionStore';
import { onlyDigits, normalizeToE164 } from '../../utils/phone';
import CountryCodePicker from '../../components/CountryCodePicker';

export default function MyProfileScreen(): JSX.Element {
  const userId = useSessionStore((s) => s.userId);
  const setProfile = useSessionStore((s) => s.setProfile);
  const [email, setEmail] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [countryCode, setCountryCode] = useState('+91');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

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

  const onSave = async () => {
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
    // Refresh session store profile + display name
    const { data } = await supabase.auth.getUser();
    setProfile(res.profile as any, { email: data.user?.email ?? null, user_metadata: data.user?.user_metadata as any });
    Alert.alert('Profile updated');
  };

  if (loading) {
    return (
      <View style={{ padding: 16 }}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 12 }}>My Profile</Text>
      <Text>Email (read-only)</Text>
      <Text style={{ marginBottom: 12 }}>{email}</Text>
      <Text>Full Name</Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder="Full Name"
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12 }}
      />
      <Text>Phone</Text>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        <CountryCodePicker value={countryCode} onChange={setCountryCode} />
        <TextInput
          value={phone}
          onChangeText={(t) => setPhone(onlyDigits(t))}
          keyboardType="phone-pad"
          placeholder="Phone number"
          style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', padding: 8 }}
        />
      </View>
      {phoneError && <Text style={{ color: 'crimson', marginBottom: 8 }}>{phoneError}</Text>}
      <TouchableOpacity onPress={onSave} disabled={saving} style={{ padding: 12, backgroundColor: '#222' }}>
        <Text style={{ color: '#fff', textAlign: 'center' }}>{saving ? 'Saving...' : 'Save'}</Text>
      </TouchableOpacity>
      {error && <Text style={{ color: 'crimson', marginTop: 8 }}>{error}</Text>}
    </View>
  );
}
