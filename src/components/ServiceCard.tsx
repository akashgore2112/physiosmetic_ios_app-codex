import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';

type Props = {
  name: string;
  category?: string;
  imageUrl?: string | null;
  onPress: () => void;
};

export default function ServiceCard({ name, category, imageUrl, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 200, marginRight: 12, opacity: pressed ? 0.85 : 1 })}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 100, backgroundColor: '#eee' }} />
      ) : (
        <View style={{ width: '100%', height: 100, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }}>
          <Text>No Image</Text>
        </View>
      )}
      <Text style={{ fontWeight: '600', marginTop: 6 }}>{name}</Text>
      {!!category && <Text style={{ color: '#666' }}>{category}</Text>}
    </Pressable>
  );
}
