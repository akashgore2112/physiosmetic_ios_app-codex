import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '800' }}>Create Account</Text>
      <TextInput
        ref={nameRef}
        value={fullName}
        onChangeText={setFullName}
        placeholder="Full Name (optional)"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => emailRef.current?.focus()}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 16, borderRadius: 8 }}
      />
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
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 10, marginTop: 10, borderRadius: 8 }}
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
      <Pressable accessibilityRole="button" accessibilityLabel="Create account" onPress={onSubmit} disabled={loading} style={({ pressed }) => ({ padding: 14, minHeight: 44, justifyContent: 'center', backgroundColor: '#1e64d4', borderRadius: 10, marginTop: 16, opacity: pressed || loading ? 0.85 : 1 })}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{loading ? 'Creating…' : 'Create Account'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Sign in" onPress={() => navigation.navigate('SignIn')} style={({ pressed }) => ({ padding: 10, minHeight: 44, justifyContent: 'center', marginTop: 12, opacity: pressed ? 0.85 : 1 })}>
        <Text style={{ textAlign: 'center' }}>Already have an account? Sign in</Text>
      </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
