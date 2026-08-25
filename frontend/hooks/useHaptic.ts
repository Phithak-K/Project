import { useCallback } from 'react';

export function useHaptic() {
  const triggerHaptic = useCallback((pattern: number | number[] = 50) => {
    try {
      if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined' && 'vibrate' in window.navigator) {
        window.navigator.vibrate(pattern);
      }
    } catch (e) {
      console.warn('Haptic feedback not supported or blocked:', e);
    }
  }, []);

  return triggerHaptic;
}
