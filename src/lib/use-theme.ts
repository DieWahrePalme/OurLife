import { useColorScheme } from 'react-native';

import { skinFor, type Skin } from '@/constants/skins';
import type { PaletteColors } from '@/constants/theme';
import { useSettingsStore } from '@/features/settings/settings-store';

/** "light" or "dark": the person's choice in Settings, or the phone's setting when it is on "system". */
export function useScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const appearance = useSettingsStore((state) => state.appearance);
  if (appearance === 'light' || appearance === 'dark') return appearance;
  return system === 'dark' ? 'dark' : 'light';
}

/** The look chosen for this phone. */
export function useSkin(): Skin {
  return skinFor(useSettingsStore((state) => state.skin));
}

export function useColors(): PaletteColors {
  return useSkin().palettes[useScheme()];
}
