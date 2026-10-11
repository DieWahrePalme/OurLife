import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { CormorantGaramond_700Bold } from '@expo-google-fonts/cormorant-garamond';
import { Kalam_700Bold } from '@expo-google-fonts/kalam';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SkinBackground } from '@/components/skin-background';
import type { PaletteColors } from '@/constants/theme';
import type { Skin } from '@/constants/skins';
import { useGoalsStore } from '@/features/goals/goals-store';
import { PairScreen } from '@/features/space/pair-screen';
import { useSpaceStore } from '@/features/space/space-store';
import { useSettingsStore } from '@/features/settings/settings-store';
import { subscribeToTable } from '@/features/sync/realtime';
import { useColors, useScheme, useSkin } from '@/lib/use-theme';

/** The navigation draws its own screen background; it has to be see-through so the skin shows. */
const SEE_THROUGH_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent', card: 'transparent' },
};

/** Backdrop colour and pattern of the chosen skin, behind every screen. */
function SkinFrame({ skin, colors, children }: { skin: Skin; colors: PaletteColors; children: ReactNode }) {
  return (
    <View style={[styles.frame, { backgroundColor: colors.paper }]}>
      {skin.pattern ? <SkinBackground pattern={skin.pattern} /> : null}
      {children}
    </View>
  );
}

export default function RootLayout() {
  const scheme = useScheme();
  const skin = useSkin();
  const colors = useColors();
  const statusBar = skin.statusBar[scheme];
  const [fontsLoaded] = useFonts({ Caveat_700Bold, CormorantGaramond_700Bold, Kalam_700Bold });

  const settingsLoaded = useSettingsStore((state) => state.loaded);
  const loadSettings = useSettingsStore((state) => state.load);

  const spaceStatus = useSpaceStore((state) => state.status);
  const initSpace = useSpaceStore((state) => state.init);
  const loadGoals = useGoalsStore((state) => state.load);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // The shared space is read after the local settings, so the shared start date wins.
  useEffect(() => {
    if (settingsLoaded) initSpace();
  }, [settingsLoaded, initSpace]);

  // The other phone adds or removes a goal: refresh the list.
  useEffect(() => (spaceStatus === 'ready' ? subscribeToTable('goals', loadGoals) : undefined), [spaceStatus, loadGoals]);

  if (!fontsLoaded || !settingsLoaded || spaceStatus === 'loading') return null;

  if (spaceStatus === 'pairing' || spaceStatus === 'created' || spaceStatus === 'error') {
    return (
      <SkinFrame skin={skin} colors={colors}>
        <StatusBar style={statusBar} />
        <PairScreen />
      </SkinFrame>
    );
  }

  return (
    <SkinFrame skin={skin} colors={colors}>
      <StatusBar style={statusBar} />
      <ThemeProvider value={SEE_THROUGH_THEME}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: skin.pattern ? 'transparent' : colors.paper },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="day/[n]" options={{ title: '', headerBackTitle: 'Back' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', headerBackTitle: 'Back' }} />
        <Stack.Screen name="goals/index" options={{ title: 'Goals', headerBackTitle: 'Back' }} />
        <Stack.Screen name="goals/[id]" options={{ title: '', headerBackTitle: 'Goals' }} />
      </Stack>
      </ThemeProvider>
    </SkinFrame>
  );
}

const styles = StyleSheet.create({ frame: { flex: 1 } });
