import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '800' }}>Sign In</Text>
      <TextInput
        ref={emailRef}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => passwordRef.current?.focus()}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 16, borderRadius: 8 }}
      />
      <TextInput
        ref={passwordRef}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={onSubmit}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 10, borderRadius: 8 }}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Sign in" onPress={onSubmit} disabled={loading} style={({ pressed }) => ({ padding: 14, minHeight: 44, justifyContent: 'center', backgroundColor: '#1e64d4', borderRadius: 10, marginTop: 16, opacity: pressed || loading ? 0.85 : 1 })}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{loading ? 'Signing in…' : 'Sign In'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Create account" onPress={() => navigation.navigate('SignUp')} style={({ pressed }) => ({ padding: 10, minHeight: 44, justifyContent: 'center', marginTop: 12, opacity: pressed ? 0.85 : 1 })}>
        <Text style={{ textAlign: 'center' }}>Don’t have an account? Create one</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
