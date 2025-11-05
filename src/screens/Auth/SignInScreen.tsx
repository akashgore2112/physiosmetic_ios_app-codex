import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signIn } from '../../services/authService';
import { useToast } from '../../components/feedback/useToast';

export default function SignInScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const { show } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) { show('Enter email and password'); return; }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      show('Signed in');
      navigation.navigate('AccountMain');
    } catch (e: any) {
      show(e?.message ?? 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '800' }}>Sign In</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 16, borderRadius: 8 }} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 10, borderRadius: 8 }} />
      <Pressable onPress={onSubmit} disabled={loading} style={({ pressed }) => ({ padding: 14, backgroundColor: '#1e64d4', borderRadius: 10, marginTop: 16, opacity: pressed || loading ? 0.85 : 1 })}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{loading ? 'Signing in…' : 'Sign In'}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('SignUp')} style={({ pressed }) => ({ padding: 10, marginTop: 12, opacity: pressed ? 0.85 : 1 })}>
        <Text style={{ textAlign: 'center' }}>Don’t have an account? Create one</Text>
      </Pressable>
    </View>
  );
}
