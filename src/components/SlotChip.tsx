import React from 'react';
import { Pressable, Text } from 'react-native';

export default function SlotChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select time ${label}`}
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
        minHeight: 44,
        minWidth: 44,
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text>{label}</Text>
    </Pressable>
  );
}
