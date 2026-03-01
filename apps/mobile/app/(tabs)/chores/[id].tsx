import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Chore {
  id: number;
  title: string;
  description?: string;
  progress: number;
  assignedTo?: string;
  residenceId?: number;
  reminderEnabled?: boolean;
  nextReminderAt?: string;
  orgId: number;
}

function progressColor(progress: number): string {
  if (progress >= 100) return '#16A34A';
  if (progress >= 50) return '#FB923C';
  return '#DC2626';
}

export default function ChoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['chore', id],
    queryFn: async () => {
      const res = await api.get<{ chore: Chore }>(`/api/chores/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });

  const chore = data?.chore;

  const invalidateQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['chores'] });
    await queryClient.invalidateQueries({ queryKey: ['chore', id] });
  };

  const progressMutation = useMutation({
    mutationFn: async (progress: number) => {
      const res = await api.patch<{ chore: Chore }>(`/api/chores/${id}`, { progress });
      return res.data;
    },
    onSuccess: () => {
      void invalidateQueries();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update progress. Please try again.');
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch<{ chore: Chore }>(`/api/chores/${id}`, { progress: 100 });
      return res.data;
    },
    onSuccess: () => {
      void invalidateQueries();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to mark chore complete. Please try again.');
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async () => {
      const snoozedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await api.post(`/api/chores/${id}/feedback`, {
        feedbackType: 'snooze',
        snoozedUntil,
      });
      return res.data;
    },
    onSuccess: () => {
      Alert.alert('Snoozed', 'This chore has been snoozed for 24 hours.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to snooze chore. Please try again.');
    },
  });

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Chore Detail', headerShown: true }} />
        <View className="flex-1 items-center justify-center bg-gray-50">
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      </>
    );
  }

  if (!chore) {
    return (
      <>
        <Stack.Screen options={{ title: 'Chore Detail', headerShown: true }} />
        <View className="flex-1 items-center justify-center bg-gray-50">
          <Text className="text-base text-gray-400">Chore not found</Text>
        </View>
      </>
    );
  }

  const isComplete = chore.progress >= 100;
  const isMutating =
    progressMutation.isPending || completeMutation.isPending || snoozeMutation.isPending;

  return (
    <>
      <Stack.Screen options={{ title: chore.title, headerShown: true }} />
      <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>

        <Text className="text-2xl font-bold text-gray-900 mb-2">{chore.title}</Text>

        {chore.description ? (
          <Text className="text-base text-gray-600 mb-6">{chore.description}</Text>
        ) : null}

        {/* Progress section */}
        <View className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <Text className="text-base font-semibold text-gray-700 mb-3">
            {isComplete ? 'Complete \u2713' : `${chore.progress}% complete`}
          </Text>

          {/* Large progress bar */}
          <View
            className="bg-gray-200 rounded-full overflow-hidden mb-4"
            style={{ height: 16 }}
          >
            <View
              style={{
                width: `${chore.progress}%`,
                backgroundColor: progressColor(chore.progress),
                height: '100%',
              }}
            />
          </View>

          {/* +25% button */}
          <Pressable
            onPress={() => {
              if (!chore) return;
              progressMutation.mutate(Math.min(chore.progress + 25, 100));
            }}
            disabled={isMutating || isComplete}
            accessibilityRole="button"
            accessibilityLabel="Add 25 percent progress"
            accessibilityState={{ disabled: isMutating || isComplete }}
            className={`border rounded-xl items-center justify-center mb-3 ${
              isMutating || isComplete
                ? 'border-gray-200'
                : 'border-gray-400'
            }`}
            style={{ minHeight: 48 }}
          >
            <Text
              className={`text-base font-semibold ${
                isMutating || isComplete ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              +25%
            </Text>
          </Pressable>

          {/* Mark Complete button — hidden when already complete */}
          {!isComplete && (
            <Pressable
              onPress={() => completeMutation.mutate()}
              disabled={isMutating}
              accessibilityRole="button"
              accessibilityLabel="Mark chore complete"
              accessibilityState={{ disabled: isMutating }}
              className={`rounded-xl items-center justify-center ${
                isMutating ? 'bg-green-300' : 'bg-green-600'
              }`}
              style={{ minHeight: 56, width: '100%' }}
            >
              <Text className="text-white font-bold text-lg">
                {completeMutation.isPending ? 'Marking complete...' : 'Mark Complete'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Snooze button */}
        <Pressable
          onPress={() => snoozeMutation.mutate()}
          disabled={isMutating}
          accessibilityRole="button"
          accessibilityLabel="Snooze this chore for 24 hours"
          accessibilityState={{ disabled: isMutating }}
          className={`border rounded-xl items-center justify-center ${
            isMutating ? 'border-gray-200' : 'border-gray-400'
          }`}
          style={{ minHeight: 48 }}
        >
          <Text
            className={`text-base font-semibold ${
              isMutating ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            {snoozeMutation.isPending ? 'Snoozing...' : 'Snooze 24 hours'}
          </Text>
        </Pressable>

      </ScrollView>
    </>
  );
}
