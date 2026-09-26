/**
 * Theme store — the switchable identity system.
 * Persists the user's chosen direction to AsyncStorage so it survives restarts.
 * Default: 'aurum' (the Hermes-gold continuity direction).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { THEMES, ThemeId, ThemeTokens } from './tokens';

interface ThemeState {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: 'aurum',
      setThemeId: (themeId) => set({ themeId }),
    }),
    {
      name: 'hermes-access-theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Convenience: the full active token set. */
export function useTheme(): ThemeTokens {
  const themeId = useThemeStore((s) => s.themeId);
  return THEMES[themeId];
}

/** Non-hook accessor for places outside React (rare). */
export function getActiveTheme(): ThemeTokens {
  return THEMES[useThemeStore.getState().themeId];
}
