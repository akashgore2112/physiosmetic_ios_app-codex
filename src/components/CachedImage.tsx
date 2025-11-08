import React from 'react';
import { Image as RNImage, ImageProps as RNImageProps, Animated, View, StyleSheet } from 'react-native';

type Props = RNImageProps & {
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: any;
  fadeIn?: boolean;
};

export default function CachedImage(props: Props) {
  const { style, contentFit = 'cover', placeholder, fadeIn = true, onLoadEnd, ...rest } = props as any;
  const containerStyle = Array.isArray(style) ? StyleSheet.flatten(style) : (style || {});
  // Try to use Expo Image if available; wrap with a placeholder background and transition
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Image: ExpoImage } = require('expo-image');
    return (
      <View style={[{ backgroundColor: '#eee' }, containerStyle]}>
        <ExpoImage
          {...rest}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          placeholder={placeholder}
          transition={fadeIn ? 150 : 0}
          onLoadEnd={onLoadEnd}
        />
      </View>
    );
  } catch {
    // Fallback: standard RN Image with fade-in and placeholder background
    const opacity = React.useRef(new Animated.Value(fadeIn ? 0 : 1)).current;
    const handleEnd = () => {
      if (fadeIn) {
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      }
      try { onLoadEnd?.(); } catch {}
    };
    return (
      <View style={[{ backgroundColor: '#eee' }, containerStyle]}>
        <Animated.Image
          {...(rest as any)}
          onLoadEnd={handleEnd}
          style={[StyleSheet.absoluteFill, { opacity }]}
          resizeMode="cover"
        />
      </View>
    );
  }
}
