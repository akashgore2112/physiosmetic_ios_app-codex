import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signUp } from '../../services/authService';
import { useToast } from '../../components/feedback/useToast';

export default function SignUpScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) { show('Enter email and password'); return; }
    setLoading(true);
    try {
      await signUp(email.trim(), password, { fullName: fullName || null });
      show('Account created');
      navigation.navigate('AccountMain');
    } catch (e: any) {
      show(e?.message ?? 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '800' }}>Create Account</Text>
      <TextInput value={fullName} onChangeText={setFullName} placeholder="Full Name (optional)" style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 16, borderRadius: 8 }} />
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 10, borderRadius: 8 }} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 10, borderRadius: 8 }} />
      <Pressable onPress={onSubmit} disabled={loading} style={({ pressed }) => ({ padding: 14, backgroundColor: '#1e64d4', borderRadius: 10, marginTop: 16, opacity: pressed || loading ? 0.85 : 1 })}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{loading ? 'Creating…' : 'Create Account'}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('SignIn')} style={({ pressed }) => ({ padding: 10, marginTop: 12, opacity: pressed ? 0.85 : 1 })}>
        <Text style={{ textAlign: 'center' }}>Already have an account? Sign in</Text>
      </Pressable>
    </View>
  );
}
