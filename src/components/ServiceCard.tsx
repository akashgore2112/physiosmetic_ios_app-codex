import React from 'react';
import { View, Text, Pressable } from 'react-native';
import CachedImage from './CachedImage';

type Props = {
  name: string;
  category?: string;
  imageUrl?: string | null;
  onPress: () => void;
};

function ServiceCardBase({ name, category, imageUrl, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 200, marginRight: 12, opacity: pressed ? 0.85 : 1 })}>
      {imageUrl ? (
        <CachedImage source={{ uri: imageUrl }} style={{ width: '100%', height: 100, backgroundColor: '#eee' }} contentFit="cover" />
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

const ServiceCard = React.memo(ServiceCardBase);
export default ServiceCard;
