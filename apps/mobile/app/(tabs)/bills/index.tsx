import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Bill {
  id: number;
  name: string;
  amount: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  category?: string;
  residenceId?: number;
  urgencyScore?: number;
  urgencyLevel?: 'critical' | 'high' | 'normal';
}

function getUrgencyColor(daysUntilDue: number, status: string): string {
  if (status === 'paid') return '#F3F4F6';
  if (status === 'overdue' || daysUntilDue < 0) return '#DC2626';
  if (daysUntilDue <= 1) return '#EA580C';
  if (daysUntilDue <= 3) return '#FB923C';
  if (daysUntilDue <= 7) return '#FCD34D';
  return '#F3F4F6';
}

function getTextColor(daysUntilDue: number, status: string): string {
  if (status === 'paid') return '#374151';
  if (daysUntilDue <= 3 || status === 'overdue') return '#FFFFFF';
  return '#374151';
}

function getDueDateLabel(daysUntilDue: number, status: string): string {
  if (status === 'overdue' || daysUntilDue < 0) return 'Overdue';
  if (daysUntilDue === 0) return 'Due today';
  if (daysUntilDue === 1) return 'Due tomorrow';
  return `Due in ${daysUntilDue} days`;
}

function BillCard({ bill }: { bill: Bill }) {
  const daysUntilDue = Math.ceil(
    (new Date(bill.dueDate).getTime() - Date.now()) / 86400000
  );
  const bgColor = getUrgencyColor(daysUntilDue, bill.status);
  const textColor = getTextColor(daysUntilDue, bill.status);
  const formattedAmount = `₱${parseFloat(bill.amount).toLocaleString()}`;

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/bills/${bill.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${bill.name}, ${formattedAmount}, ${getDueDateLabel(daysUntilDue, bill.status)}`}
      style={{
        backgroundColor: bgColor,
        minHeight: 72,
        padding: 16,
        marginBottom: 8,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: textColor,
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {bill.name}
        </Text>
        <Text style={{ fontSize: 14, color: textColor, opacity: 0.85 }}>
          {getDueDateLabel(daysUntilDue, bill.status)}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text
          style={{ fontSize: 18, fontWeight: 'bold', color: textColor }}
        >
          {formattedAmount}
        </Text>
        {bill.status === 'paid' && (
          <View
            style={{
              backgroundColor: '#16A34A',
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>
              PAID
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function sortBills(bills: Bill[]): Bill[] {
  return [...bills].sort((a, b) => {
    const daysA = Math.ceil(
      (new Date(a.dueDate).getTime() - Date.now()) / 86400000
    );
    const daysB = Math.ceil(
      (new Date(b.dueDate).getTime() - Date.now()) / 86400000
    );

    const isOverdueA = a.status === 'overdue' || daysA < 0;
    const isOverdueB = b.status === 'overdue' || daysB < 0;

    if (isOverdueA && !isOverdueB) return -1;
    if (!isOverdueA && isOverdueB) return 1;
    return daysA - daysB;
  });
}

export default function BillsScreen() {
  const { data, isLoading, isRefetching, refetch } = useQuery<Bill[]>({
    queryKey: ['bills'],
    queryFn: () =>
      api.get<{ bills: Bill[] }>('/api/bills').then((r) => r.data.bills),
  });

  const sorted = data ? sortBills(data) : [];

  return (
    <>
      <Stack.Screen options={{ title: 'Bills', headerShown: true }} />
      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <BillCard bill={item} />}
          contentContainerStyle={{
            padding: 16,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor="#DC2626"
            />
          }
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: 200,
              }}
            >
              <Text style={{ fontSize: 16, color: '#6B7280' }}>
                No bills found
              </Text>
            </View>
          }
        />
      )}
    </>
  );
}
