import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

type Therapist = {
  id: string;
  name: string;
  speciality?: string;
  photo_url?: string;
};

type Props = {
  therapists: Therapist[];
  onPressTherapist: (therapistId: string) => void;
};

export default function TherapistChips({ therapists, onPressTherapist }: Props): JSX.Element | null {
  if (!therapists || therapists.length === 0) return null;

  return (
    <FlatList
      data={therapists}
      keyExtractor={(t) => t.id}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onPressTherapist(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Therapist ${item.name}`}
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        >
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{(item.name || '?').trim().charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.textWrap}>
            <Text numberOfLines={1} style={styles.nameText}>{item.name}</Text>
            {!!item.speciality && (
              <Text numberOfLines={1} style={styles.specText}>{item.speciality}</Text>
            )}
          </View>
        </Pressable>
      )}
    />
  );
}

const AVATAR_SIZE = 36;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 999,
    marginRight: 8,
  },
  chipPressed: {
    opacity: 0.85,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#f1f1f1',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#444',
    fontWeight: '700',
  },
  textWrap: {
    marginLeft: 8,
    maxWidth: 160,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  specText: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
});

