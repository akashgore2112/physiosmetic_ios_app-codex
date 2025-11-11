# Physiosmetic Theme System - Design Tokens Documentation

**Created**: 2025-11-10
**Source**: `/website-reference/` (HTML/CSS analysis)
**Status**: Foundation Complete, Implementation In Progress

---

## Overview

The Physiosmetic theme system implements a **dark futuristic medical tech aesthetic** extracted from the website reference. The design language emphasizes:

- **Dark Mode Only**: Near-black backgrounds (#050A14) for immersive depth
- **Orange Primary** (#F37021): Energetic, warm brand color for CTAs and accents
- **Blue Secondary** (#4385F5): Calm, trust-building secondary accent
- **Glassmorphism**: Translucent cards with backdrop blur effects
- **Luminous Glows**: Orange and blue glow effects on interactive elements
- **Smooth Motion**: 120ms-320ms animations with cubic-bezier easing

---

## Design Token Extraction

### Colors (15 tokens)

#### Primary Brand Colors
- `primary`: #F37021 (Orange) - Main brand color, primary buttons
- `primaryLight`: #ff9d5c - Lighter orange for gradients
- `primaryDark`: #d85f15 - Darker orange for pressed states

#### Secondary Accent
- `secondary`: #4385F5 (Blue) - Secondary actions, links
- `secondaryLight`: #6fa3ff - Blue gradient highlight
- `secondaryDark`: #2b68cc - Blue pressed states

#### Background Colors
- `darkBg`: #050A14 - Main app background
- `dark`: #0a1420 - Secondary dark for sections
- `darker`: #050a14 - Darkest for overlays
- `cardBg`: rgba(10, 15, 25, 0.95) - Glassmorphic card background
- `cardBgLight`: rgba(20, 25, 35, 0.90) - Lighter card variant

#### Text Colors
- `textPrimary`: #ffffff - Primary white text
- `textSecondary`: rgba(255, 255, 255, 0.7) - Secondary translucent text
- `textTertiary`: rgba(255, 255, 255, 0.5) - Tertiary dimmed text
- `textInverse`: #050A14 - Dark text on light backgrounds

#### Status Colors
- `success`: #10b981 (Green) - Success states, confirmations
- `warning`: #f59e0b (Amber) - Warnings, pending states
- `danger`: #ef4444 (Red) - Errors, destructive actions
- `info`: #3b82f6 (Blue) - Informational messages

---

### Gradients (10 patterns)

#### Background Gradients
- `mainBackground`: Dark gradient for app background
- `glowOrange`: Radial orange glow for accent areas
- `glowBlue`: Radial blue glow for secondary areas
- `glowOrangeTop`: Subtle top glow for headers

#### Component Gradients
- `primaryButton`: Orange gradient for primary buttons
- `secondaryButton`: Blue gradient for secondary buttons
- `cardSubtle`: Subtle card gradient overlay
- `cardGlass`: Glassmorphic card gradient
- `shimmer`: Loading skeleton shimmer gradient
- `orangeBadge`/`blueBadge`: Badge background gradients

---

### Spacing Scale (10 steps)

Based on 4px base unit:
- `xs`: 4px - Minimal spacing
- `sm`: 8px - Small spacing
- `md`: 12px - Medium-small spacing
- `base`: 16px - Standard spacing (1rem equivalent)
- `lg`: 20px - Large spacing
- `xl`: 24px - Extra large spacing
- `2xl`: 32px - 2x extra large
- `3xl`: 40px - 3x extra large
- `4xl`: 48px - 4x extra large
- `5xl`: 64px - 5x extra large

---

### Border Radius (8 values)

- `xs`: 4px - Focus indicators, minimal rounding
- `sm`: 8px - Small cards, chips
- `md`: 10px - Medium buttons
- `base`: 12px - Standard cards, inputs
- `lg`: 16px - Large cards
- `xl`: 20px - Extra large cards
- `2xl`: 24px - Hero cards, modals
- `round`: 9999px - Fully rounded (circular avatars, pills)

---

### Shadows (6 presets)

#### Standard Shadows
- `sm`: Subtle shadow for small elevated elements
- `md`: Medium shadow for cards
- `lg`: Large shadow for modals, popovers

#### Glow Effects (Futuristic)
- `glowPrimary`: Orange glow for primary actions
- `glowSecondary`: Blue glow for secondary actions
- `glowSuccess`: Green glow for success states

---

### Typography (16 size levels)

#### Font Sizes
- `xs`: 10px - Tiny labels, badges
- `sm`: 12px - Small text, captions
- `base`: 14px - Body text
- `md`: 15px - Medium body text
- `lg`: 16px - Large body text
- `xl`: 18px - Subheadings
- `2xl`: 20px - H4 headings
- `3xl`: 24px - H3 headings
- `4xl`: 28px - H2 headings
- `5xl`: 32px - H1 headings
- `6xl`: 48px - Hero titles

#### Font Weights
- `normal`: 400 - Regular body text
- `medium`: 600 - Emphasized text, labels
- `bold`: 700 - Headings, buttons
- `extrabold`: 800 - Hero headings

#### Line Heights
- `tight`: 1.2 - Headings
- `normal`: 1.5 - Body text
- `relaxed`: 1.6 - Reading text
- `loose`: 2.0 - Spacious text

---

### Motion (Animation Timing)

#### Durations
- `instant`: 0ms - No animation (accessibility)
- `fast`: 120ms - Quick interactions (button press)
- `normal`: 200ms - Standard transitions
- `slow`: 320ms - Emphasized transitions
- `slower`: 500ms - Modal open/close
- `slowest`: 800ms - Hero animations

#### Easing Functions
- `easeOut`: [0.4, 0, 0.2, 1] - Entrances, expansions
- `easeIn`: [0.4, 0, 1, 1] - Exits, collapses
- `easeInOut`: [0.4, 0, 0.2, 1] - Two-way transitions
- `sharp`: [0.4, 0, 0.6, 1] - Quick, decisive actions

---

## Accessibility

### Minimum Standards
- **Tap Target Size**: 44px minimum (WCAG AA)
- **Focus Indicators**: 2px visible outline with 2px offset
- **Color Contrast**: All text meets WCAG AA (4.5:1 body, 3:1 large text)
- **Reduced Motion**: `prefersReducedMotion` hook disables animations

---

## Implementation Status

### ✅ Completed
- [x] `src/theme/tokens.ts` - All design tokens defined
- [x] `src/theme/index.ts` - Theme provider and useTheme() hook
- [x] Installed `lucide-react-native` for icons
- [x] Installed `react-native-svg` for icon rendering
- [x] Installed `react-native-reanimated` for animations
- [x] Installed `moti` for declarative animations

### 🚧 In Progress
- [ ] Extract 10 key brand SVG icons from website
- [ ] Create unified Icon component wrapper
- [ ] Build core UI components (Button, Card, Badge, Input, etc.)
- [ ] Create usePrefersReducedMotion accessibility hook
- [ ] Theme main tab screens (Home, Services, Shop, Account)

### 📋 Planned
- [ ] Add motion to hero sections (carousel/stack transitions)
- [ ] Implement button press animations with haptics
- [ ] Add card entrance animations (staggered fade-in)
- [ ] Create skeleton shimmer loading states
- [ ] Theme booking flow screens
- [ ] Theme shop/checkout flow screens
- [ ] Theme detail screens
- [ ] Performance optimization (memoization, getItemLayout)
- [ ] Cross-platform testing (iOS/Android)
- [ ] A11y audit with VoiceOver/TalkBack

---

## Usage Examples

### Accessing Theme
```typescript
import { useTheme } from '../theme';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.darkBg }}>
      <Text style={{ color: theme.colors.textPrimary }}>
        Hello Physiosmetic
      </Text>
    </View>
  );
};
```

### Using Helpers
```typescript
import { helpers } from '../theme';

const styles = StyleSheet.create({
  container: {
    padding: helpers.spacing('base'), // 16px
    borderRadius: helpers.radius('lg'), // 16px
    ...helpers.shadow('md'), // Medium shadow
  },
  text: {
    color: helpers.colorWithOpacity('#F37021', 0.8), // Orange at 80%
  },
});
```

---

## Design Decisions

### Why Dark Mode Only?
- **Brand Identity**: Futuristic medical tech aesthetic requires dark backgrounds
- **Website Consistency**: Website is dark-only, app should match
- **Reduced Scope**: Allows faster implementation, can add light mode later
- **Visual Impact**: Glows and glassmorphism look best on dark

### Why Orange Primary?
- **Brand Recognition**: #F37021 is established Physiosmetic brand color
- **Energy & Warmth**: Orange conveys energy, positivity, action
- **Medical Context**: Less clinical than blue-only, more approachable

### Why Glassmorphism?
- **Modern Aesthetic**: Aligns with 2024-2025 design trends
- **Depth & Layering**: Creates visual hierarchy naturally
- **Premium Feel**: Translucent blurs suggest quality and sophistication

---

## File Structure

```
src/
├── theme/
│   ├── tokens.ts         # Design token definitions
│   └── index.ts          # Theme provider and helpers
├── components/
│   └── ui/               # Themed UI components (Button, Card, etc.)
├── icons/
│   ├── extracted/        # Brand SVG icons from website
│   └── index.tsx         # Unified Icon component
└── hooks/
    └── usePrefersReducedMotion.ts  # Accessibility hook
```

---

## Migration Strategy

### Phase 1: Foundation (Complete)
- Theme tokens defined
- Theme provider created
- Libraries installed

### Phase 2: Components (In Progress)
- Build core UI components
- Create Icon system
- Add animation helpers

### Phase 3: Screens (Planned)
- Incremental rollout: Main tabs → Flows → Details
- Preserve business logic, update UI only
- Test each phase before proceeding

---

## Notes for Developers

1. **Always use theme colors** - Never hardcode colors
2. **Use spacing scale** - Avoid magic numbers for padding/margin
3. **Check reduced motion** - Respect accessibility preferences
4. **44px minimum** - All tap targets must meet accessibility standards
5. **Test on device** - Glassmorphism and shadows look different on real devices
6. **Performance matters** - Memoize components, avoid re-renders
7. **Android compatibility** - Test blur effects, may need fallbacks

---

**Last Updated**: 2025-11-10
**Next Review**: After Phase 2 completion