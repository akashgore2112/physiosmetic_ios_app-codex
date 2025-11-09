import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, ActionSheetIOS, Alert, Animated, PanResponder, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSessionStore } from '../../store/useSessionStore';
import { useCartStore } from '../../store/useCartStore';
import { formatPrice } from '../../utils/formatPrice';
import { placeOrder } from '../../services/orderService';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../services/paymentsApi';
import { createRazorpayOrderFallback } from '../../services/paymentsApiFallback';
import { getRazorpayKeyId } from '../../services/razorpay';
import RazorpayWebView, { type RazorpayOptions, type RazorpaySuccess } from '../../components/RazorpayWebView';
import { getAddresses, saveAddress, setDefaultAddress } from '../../services/profileAddressService';
import { useToast } from '../../components/feedback/useToast';
import { normalizeToE164 } from '../../utils/phone';
import { light as hapticLight } from '../../utils/haptics';
import { useMapPickerStore } from '../../store/useMapPickerStore';
import { RZP_KEY_ID } from '../../config/payments';

export default function CheckoutScreen({ navigation }: any): JSX.Element {
  const { userId, isLoggedIn } = useSessionStore();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clearCart);
  const total = useCartStore((s) => s.total());

  const [pickup, setPickup] = useState(false);
  const [forSomeoneElse, setForSomeoneElse] = useState(false);
  const [saveToBook, setSaveToBook] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Razorpay WebView state
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayOptions, setRazorpayOptions] = useState<RazorpayOptions | null>(null);
  const dialCode = '+91';
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [state, setState] = useState('');
  const [country] = useState('India');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAddrs, setSavedAddrs] = useState<any[]>([]);
  const [currentAddr, setCurrentAddr] = useState<any | null>(null);
  const [addrSheetOpen, setAddrSheetOpen] = useState(false);
  const sheetTranslateY = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const screenH = Dimensions.get('window').height;
  const snapMid = screenH * 0.45; // ~55% visible
  const snapHigh = screenH * 0.25; // ~75% visible
  const [pendingAddrId, setPendingAddrId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [placingMsg, setPlacingMsg] = useState<string | null>(null);
  const pan = React.useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_evt, gesture) => {
      const newY = Math.max(0, sheetTranslateY._value + gesture.dy);
      sheetTranslateY.setValue(newY);
    },
    onPanResponderRelease: (_evt, gesture) => {
      const to = (gesture.vy > 1 || sheetTranslateY._value > snapMid + 60) ? screenH : (sheetTranslateY._value < snapHigh ? snapHigh : snapMid);
      Animated.spring(sheetTranslateY, { toValue: to, useNativeDriver: true, bounciness: 0 }).start(() => {
        if (to === screenH) setAddrSheetOpen(false);
      });
    },
  })).current;

  // Animate sheet open with optional hint on first visit
  useEffect(() => {
    (async () => {
      if (addrSheetOpen) {
        sheetTranslateY.setValue(screenH);
        Animated.spring(sheetTranslateY, { toValue: snapMid, useNativeDriver: true, bounciness: 0 }).start(async () => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const seen = await AsyncStorage.getItem('addr_sheet_hint_v1');
            if (!seen) {
              setShowHint(true);
              setTimeout(async () => { setShowHint(false); await AsyncStorage.setItem('addr_sheet_hint_v1', '1'); }, 1600);
            }
          } catch {}
        });
        // reset pending selection to current
        setPendingAddrId(currentAddr?.id ?? null);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addrSheetOpen]);
  const { show } = useToast();

  useEffect(() => {
    (async () => {
      try {
        if (isLoggedIn && userId) {
          const addrs = await getAddresses(userId);
          setSavedAddrs(addrs || []);
          if (addrs && addrs.length > 0) {
            const def = addrs.find((a: any) => a.is_default) || addrs[0];
            applyAddress(def);
          } else {
            // No saved addresses: route user to Address Book to add one
            navigation.navigate('Account', { screen: 'MyAddresses', params: { nextAction: 'checkout' } });
          }
          // Prefill phone from profile if empty
          if (!phone) {
            const profPhone = useSessionStore.getState().profile?.phone || '';
            if (profPhone) setPhone(profPhone);
          }
        }
      } catch {}
    })();
  }, [isLoggedIn, userId]);

  // Apply selection from MapPicker when returning
  useFocusEffect(
    React.useCallback(() => {
      const picked = useMapPickerStore.getState().consumeSelection();
      if (picked) {
        if (picked.line1) setLine1(picked.line1);
        if (picked.line2) setLine2(picked.line2);
        if (picked.city) setCity(picked.city);
        if (picked.state) setState(picked.state);
        if (picked.postal_code) setPincode(picked.postal_code);
        // If structured fields missing but formatted address present, use it as line1
        if (!picked.line1 && !picked.city && picked.formatted_address) {
          setLine1(picked.formatted_address);
        }
      }
      return () => {};
    }, [])
  );

  const applyAddress = (a: any) => {
    setName(a?.name || '');
    setPhone(a?.phone || '');
    setLine1(a?.line1 || '');
    setLine2(a?.line2 || '');
    setCity(a?.city || '');
    setPincode(a?.pincode || '');
    setState(a?.state || '');
    // country locked to India
    setCurrentAddr(a || null);
  };

  // Refresh addresses/default on focus (e.g., after returning from Address Book)
  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          if (isLoggedIn && userId) {
            const addrs = await getAddresses(userId);
            if (cancelled) return;
            setSavedAddrs(addrs || []);
            if (addrs && addrs.length > 0) {
              const def = addrs.find((x: any) => x.is_default) || addrs[0];
              applyAddress(def);
            }
          }
        } catch {}
      })();
      return () => { cancelled = true; };
    }, [isLoggedIn, userId])
  );

  const validate = (): string | null => {
    if (pickup) return null;
    if (!name.trim()) return 'Name is required';
    if (!phone.trim()) return 'Phone is required';
    if (!line1.trim()) return 'Address line 1 is required';
    if (!city.trim()) return 'City is required';
    if (!pincode.trim()) return 'Pincode is required';
    if (!state.trim()) return 'State is required';
    // Stricter phone and pincode validation for India
    const e164 = normalizeToE164(phone, '91');
    if (!e164) return 'Enter a valid phone number';
    const pinOk = /^[1-9][0-9]{5}$/.test(pincode.trim());
    if (!pinOk) return 'Enter a valid 6-digit pincode';
    return null;
  };

  // Razorpay WebView callbacks
  const handleRazorpaySuccess = async (response: RazorpaySuccess) => {
    console.log('[Checkout] Razorpay payment success:', response);
    setShowRazorpay(false);
    setSaving(true);
    setPlacingMsg('Verifying payment…');
    try {
      // Verify payment
      let ok: any;
      try {
        ok = await verifyRazorpayPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
      } catch (e: any) {
        console.error('[Checkout] Payment verification failed:', e);
        setError('Payment verification failed. Please contact support.');
        setSaving(false);
        setPlacingMsg(null);
        return;
      }
      if (!ok?.ok) {
        console.error('[Checkout] Payment verification returned not ok:', ok);
        setError('Payment verification failed. Please contact support.');
        setSaving(false);
        setPlacingMsg(null);
        return;
      }
      // Place order
      setPlacingMsg('Placing order…');
      const address = pickup ? null : { name, phone, line1, line2, city, pincode, state, country };
      const res = await placeOrder(userId!, items, {
        pickup,
        address,
        payment: {
          payment_method: 'online',
          payment_status: 'paid',
          payment_gateway: 'razorpay',
          gateway_order_id: response.razorpay_order_id,
          gateway_payment_id: response.razorpay_payment_id,
        },
      });
      // Save address if needed
      if (!pickup && address && saveToBook) {
        try {
          await saveAddress(userId!, address, { setDefault: true });
        } catch (e) {
          console.error('[Checkout] Failed to save address:', e);
        }
      }
      clear();
      navigation.replace('OrderSuccess', { id: res.id, method: 'online' });
    } catch (e: any) {
      console.error('[Checkout] Order placement failed:', e);
      setError(e?.message ?? 'Failed to place order. Payment was successful. Please contact support.');
    } finally {
      setSaving(false);
      setPlacingMsg(null);
    }
  };

  const handleRazorpayError = (error: string) => {
    console.error('[Checkout] Razorpay payment error:', error);
    setShowRazorpay(false);
    setError(`Payment failed: ${error}. Please try again.`);
    setSaving(false);
    setPlacingMsg(null);
  };

  const handleRazorpayCancel = () => {
    console.log('[Checkout] Razorpay payment cancelled by user');
    setShowRazorpay(false);
    setError('Payment cancelled. Try again when ready.');
    setSaving(false);
    setPlacingMsg(null);
  };

  const onPlaceOrder = async () => {
    try { hapticLight(); } catch {}
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }
    if (!isLoggedIn || !userId) {
      const { useSessionStore } = require('../../store/useSessionStore');
      useSessionStore.getState().setPostLoginIntent({ action: 'checkout' });
      navigation.navigate('Account', { screen: 'SignIn' });
      return;
    }
    if (items.length === 0) { setError('Your cart is empty'); return; }
    setSaving(true);
    try {
      const address = pickup ? null : { name, phone, line1, line2, city, pincode, state, country };
      if (paymentMethod === 'online') {
        setPlacingMsg('Initiating payment…');
        const keyId = getRazorpayKeyId();
        if (!keyId) { setError('Payment unavailable. Try Cash on Delivery.'); return; }
        const amountPaise = Math.round(total * 100);
        const cart = items.map((it) => ({ product_id: it.id, qty: it.qty }));
        console.log('[Checkout] Payment request:', {
          total,
          amountPaise,
          cart,
          userId,
        });
        let rzp: any;
        try {
          // Using fallback for better error messages
          rzp = await createRazorpayOrderFallback({ amount_in_paise: amountPaise, currency: 'INR', user_id: userId!, cart });
        } catch (e: any) {
          const msg = e?.message || e?.error?.message || 'Payment unavailable. Try Cash on Delivery.';
          setError(msg);
          return;
        }
        // Show Razorpay WebView instead of native SDK
        console.log('[Checkout] Opening Razorpay WebView with options:', {
          key: keyId,
          amount: rzp.amount,
          currency: 'INR',
          order_id: rzp.order_id,
        });

        setRazorpayOptions({
          key: keyId,
          amount: rzp.amount,
          currency: 'INR',
          name: 'PHYSIOSMETIC',
          description: 'Order payment',
          order_id: rzp.order_id,
          prefill: { email: useSessionStore.getState().displayName ?? '', contact: phone ?? '' },
          theme: { color: '#F37021' },
        });
        setShowRazorpay(true);
        return; // Payment flow continues in WebView callbacks
      } else {
        setPlacingMsg('Placing order…');
        const res = await placeOrder(userId, items, { pickup, address, payment: { payment_method: 'cod', payment_status: 'pending' } });
        if (!pickup && address && saveToBook) { try { await saveAddress(userId, address, { setDefault: true }); } catch {} }
        clear();
        navigation.replace('OrderSuccess', { id: res.id, method: 'cod' });
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to place order');
    } finally {
      setSaving(false);
      setPlacingMsg(null);
    }
  };

  const STATES = useMemo(() => [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh','Andaman and Nicobar Islands','Dadra and Nagar Haveli and Daman and Diu','Lakshadweep']
  , []);

  const pickState = () => {
    const options = [...STATES, 'Cancel'];
    const apply = (idx?: number | null) => {
      if (idx == null) return;
      if (idx >= 0 && idx < STATES.length) setState(STATES[idx]);
    };
    if (Platform.OS === 'ios' && ActionSheetIOS) {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: STATES.length }, apply);
    } else {
      Alert.alert('Select state', '', [
        ...STATES.map((s, i) => ({ text: s, onPress: () => apply(i) })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const showInlineAddressForm = false;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 20, fontWeight: '800' }}>Checkout</Text>
      <Text style={{ marginTop: 6 }}>Subtotal: {formatPrice(total)}</Text>
      {/* Payment method */}
      <View style={{ marginTop: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 10 }}>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Payment</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Pressable disabled={!RZP_KEY_ID} onPress={() => setPaymentMethod('online')} style={({ pressed }) => ({ marginRight: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: paymentMethod==='online' ? '#1e64d4' : '#ddd', backgroundColor: paymentMethod==='online' ? '#e6f2ff' : '#fff', borderRadius: 8, opacity: pressed ? 0.9 : 1 })}>
            <Text>{paymentMethod==='online' ? '● ' : '○ '}Pay Online (Razorpay)</Text>
          </Pressable>
          <Pressable onPress={() => setPaymentMethod('cod')} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: paymentMethod==='cod' ? '#1e64d4' : '#ddd', backgroundColor: paymentMethod==='cod' ? '#e6f2ff' : '#fff', borderRadius: 8, opacity: pressed ? 0.9 : 1 })}>
            <Text>{paymentMethod==='cod' ? '● ' : '○ '}Cash on Delivery</Text>
          </Pressable>
        </View>
        <Text style={{ color: '#666', fontSize: 12 }}>Test Mode</Text>
        {!RZP_KEY_ID && (
          <Text style={{ color: '#b45309', marginTop: 4 }}>Payment temporarily unavailable.</Text>
        )}
      </View>
      {!pickup && currentAddr && (
        <Pressable onPress={() => setAddrSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Deliver to"
          style={({ pressed }) => ({ marginTop: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 10, opacity: pressed ? 0.95 : 1 })}>
          <Text style={{ fontWeight: '700' }}>Deliver to</Text>
          <Text style={{ marginTop: 2 }}>{currentAddr.name}{currentAddr.label ? ` • ${currentAddr.label}` : ''} • +91 {currentAddr.phone}</Text>
          <Text style={{ color: '#555', marginTop: 2 }}>{currentAddr.line1}{currentAddr.line2 ? `, ${currentAddr.line2}` : ''}</Text>
          <Text style={{ color: '#555' }}>{currentAddr.city}, {currentAddr.state} {currentAddr.pincode}</Text>
          <Text style={{ color: '#666', marginTop: 4, fontSize: 12 }}>Tap to change • 3–5 day delivery</Text>
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
        <Pressable accessibilityRole="switch" onPress={() => setPickup((v) => !v)} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 9999, opacity: pressed ? 0.9 : 1 })}>
          <Text>{pickup ? 'Pickup at clinic: ON' : 'Pickup at clinic: OFF'}</Text>
        </Pressable>
      </View>
      {!pickup && showInlineAddressForm && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Shipping Address</Text>
          <TextInput placeholder="Full name" value={name} onChangeText={setName} style={s.input} />
          {/* Phone with +91 code and change link */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable disabled style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginRight: 8, opacity: 1 })}>
              <Text>{dialCode}</Text>
            </Pressable>
            <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={[s.input, { flex: 1, marginTop: 8 }]} />
          </View>
          {!forSomeoneElse && (
            <Pressable onPress={() => setPhone(useSessionStore.getState().profile?.phone || '')} style={({ pressed }) => ({ alignSelf: 'flex-start', marginTop: 6, opacity: pressed ? 0.85 : 1 })}>
              <Text style={{ color: '#1e64d4' }}>Use my registered number</Text>
            </Pressable>
          )}
          <TextInput placeholder="Address line 1" value={line1} onChangeText={setLine1} style={s.input} />
          <TextInput placeholder="Address line 2 (optional)" value={line2} onChangeText={setLine2} style={s.input} />
          <TextInput placeholder="City" value={city} onChangeText={setCity} style={s.input} />
          <TextInput placeholder="Pincode" value={pincode} onChangeText={setPincode} keyboardType="number-pad" style={s.input} />
          <Pressable onPress={pickState} style={({ pressed }) => ({ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginTop: 8, opacity: pressed ? 0.9 : 1 })}>
            <Text>{state ? state : 'Select state'}</Text>
          </Pressable>
          <View style={[s.input, { justifyContent: 'center' }]}>
            <Text>Country: India</Text>
          </View>
          {/* Save to address book */}
          <Pressable accessibilityRole="switch" onPress={() => setSaveToBook((v) => !v)} style={({ pressed }) => ({ marginTop: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignSelf: 'flex-start', opacity: pressed ? 0.9 : 1 })}>
            <Text>{saveToBook ? '✓ Save to address book' : 'Save to address book'}</Text>
          </Pressable>
          {/* Saved addresses */}
          {savedAddrs.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: '700', marginBottom: 6 }}>Saved addresses</Text>
              {savedAddrs.map((a, idx) => (
                <Pressable key={`addr-${a?.id ?? idx}`} onPress={() => applyAddress(a)} style={({ pressed }) => ({ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8, opacity: pressed ? 0.9 : 1 })}>
                  <Text style={{ fontWeight: '700' }}>{a.name}</Text>
                  <Text style={{ color: '#555' }}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</Text>
                  <Text style={{ color: '#555' }}>{a.city}, {a.state} {a.pincode}</Text>
                  <Text style={{ color: '#555' }}>+91 {a.phone}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {/* Choose from map (placeholder) */}
          <Pressable onPress={() => navigation.navigate('MapPicker')} style={({ pressed }) => ({ marginTop: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignSelf: 'flex-start', opacity: pressed ? 0.9 : 1 })}>
            <Text>Choose from map</Text>
          </Pressable>
        </View>
      )}
      {!!error && <Text style={{ color: '#b00020', marginTop: 10 }}>{error}</Text>}
      <Pressable accessibilityRole="button" onPress={onPlaceOrder} disabled={saving} style={({ pressed }) => ({ marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: '#1e64d4', opacity: pressed || saving ? 0.85 : 1 })}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>{saving ? (placingMsg || 'Placing order…') : 'Place Order'}</Text>
      </Pressable>

      {/* Address select bottom sheet */}
      {addrSheetOpen && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <Pressable style={{ flex: 1 }} onPress={() => {
            Animated.timing(sheetTranslateY, { toValue: screenH, duration: 180, useNativeDriver: true }).start(() => setAddrSheetOpen(false));
          }} />
          <Animated.View style={{ transform: [{ translateY: sheetTranslateY }], backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, maxHeight: '80%' }} {...pan.panHandlers}>
            <View style={{ alignItems: 'center', paddingBottom: 8 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd' }} />
              {showHint && (
                <Text style={{ marginTop: 6, color: '#666', fontSize: 12 }}>Swipe down to close • Drag to adjust</Text>
              )}
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Select delivery address</Text>
            <ScrollView>
              {(savedAddrs || []).map((a: any, idx: number) => {
                const selected = pendingAddrId ? pendingAddrId === a.id : currentAddr?.id === a.id;
                return (
                  <Pressable key={`addr-opt-${a.id ?? idx}`} onPress={() => setPendingAddrId(a.id)} style={({ pressed }) => ({ borderWidth: 1, borderColor: selected ? '#1e64d4' : '#eee', backgroundColor: selected ? '#e6f2ff' : '#fff', borderRadius: 10, padding: 12, marginBottom: 10, opacity: pressed ? 0.95 : 1 })}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ marginRight: 8 }}>{selected ? '●' : '○'}</Text>
                      <Text style={{ fontWeight: '700' }}>{a.name}{a.label ? ` • ${a.label}` : ''}</Text>
                      {a.is_default && <Text style={{ marginLeft: 8, fontSize: 12, color: '#16a34a' }}>Default</Text>}
                    </View>
                    <Text style={{ color: '#555' }}>+91 {a.phone}</Text>
                    <Text style={{ color: '#555' }}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</Text>
                    <Text style={{ color: '#555' }}>{a.city}, {a.state} {a.pincode}</Text>
                  </Pressable>
                );
              })}
              <Pressable onPress={() => { setAddrSheetOpen(false); navigation.navigate('Account', { screen: 'MyAddresses', params: { nextAction: 'checkout', openAdd: true } }); }} style={({ pressed }) => ({ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', opacity: pressed ? 0.9 : 1 })}>
                <Text>Add new address</Text>
              </Pressable>
            </ScrollView>
            <Pressable disabled={!pendingAddrId} onPress={async () => {
              if (!pendingAddrId) return;
              try {
                if (isLoggedIn && userId) {
                  const next = await setDefaultAddress(userId, pendingAddrId);
                  setSavedAddrs(next);
                  const def = next.find((x: any) => x.is_default) || next.find((x: any) => x.id === pendingAddrId);
                  if (def) applyAddress(def);
                } else {
                  const a = savedAddrs.find((x: any) => x.id === pendingAddrId);
                  if (a) applyAddress(a);
                }
                show('Delivering to selected address');
              } finally {
                Animated.timing(sheetTranslateY, { toValue: screenH, duration: 180, useNativeDriver: true }).start(() => setAddrSheetOpen(false));
              }
            }} style={({ pressed }) => ({ marginTop: 8, padding: 14, borderRadius: 10, backgroundColor: pendingAddrId ? '#1e64d4' : '#ccc', opacity: pressed ? 0.9 : 1 })}>
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Deliver to this address</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Razorpay WebView */}
      {razorpayOptions && (
        <RazorpayWebView
          visible={showRazorpay}
          options={razorpayOptions}
          onSuccess={handleRazorpaySuccess}
          onError={handleRazorpayError}
          onCancel={handleRazorpayCancel}
        />
      )}
    </ScrollView>
  );
}

const s: any = {
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginTop: 8 },
};
