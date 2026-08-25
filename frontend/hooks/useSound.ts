import { useCallback } from 'react';

// A tiny base64 encoded "pop" sound to avoid external dependencies
const POP_SOUND_BASE64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAD/P/4/wA==";

export function useSound(audioUrl: string = POP_SOUND_BASE64) {
  const playSound = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        const audio = new Audio(audioUrl);
        audio.volume = 0.5;
        // The play() method returns a Promise
        await audio.play();
      }
    } catch (e) {
      console.warn('Audio play was blocked by browser autoplay policy:', e);
    }
  }, [audioUrl]);

  return playSound;
}
