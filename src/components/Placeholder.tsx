import React from 'react';
import { View, Text } from 'react-native';

export default function Placeholder({ label = 'Placeholder' }: { label?: string }): JSX.Element {
  // Generic placeholder component for early scaffolding
  return (
    <View style={{ padding: 12 }}>
      <Text>{label}</Text>
    </View>
  );
}

