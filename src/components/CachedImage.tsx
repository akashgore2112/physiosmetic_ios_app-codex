import React from 'react';
import { Image as RNImage, ImageProps as RNImageProps } from 'react-native';

type Props = RNImageProps & {
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: any;
};

export default function CachedImage(props: Props) {
  // Try to use Expo Image if available for caching and placeholders; fallback to RN Image.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Image: ExpoImage } = require('expo-image');
    const { contentFit = 'cover', placeholder, ...rest } = props as any;
    return <ExpoImage {...rest} contentFit={contentFit} placeholder={placeholder} />;
  } catch {
    // Fallback: standard RN Image
    const { contentFit: _ignored, placeholder: _ignored2, ...rest } = props as any;
    return <RNImage resizeMode="cover" {...rest} />;
  }
}

