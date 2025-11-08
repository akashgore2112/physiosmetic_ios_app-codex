import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useMapPickerStore } from '../../store/useMapPickerStore';

export default function RefineAddressScreen({ navigation }: any): JSX.Element {
  const selection = useMapPickerStore((s) => s.selection);
  const setSelection = useMapPickerStore((s) => s.setSelection);
  const [line1, setLine1] = useState(selection?.line1 ?? '');
  const [line2, setLine2] = useState(selection?.line2 ?? '');
  const [city, setCity] = useState(selection?.city ?? '');
  const [state, setState] = useState(selection?.state ?? '');
  const [pincode, setPincode] = useState(selection?.postal_code ?? '');

  useEffect(() => {
    // If selection is missing, just go back
    if (!selection) {
      navigation.goBack();
    }
  }, [selection]);

  const onSave = () => {
    if (!selection) return;
    setSelection({
      ...selection,
      line1: line1 || undefined,
      line2: line2 || undefined,
      city: city || undefined,
      state: state || undefined,
      postal_code: pincode || undefined,
    });
    // Go back to the calling screen (pop MapPicker and this screen)
    if (navigation.pop) navigation.pop(2);
    else navigation.goBack();
  };

  const preview = selection?.formatted_address || [line1, line2, [city, state].filter(Boolean).join(', '), pincode].filter(Boolean).join('\n');

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 12 }}>Refine Address</Text>
      {!!preview && <Text style={{ color: '#666', marginBottom: 12 }}>{preview}</Text>}
      <TextInput placeholder="Address line 1" value={line1} onChangeText={setLine1} style={s.input} />
      <TextInput placeholder="Address line 2 (optional)" value={line2} onChangeText={setLine2} style={s.input} />
      <TextInput placeholder="City" value={city} onChangeText={setCity} style={s.input} />
      <TextInput placeholder="State" value={state} onChangeText={setState} style={s.input} />
      <TextInput placeholder="Pincode" value={pincode} onChangeText={setPincode} keyboardType="number-pad" style={s.input} />
      <Pressable onPress={onSave} style={({ pressed }) => ({ marginTop: 16, padding: 14, borderRadius: 10, backgroundColor: '#1e64d4', opacity: pressed ? 0.9 : 1 })}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '700' }}>Save</Text>
      </Pressable>
    </View>
  );
}

const s: any = {
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginTop: 8 },
};

