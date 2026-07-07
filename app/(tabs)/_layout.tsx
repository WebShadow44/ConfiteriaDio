import { Tabs, Redirect } from 'expo-router';
import React from 'react';

import { useAuthStore } from '@/store/authStore';

/* Configuracion del sistema de tabs. La barra inferior se oculta completamente
   ya que la navegacion se gestiona desde los botones del dashboard. */
export default function TabLayout() {
  const { isLoggedIn } = useAuthStore();

  if (!isLoggedIn) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{ title: 'Dashboard' }}
      />
    </Tabs>
  );
}
