import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { getMe, logoutUser, type AuthUser } from '@/lib/auth';
import { registerForPushNotifications } from '@/lib/notifications';

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '600',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 24,
        marginBottom: 8,
      }}
    >
      {label}
    </Text>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
      }}
    >
      <Text style={{ fontSize: 16, color: '#4B5563' }}>{label}</Text>
      <Text style={{ fontSize: 16, color: '#111827', fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [pushRegistered, setPushRegistered] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingUser(true);
    getMe()
      .then((u) => {
        if (mounted) setUser(u);
      })
      .catch(() => {
        // silently ignore — user stays null
      })
      .finally(() => {
        if (mounted) setLoadingUser(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function handleRegisterPush() {
    try {
      await registerForPushNotifications();
      setPushRegistered(true);
      Alert.alert('Success', 'Push notifications registered.');
    } catch {
      Alert.alert('Error', 'Failed to register push notifications.');
    }
  }

  function handleLogout() {
    Alert.alert('Log out?', 'You will need to log in again.', [
      { text: 'Cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logoutUser();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>

      {/* Account section */}
      <SectionHeader label="Account" />
      <View className="bg-white">
        {loadingUser ? (
          <ReadOnlyRow label="Name" value="Loading..." />
        ) : (
          <>
            <ReadOnlyRow label="Name" value={user?.name ?? '—'} />
            <ReadOnlyRow label="Email" value={user?.email ?? '—'} />
            <ReadOnlyRow label="Role" value={user?.role ?? '—'} />
            <ReadOnlyRow
              label="Organization ID"
              value={user?.orgId != null ? String(user.orgId) : '—'}
            />
          </>
        )}
      </View>

      {/* Notifications section */}
      <SectionHeader label="Notifications" />
      <View className="bg-white">
        <Pressable
          onPress={() => { void handleRegisterPush(); }}
          accessibilityRole="button"
          accessibilityLabel="Register for push notifications"
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6',
            minHeight: 44,
          }}
        >
          <Text style={{ fontSize: 16, color: '#4B5563' }}>Push Notifications</Text>
          <Text style={{ fontSize: 16, color: '#111827', fontWeight: '500' }}>
            {pushRegistered ? 'Registered' : 'Not registered'}
          </Text>
        </Pressable>
      </View>

      {/* Actions section */}
      <SectionHeader label="Actions" />
      <Pressable
        onPress={handleLogout}
        accessibilityRole="button"
        accessibilityLabel="Log out"
        style={{
          borderWidth: 1,
          borderColor: '#DC2626',
          borderRadius: 12,
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <Text style={{ color: '#DC2626', fontSize: 16, fontWeight: '600' }}>Log out</Text>
      </Pressable>

    </ScrollView>
  );
}
