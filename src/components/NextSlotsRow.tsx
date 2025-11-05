import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { formatDate, formatTime } from '../utils/formatDate';

type Slot = {
  id: string;
  date: string;
  start_time: string;
  therapist_id: string;
  therapist_name?: string;
};

type Props = {
  slots: Slot[];
  onPressSlot: (slot: Slot) => void;
};

export default function NextSlotsRow({ slots, onPressSlot }: Props): JSX.Element {
  const list = Array.isArray(slots) ? slots.slice(0, 3) : [];

  return (
    <View style={styles.wrap}>
      {/* SectionHeader substitute */}
      <Text style={styles.header}>Next available</Text>
      {list.length === 0 ? (
        <Text style={styles.empty}>No upcoming slots — check other dates.</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {list.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => onPressSlot(s)}
              style={({ pressed }) => [styles.chip, pressed && { opacity: 0.9 }]}
              accessibilityRole="button"
              accessibilityLabel={`Select slot ${formatDate(s.date)} ${formatTime(s.start_time)}`}
            >
              <Text numberOfLines={1} style={styles.chipText}>
                {formatDate(s.date)} · {formatTime(s.start_time)} — {s.therapist_name || 'Therapist'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  header: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  row: { paddingHorizontal: 2 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    marginRight: 8,
  },
  chipText: { color: '#111' },
  empty: { color: '#777', fontSize: 12 },
});

