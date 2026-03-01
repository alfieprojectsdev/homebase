import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
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

function ChoreCard({ chore }: { chore: Chore }) {
  const isComplete = chore.progress >= 100;

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/chores/${chore.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`View chore: ${chore.title}`}
      style={{ minHeight: 72 }}
      className="bg-white border border-gray-200 rounded-xl p-4 mb-3 mx-4"
    >
      <Text className="text-lg font-bold text-gray-900 mb-1">{chore.title}</Text>

      {chore.description ? (
        <Text
          className="text-sm text-gray-500 mb-3"
          numberOfLines={2}
        >
          {chore.description}
        </Text>
      ) : null}

      <View className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
        <View
          style={{
            width: `${chore.progress}%`,
            backgroundColor: progressColor(chore.progress),
            height: '100%',
          }}
        />
      </View>

      <Text className="text-xs text-gray-500 mt-1">
        {isComplete ? 'Complete \u2713' : `${chore.progress}% complete`}
      </Text>
    </Pressable>
  );
}

export default function ChoresScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['chores'],
    queryFn: async () => {
      const res = await api.get<{ chores: Chore[] }>('/api/chores');
      return res.data;
    },
  });

  const chores = data?.chores ?? [];

  return (
    <>
      <Stack.Screen options={{ title: 'Chores', headerShown: true }} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center bg-gray-50">
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      ) : (
        <FlatList
          className="flex-1 bg-gray-50"
          data={chores}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ChoreCard chore={item} />}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-base text-gray-400">No chores found</Text>
            </View>
          }
        />
      )}
    </>
  );
}
