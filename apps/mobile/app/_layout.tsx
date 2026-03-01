import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { addNotificationResponseReceivedListener } from 'expo-notifications';
import { router } from 'expo-router';
import '../global.css';

export default function RootLayout() {
  useEffect(() => {
    const sub = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as
        | { billId?: unknown; choreId?: unknown }
        | undefined;
      const billId = data?.billId;
      const choreId = data?.choreId;
      if (billId) router.push(`/(tabs)/bills/${billId}`);
      else if (choreId) router.push(`/(tabs)/chores/${choreId}`);
    });
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
