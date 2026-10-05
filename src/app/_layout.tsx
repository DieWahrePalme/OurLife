import { Caveat_700Bold, useFonts } from '@expo-google-fonts/caveat';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Palette } from '@/constants/theme';

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Palette[scheme];
  const [fontsLoaded] = useFonts({ Caveat_700Bold });

  if (!fontsLoaded) return null;

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
        <Stack.Screen name="goals/index" options={{ title: 'Goals', headerBackTitle: 'Back' }} />
        <Stack.Screen name="goals/[id]" options={{ title: '', headerBackTitle: 'Goals' }} />
      </Stack>
    </>
  );
}
