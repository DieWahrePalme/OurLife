import { Caveat_700Bold, useFonts } from '@expo-google-fonts/caveat';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Palette } from '@/constants/theme';
import { useSettingsStore } from '@/features/settings/settings-store';

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Palette[scheme];
  const [fontsLoaded] = useFonts({ Caveat_700Bold });

  const settingsLoaded = useSettingsStore((state) => state.loaded);
  const loadSettings = useSettingsStore((state) => state.load);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (!fontsLoaded || !settingsLoaded) return null;

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
