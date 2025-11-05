import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';

type Therapist = { id: string; name: string; speciality?: string; about?: string; photo_url?: string };

type Props = {
  therapist: Therapist;
  nextSlotText?: string | null;
  showOnlineBadge?: boolean;
  onSelect: (therapistId: string) => void;
};

export default function TherapistCard({ therapist, nextSlotText, showOnlineBadge, onSelect }: Props): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select therapist ${therapist.name}`}
      onPress={() => onSelect(therapist.id)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.row}>
        {therapist.photo_url ? (
          <Image source={{ uri: therapist.photo_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{(therapist.name || '?').charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text numberOfLines={1} style={styles.name}>{therapist.name}</Text>
          {!!therapist.speciality && (
            <Text numberOfLines={1} style={styles.spec}>{therapist.speciality}</Text>
          )}
          {!!therapist.about && (
            <Text numberOfLines={3} style={styles.about}>{therapist.about}</Text>
          )}
          <View style={styles.badgesRow}>
            {showOnlineBadge ? (
              <View style={styles.badge}><Text style={styles.badgeText}>Online consult</Text></View>
            ) : null}
            {!!nextSlotText && (
              <View style={styles.nextSlot}><Text style={styles.nextSlotText}>⏰ {nextSlotText}</Text></View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.ctaRow}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => onSelect(therapist.id)} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}>
          <Text style={styles.btnText}>Select & Continue</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const AVATAR = 56;
const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: { flexDirection: 'row' },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, backgroundColor: '#f2f2f2' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: '#555' },
  info: { marginLeft: 12, flex: 1 },
  name: { fontWeight: '600', fontSize: 16, color: '#111' },
  spec: { color: '#666', marginTop: 2 },
  about: { color: '#555', marginTop: 6, lineHeight: 18 },
  badgesRow: { flexDirection: 'row', marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#e6f2ff', borderRadius: 12, marginRight: 8 },
  badgeText: { color: '#1e64d4', fontSize: 12, fontWeight: '600' },
  nextSlot: { marginTop: 4 },
  nextSlotText: { color: '#666', fontSize: 12 },
  ctaRow: { flexDirection: 'row', marginTop: 12, alignItems: 'center' },
  btn: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#F37021', borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
});

