import React from 'react';
import { View, Text } from 'react-native';

export default function MarkdownView({ markdown }: { markdown: string }) {
  const lines = markdown.split(/\r?\n/);
  return (
    <View style={{ padding: 16 }}>
      {lines.map((line, idx) => {
        if (line.startsWith('### ')) return <Text key={idx} style={{ fontSize: 16, fontWeight: '700', marginTop: 12 }}>{line.replace(/^###\s+/, '')}</Text>;
        if (line.startsWith('## ')) return <Text key={idx} style={{ fontSize: 18, fontWeight: '800', marginTop: 14 }}>{line.replace(/^##\s+/, '')}</Text>;
        if (line.startsWith('# ')) return <Text key={idx} style={{ fontSize: 22, fontWeight: '900', marginTop: 16 }}>{line.replace(/^#\s+/, '')}</Text>;
        // bold: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        return (
          <Text key={idx} style={{ marginTop: 6, lineHeight: 20 }}>
            {parts.map((p, i) => p.startsWith('**') && p.endsWith('**')
              ? <Text key={i} style={{ fontWeight: '700' }}>{p.slice(2, -2)}</Text>
              : <Text key={i}>{p}</Text>
            )}
          </Text>
        );
      })}
    </View>
  );
}

