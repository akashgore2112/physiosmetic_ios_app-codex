import React from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
};

export default function QtyStepper({ value, min = 1, max, onChange }: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max ?? Number.MAX_SAFE_INTEGER, value + 1));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable onPress={dec} hitSlop={10} style={({ pressed }) => ({ padding: 8, borderWidth: 1, borderColor: '#ccc', opacity: pressed ? 0.8 : 1 })}>
        <Text>-</Text>
      </Pressable>
      <Text style={{ minWidth: 36, textAlign: 'center' }}>{value}</Text>
      <Pressable onPress={inc} hitSlop={10} style={({ pressed }) => ({ padding: 8, borderWidth: 1, borderColor: '#ccc', opacity: pressed ? 0.8 : 1 })}>
        <Text>+</Text>
      </Pressable>
    </View>
  );
}

