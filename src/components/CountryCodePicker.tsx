import React, { useMemo, useState } from 'react';
import { Modal, TextInput, TouchableOpacity, View, Text, FlatList } from 'react-native';
import { CALLING_CODES } from '../constants/callingCodes';

export default function CountryCodePicker({ value, onChange }: { value: string; onChange: (dialCode: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const favorites = ['IN', 'AE', 'US', 'GB'];
  const data = useMemo(() => {
    const s = (q || '').toLowerCase();
    const filtered = CALLING_CODES.filter((c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s));
    // De-duplicate by iso2 + code to avoid same calling code collisions
    const deduped = Array.from(new Map(filtered.map((x) => [`${x.iso2}-${x.code}`, x])).values());
    const fav = deduped.filter((c) => favorites.includes(c.iso2));
    const rest = deduped.filter((c) => !favorites.includes(c.iso2));
    return [...fav, ...rest];
  }, [q]);
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} style={{ padding: 8, borderWidth: 1, borderColor: '#ccc', marginRight: 8 }}>
        <Text>{value || '+91'}</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#fff', padding: 12, maxHeight: '80%' }}>
            <TextInput placeholder="Search country" value={q} onChangeText={setQ} style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 8 }} />
            <FlatList
              data={data}
              keyExtractor={(item) => {
                const safeDial = item.code || 'NA';
                return `${item.iso2}-${safeDial}`;
              }}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { onChange(item.code); setOpen(false); }} style={{ paddingVertical: 10 }}>
                  <Text>{`${item.name} (${item.code})`}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity onPress={() => setOpen(false)} style={{ padding: 8, borderWidth: 1, borderColor: '#ccc' }}>
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
