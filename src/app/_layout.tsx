import { Caveat_700Bold, useFonts } from '@expo-google-fonts/caveat';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Palette } from '@/constants/theme';
import { useGoalsStore } from '@/features/goals/goals-store';
import { PairScreen } from '@/features/space/pair-screen';
import { useSpaceStore } from '@/features/space/space-store';
import { useSettingsStore } from '@/features/settings/settings-store';
import { subscribeToTable } from '@/features/sync/realtime';
import { useScheme } from '@/lib/use-theme';

export default function RootLayout() {
  const scheme = useScheme();
  const colors = Palette[scheme];
  const [fontsLoaded] = useFonts({ Caveat_700Bold });

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
      <>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <PairScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.paper },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="day/[n]" options={{ title: '', headerBackTitle: 'Back' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings', headerBackTitle: 'Back' }} />
        <Stack.Screen name="goals/index" options={{ title: 'Goals', headerBackTitle: 'Back' }} />
        <Stack.Screen name="goals/[id]" options={{ title: '', headerBackTitle: 'Goals' }} />
      </Stack>
    </>
  );
}
