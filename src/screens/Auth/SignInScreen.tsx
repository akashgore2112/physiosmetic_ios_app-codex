import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signIn } from '../../services/authService';
import { useSessionStore } from '../../store/useSessionStore';
import { useToast } from '../../components/feedback/useToast';
import { useCartStore } from '../../store/useCartStore';
import { getProduct } from '../../services/productService';
import { getVariants } from '../../services/productCatalogService';

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
      show("You're signed in — continue booking.");
      // Handle post-login intent (e.g. continue booking)
      const intent = useSessionStore.getState().consumePostLoginIntent();
      if (intent?.action === 'book_service') {
        const { serviceId, serviceName } = intent.params || {};
        if (serviceId) {
          navigation.navigate('Services', { screen: 'SelectTherapist', params: { serviceId, serviceName: serviceName ?? 'Service' } });
          return;
        }
      }
      if (intent?.action === 'add_to_cart' || intent?.action === 'buy_now' || intent?.action === 'checkout') {
        try {
          const { productId, variantId, qty } = intent.params || {};
          if (productId) {
            const p = await getProduct(productId);
            if (p) {
              let variantLabel: string | null = null;
              let price = p.price;
              if (variantId) {
                const vars = await getVariants(productId);
                const v = (vars || []).find((vv) => vv.id === variantId);
                if (v) { variantLabel = v.label ?? null; if (typeof v.price === 'number') price = v.price; }
              }
              const add = useCartStore.getState().addItem;
              if (intent.action === 'buy_now') {
                useCartStore.getState().clearCart();
              }
              add({ id: p.id, line_id: `${p.id}${variantId ? `::${variantId}` : ''}`, variant_id: variantId ?? null, variant_label: variantLabel, name: p.name, price: price, qty: Math.max(1, Number(qty || 1)), image_url: p.image_url });
              if (intent.action === 'buy_now' || intent.action === 'checkout') {
                navigation.navigate('Shop', { screen: 'Checkout' });
                return;
              }
            }
          }
        } catch {}
        navigation.navigate('AccountMain');
        return;
      }
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
