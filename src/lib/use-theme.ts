import { useColorScheme } from 'react-native';

import { Palette, type PaletteColors } from '@/constants/theme';
import { useSettingsStore } from '@/features/settings/settings-store';

/** "light" or "dark": the person's choice in Settings, or the phone's setting when it is on "system". */
export function useScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const appearance = useSettingsStore((state) => state.appearance);
  if (appearance === 'light' || appearance === 'dark') return appearance;
  return system === 'dark' ? 'dark' : 'light';
}

export function useColors(): PaletteColors {
  return Palette[useScheme()];
}
