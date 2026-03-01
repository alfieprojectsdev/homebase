import * as Notifications from 'expo-notifications';
import { getStoredToken } from './auth';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export async function registerForPushNotifications(): Promise<void> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notifications] Permission denied');
    return;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  const jwt = await getStoredToken();

  if (!jwt) return;

  try {
    const res = await fetch(`${API_URL}/api/notifications/expo-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ token: token.data }),
    });

    if (!res.ok) {
      console.error('[Notifications] Failed to register token:', res.status);
    }
  } catch (err) {
    console.error('[Notifications] Registration error:', err);
  }
}
