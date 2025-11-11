/**
 * Icon Component
 * Unified icon wrapper for lucide-react-native icons
 * Usage: <Icon name="Heart" size={24} color={theme.colors.primary} />
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

// Import common icons from lucide-react-native
import {
  Heart,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  User,
  Users,
  ShoppingCart,
  Package,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Search,
  Filter,
  Star,
  Menu,
  Settings,
  Home,
  Activity,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react-native';

// Icon name mapping
export const iconMap = {
  Heart,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  User,
  Users,
  ShoppingCart,
  Package,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  Search,
  Filter,
  Star,
  Menu,
  Settings,
  Home,
  Activity,
  MessageCircle,
} as const;

export type IconName = keyof typeof iconMap;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color,
  strokeWidth = 2,
  style,
}) => {
  const theme = useTheme();
  const IconComponent = iconMap[name];

  const iconColor = color || theme.colors.textPrimary;

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <IconComponent
        size={size}
        color={iconColor}
        strokeWidth={strokeWidth}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Icon;
