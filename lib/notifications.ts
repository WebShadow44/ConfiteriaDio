import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permiso de notificaciones no otorgado');
    return;
  }
}

export async function enviarNotificacionInmediata(titulo: string, mensaje: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: mensaje,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: {
      channelId: 'default',
    } as any,
  });
}

export async function programarNotificacionesDiarias(vencidos: number, stockBajo: number) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (vencidos > 0 || stockBajo > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🕒 Reporte: Confitería Dioselarl',
        body: `Vencimientos: ${vencidos} | Stock bajo: ${stockBajo}.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        channelId: 'default',
        hour: 6,
        minute: 0,
        repeats: true,
      } as any,
    });
  }
}
