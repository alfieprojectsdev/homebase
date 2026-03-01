import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { loginUser } from '@/lib/auth';
import { registerForPushNotifications } from '@/lib/notifications';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isValid = email.trim().length > 0 && password.trim().length > 0;
  const isDisabled = !isValid || loading;

  async function handleLogin() {
    if (isDisabled) return;
    setError('');
    setLoading(true);
    try {
      await loginUser(email.trim(), password);
      router.replace('/(tabs)/bills');
      // Fire and forget — do not await
      void registerForPushNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 py-12 justify-center">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Homebase
          </Text>
          <Text className="text-base text-gray-500 mb-8">
            Household management
          </Text>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Email
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 bg-white"
              style={{ minHeight: 48 }}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
              editable={!loading}
              returnKeyType="next"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Password
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900 bg-white"
              style={{ minHeight: 48 }}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {error.length > 0 && (
            <Text className="text-red-600 text-sm mb-4" accessibilityRole="alert">
              {error}
            </Text>
          )}

          <Pressable
            onPress={handleLogin}
            disabled={isDisabled}
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Logging in' : 'Log in'}
            accessibilityState={{ disabled: isDisabled }}
            className={`rounded-lg py-4 items-center mb-4 ${
              isDisabled ? 'bg-red-300' : 'bg-red-600'
            }`}
            style={{ minHeight: 56 }}
          >
            <Text className="text-white font-semibold text-lg">
              {loading ? 'Logging in...' : 'Log in'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(auth)/signup')}
            accessibilityRole="link"
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text className="text-red-600 text-center text-base">
              Don&apos;t have an account? Sign up
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
