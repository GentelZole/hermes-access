import {
  Amiri_400Regular,
  Amiri_700Bold,
} from '@expo-google-fonts/amiri';
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
  Tajawal_800ExtraBold,
} from '@expo-google-fonts/tajawal';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { initLang } from '@/i18n/strings';
import { initConnection } from '@/gateway/store';
import { useTheme } from '@/theme/store';

SplashScreen.preventAutoHideAsync();
// Restore persisted language (English default, Arabic optional)
initLang();
// Restore persisted agent connection (baseUrl/label; token lives in SecureStore)
void initConnection();

export default function RootLayout() {
  const theme = useTheme();

  const [fontsLoaded] = useFonts({
    Amiri_400Regular,
    Amiri_700Bold,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Tajawal_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // Bridge our tokens into expo-router's ThemeProvider (nav surfaces)
  const navTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.dark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.bg,
      card: theme.tabBarBg,
      text: theme.text,
      primary: theme.accent,
      border: theme.border,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="setup"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Pair Device',
            headerStyle: { backgroundColor: theme.tabBarBg },
            headerTintColor: theme.text,
          }}
        />
        <Stack.Screen
          name="session"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="voice"
          options={{ headerShown: false }}
        />
      </Stack>
    </ThemeProvider>
  );
}
