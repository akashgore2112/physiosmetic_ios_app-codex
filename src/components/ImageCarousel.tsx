import React, { useRef, useState } from 'react';
import { View, FlatList, NativeScrollEvent, NativeSyntheticEvent, Text } from 'react-native';
import CachedImage from './CachedImage';

type Props = {
  images: string[];
  height?: number;
};

export default function ImageCarousel({ images, height = 220 }: Props) {
  const [index, setIndex] = useState(0);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const w = e.nativeEvent.layoutMeasurement.width;
    if (w > 0) setIndex(Math.round(x / w));
  };
  const data = images && images.length ? images : [];
  return (
    <View>
      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        renderItem={({ item }) => <CachedImage source={{ uri: item }} style={{ width: '100%', height }} contentFit="cover" />}
        onScroll={onScroll}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
      />
      {!!data.length && (
        <View style={{ position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
          <Text style={{ color: '#fff' }}>{`${index + 1}/${data.length}`}</Text>
        </View>
      )}
    </View>
  );
}
