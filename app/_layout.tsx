import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { registerForPushNotificationsAsync, setupNotifications } from '@/lib/notifications';

// Configura el handler de notificaciones (stub en web, real en nativo)
setupNotifications();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Pantalla principal de Tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Pantalla de Login */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* Pantallas secundarias fuera de las tabs */}
        <Stack.Screen name="ingreso-lotes" options={{ headerShown: false }} />
        <Stack.Screen name="consulta-stock" options={{ headerShown: false }} />
        <Stack.Screen name="salidas-descarte" options={{ headerShown: false }} />
        <Stack.Screen name="alertas-vencimiento" options={{ headerShown: false }} />
        <Stack.Screen name="gestion-usuarios" options={{ headerShown: false }} />
        <Stack.Screen name="historial-movimientos" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}