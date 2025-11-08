import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Modal, KeyboardAvoidingView, Platform, ActionSheetIOS } from 'react-native';
import { useSessionStore } from '../../store/useSessionStore';
import { getAddresses, saveAddress, updateAddress, deleteAddress, setDefaultAddress } from '../../services/profileAddressService';
import { TextInput } from 'react-native';
import { useMapPickerStore } from '../../store/useMapPickerStore';
import { normalizeToE164 } from '../../utils/phone';
import { light as hapticLight } from '../../utils/haptics';

export default function MyAddressesScreen({ navigation }: any): JSX.Element {
  const { userId, isLoggedIn } = useSessionStore();
  const [loading, setLoading] = useState(true);
  const [addrs, setAddrs] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ name: '', phone: '', line1: '', line2: '', city: '', pincode: '', state: '', country: 'India', label: 'Home', is_default: true });
  const STATES = React.useMemo(() => [
    'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh','Andaman and Nicobar Islands','Dadra and Nagar Haveli and Daman and Diu','Lakshadweep'
  ], []);

  const pickState = () => {
    const options = [...STATES, 'Cancel'];
    const apply = (idx?: number | null) => { if (idx!=null && idx>=0 && idx<STATES.length) setForm({ ...form, state: STATES[idx] }); };
    if (Platform.OS === 'ios' && ActionSheetIOS) {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: STATES.length }, apply);
    } else {
      Alert.alert('Select state', '', [
        ...STATES.map((s, i) => ({ text: s, onPress: () => apply(i) })),
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (isLoggedIn && userId) {
          const rows = await getAddresses(userId);
          if (!cancelled) setAddrs(rows || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn, userId]);

  // Apply selection from MapPicker on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const picked = useMapPickerStore.getState().consumeSelection();
      if (picked) {
        setForm((f: any) => ({
          ...f,
          line1: picked.line1 ?? f.line1,
          line2: picked.line2 ?? f.line2,
          city: picked.city ?? f.city,
          state: picked.state ?? f.state,
          pincode: picked.postal_code ?? f.pincode,
        }));
      }
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '800' }}>My Addresses</Text>
      {!isLoggedIn && (
        <Text style={{ marginTop: 8, color: '#666' }}>Please sign in to view saved addresses.</Text>
      )}
      {isLoggedIn && (
        <View style={{ marginTop: 12 }}>
          {loading && <Text>Loading…</Text>}
          {!loading && addrs.length === 0 && (
            <Text style={{ color: '#666' }}>No saved addresses yet. Add one below to speed up checkout.</Text>
          )}
          <Pressable onPress={() => { setEditing(null); setForm({ name: '', phone: '', line1: '', line2: '', city: '', pincode: '', state: '', country: 'India', is_default: true }); setModalOpen(true); }} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10, opacity: pressed ? 0.9 : 1 })}>
            <Text>Add address</Text>
          </Pressable>
          {addrs.map((a, idx) => (
            <View key={`addr-${a?.id ?? idx}`} style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <Text style={{ fontWeight: '700' }}>{a.name}</Text>
              <Text style={{ color: '#555', marginTop: 2 }}>+91 {a.phone}</Text>
              <Text style={{ color: '#555', marginTop: 2 }}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</Text>
              <Text style={{ color: '#555' }}>{a.city}, {a.state} {a.pincode}</Text>
              <Text style={{ color: '#555' }}>India</Text>
              <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' }}>
                <Pressable onPress={() => Alert.alert('Address', `${a.line1}${a.line2 ? `, ${a.line2}` : ''}\n${a.city}, ${a.state} ${a.pincode}\nIndia`)} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginRight: 8, opacity: pressed ? 0.9 : 1 })}>
                  <Text>Details</Text>
                </Pressable>
                <Pressable onPress={() => { setEditing(a); setForm({ ...a }); setModalOpen(true); }} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginRight: 8, marginTop: 8, opacity: pressed ? 0.9 : 1 })}>
                  <Text>Edit</Text>
                </Pressable>
                <Pressable onPress={async () => { if (!userId) return; const next = await deleteAddress(userId, a.id); setAddrs(next); }} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#fbbf24', backgroundColor: '#fef3c7', borderRadius: 8, marginRight: 8, marginTop: 8, opacity: pressed ? 0.9 : 1 })}>
                  <Text>Delete</Text>
                </Pressable>
                {!a.is_default && (
                  <Pressable onPress={async () => { if (!userId) return; const next = await setDefaultAddress(userId, a.id); setAddrs(next); }} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginRight: 8, marginTop: 8, opacity: pressed ? 0.9 : 1 })}>
                    <Text>Set as default</Text>
                  </Pressable>
                )}
                {((navigation?.getState()?.routes?.slice(-1)[0]?.params as any)?.nextAction === 'checkout') && (
                  <Pressable onPress={async () => { if (!userId) return; const next = await setDefaultAddress(userId, a.id); setAddrs(next); navigation.navigate('Shop', { screen: 'Checkout' }); }} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#1e64d4', backgroundColor: '#e6f2ff', borderRadius: 8, marginRight: 8, marginTop: 8, opacity: pressed ? 0.9 : 1 })}>
                    <Text>Use this address</Text>
                  </Pressable>
                )}
              </View>
              {a.is_default && <Text style={{ color: '#16a34a', fontSize: 12, marginTop: 6 }}>Default</Text>}
            </View>
          ))}
        </View>
      )}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable onPress={() => setModalOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
            <View style={{ alignItems: 'center', paddingBottom: 8 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#ddd' }} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{editing ? 'Edit address' : 'Add address'}</Text>
            <TextInput placeholder="Full name" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} style={s.input} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable disabled style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginRight: 8, opacity: 1 })}>
                <Text>+91</Text>
              </Pressable>
              <TextInput placeholder="Phone" value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" style={[s.input, { flex: 1, marginTop: 8 }]} />
            </View>
            {/* Label chips */}
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              {['Home','Work','Other'].map((lbl) => (
                <Pressable key={lbl} onPress={() => setForm({ ...form, label: lbl })} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: form.label === lbl ? '#333' : '#ddd', backgroundColor: form.label === lbl ? '#f2f2f2' : '#fff', borderRadius: 9999, marginRight: 8, opacity: pressed ? 0.9 : 1 })}>
                  <Text>{lbl}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput placeholder="Address line 1" value={form.line1} onChangeText={(v) => setForm({ ...form, line1: v })} style={s.input} />
            <TextInput placeholder="Address line 2 (optional)" value={form.line2} onChangeText={(v) => setForm({ ...form, line2: v })} style={s.input} />
            <TextInput placeholder="City" value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} style={s.input} />
            <TextInput placeholder="Pincode" value={form.pincode} onChangeText={(v) => setForm({ ...form, pincode: v })} keyboardType="number-pad" style={s.input} />
            <Pressable onPress={pickState} style={({ pressed }) => ({ borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginTop: 8, opacity: pressed ? 0.9 : 1 })}>
              <Text>{form.state ? form.state : 'Select state'}</Text>
            </Pressable>
            <View style={[s.input, { justifyContent: 'center' }]}>
              <Text>Country: India</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Pressable accessibilityRole="switch" onPress={() => setForm({ ...form, is_default: !form.is_default })} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginRight: 8, opacity: pressed ? 0.9 : 1 })}>
                <Text>{form.is_default ? '✓ Default' : 'Set as default'}</Text>
              </Pressable>
              <Pressable onPress={() => navigation.navigate('MapPicker')} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, opacity: pressed ? 0.9 : 1 })}>
                <Text>Choose from map</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <Pressable onPress={async () => {
                try { hapticLight(); } catch {}
                if (!userId) return;
                if (!form.name || !form.phone || !form.line1 || !form.city || !form.pincode || !form.state) { Alert.alert('Missing fields', 'Please fill all required fields'); return; }
                const e164 = normalizeToE164(form.phone, '91');
                if (!e164) { Alert.alert('Invalid phone', 'Please enter a valid phone number'); return; }
                const pinOk = /^[1-9][0-9]{5}$/.test((form.pincode || '').trim());
                if (!pinOk) { Alert.alert('Invalid pincode', 'Please enter a valid 6-digit pincode'); return; }
                if (editing) {
                  const next = await updateAddress(userId, form, { setDefault: !!form.is_default });
                  setAddrs(next);
                } else {
                  const next = await saveAddress(userId, form, { setDefault: !!form.is_default });
                  setAddrs(next);
                }
                setModalOpen(false);
              }} style={({ pressed }) => ({ padding: 12, borderRadius: 8, backgroundColor: '#1e64d4', opacity: pressed ? 0.9 : 1, marginRight: 8 })}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{editing ? 'Save' : 'Add'}</Text>
              </Pressable>
              <Pressable onPress={() => setModalOpen(false)} style={({ pressed }) => ({ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', opacity: pressed ? 0.9 : 1 })}>
                <Text>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const s: any = {
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginTop: 8 },
};
