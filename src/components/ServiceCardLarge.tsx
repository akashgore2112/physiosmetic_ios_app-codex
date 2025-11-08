import React from 'react';
import { View, Text, Pressable } from 'react-native';
import CachedImage from './CachedImage';

type Props = {
  id: string;
  name: string;
  description?: string | null;
  nameNode?: React.ReactNode;
  descriptionNode?: React.ReactNode;
  base_price?: number | null;
  duration_minutes?: number | null;
  is_online_allowed?: boolean | null;
  image_url?: string | null;
  nextSlotText?: string | null;
  nextSlotDate?: string | null;
  nextSlotTime?: string | null;
  onPress: () => void;
  onBook?: () => void;
};

import { formatDate, formatTime } from '../utils/formatDate';
import { light as hapticLight } from '../utils/haptics';

function ServiceCardLargeBase({ name, description, nameNode, descriptionNode, base_price, duration_minutes, is_online_allowed, image_url, nextSlotText, nextSlotDate, nextSlotTime, onPress, onBook }: Props) {
  const priceText = typeof base_price === 'number' ? `From ₹${Math.round(base_price)}` : undefined;
  const durText = typeof duration_minutes === 'number' ? `~${duration_minutes} min` : undefined;
  const meta = [priceText, durText].filter(Boolean).join(' • ');
  const Container: any = onPress ? Pressable : View;
  const containerProps: any = onPress
    ? {
        accessibilityRole: 'button',
        accessibilityLabel: `View ${name}`,
        onPress,
      }
    : {};

  return (
    <Container
      {...containerProps}
      style={({ pressed }: any) => ({ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginBottom: 12, overflow: 'hidden', opacity: onPress && pressed ? 0.95 : 1 })}
    >
      {image_url ? (
        <CachedImage source={{ uri: image_url }} style={{ width: '100%', height: 160, backgroundColor: '#eee' }} contentFit="cover" fadeIn />
      ) : (
        <View style={{ width: '100%', height: 160, backgroundColor: '#eee' }} />
      )}
      <View style={{ padding: 12 }}>
        {nameNode ? (
          <Text numberOfLines={2} style={{ fontSize: 16, fontWeight: '700' }}>{nameNode}</Text>
        ) : (
          <Text numberOfLines={2} style={{ fontSize: 16, fontWeight: '700' }}>{name}</Text>
        )}
        {(descriptionNode || description) && (
          <Text numberOfLines={2} style={{ color: '#555', marginTop: 4 }}>
            {descriptionNode ?? description}
          </Text>
        )}
        {!!meta && (
          <Text style={{ color: '#333', marginTop: 6 }}>{meta}</Text>
        )}
        <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center' }}>
          {is_online_allowed ? (
            <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999, marginRight: 8 }}>
              <Text style={{ fontSize: 12, color: '#0f172a' }}>Online consult</Text>
            </View>
          ) : null}
          {(() => {
            let text: string | null = null;
            if (nextSlotDate && nextSlotTime) {
              try {
                const [y, m, d] = nextSlotDate.split('-').map((n) => parseInt(n, 10));
                const slotDate = new Date(y, (m - 1), d);
                const now = new Date();
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                const timeText = formatTime(nextSlotTime);
                const sameDay = slotDate.getTime() === today.getTime();
                const nextDay = slotDate.getTime() === tomorrow.getTime();
                if (sameDay) text = `Today ${timeText}`;
                else if (nextDay) text = `Tomorrow ${timeText}`;
                else {
                  // Use existing formatDate but trim weekday to get "DD Mon"
                  const fd = formatDate(nextSlotDate);
                  const trimmed = (fd.includes(',') ? fd.split(',')[1].trim() : fd);
                  text = `${trimmed} ${timeText}`;
                }
              } catch {
                // fallback to provided text
                text = nextSlotText ?? null;
              }
            } else if (nextSlotText) {
              text = nextSlotText;
            }
            return text ? (
              <Text style={{ fontSize: 12, color: '#666' }}>Next slot: {text}</Text>
            ) : null;
          })()}
        </View>
        {onBook && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Book ${name}`}
            accessibilityHint="Opens chooser to book online or in-clinic."
            onPress={(e) => { e.stopPropagation?.(); try { hapticLight(); } catch {} onBook(); }}
            style={({ pressed }) => ({ marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.9 : 1 })}
          >
            <Text style={{ fontWeight: '700' }}>Book</Text>
          </Pressable>
        )}
      </View>
    </Container>
  );
}

const ServiceCardLarge = React.memo(ServiceCardLargeBase);
export default ServiceCardLarge;
