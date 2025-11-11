/**
 * usePrefersReducedMotion Hook
 * Detects if user has enabled "Reduce Motion" in device accessibility settings
 * Components should disable animations when this returns true
 *
 * Usage:
 * const prefersReducedMotion = usePrefersReducedMotion();
 * return <Skeleton animate={!prefersReducedMotion} />
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const usePrefersReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial state
    const checkReducedMotion = async () => {
      try {
        const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
        setPrefersReducedMotion(isReduceMotionEnabled);
      } catch (error) {
        console.warn('Failed to check reduce motion preference:', error);
        // Default to false if unable to determine
        setPrefersReducedMotion(false);
      }
    };

    checkReducedMotion();

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isReduceMotionEnabled: boolean) => {
        setPrefersReducedMotion(isReduceMotionEnabled);
      }
    );

    // Cleanup
    return () => {
      subscription.remove();
    };
  }, []);

  return prefersReducedMotion;
};

export default usePrefersReducedMotion;
