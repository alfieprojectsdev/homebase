import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  recurrenceEnabled?: boolean;
  recurrenceFrequency?: string;
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

function formatDueDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getUrgencyLabel(level?: string): string {
  if (level === 'critical') return 'Critical';
  if (level === 'high') return 'High';
  return 'Normal';
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
      }}
    >
      <Text style={{ fontSize: 14, color: '#6B7280', fontWeight: '500' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 12 }}>
        {value}
      </Text>
    </View>
  );
}

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: bill, isLoading, isError } = useQuery<Bill>({
    queryKey: ['bill', id],
    queryFn: () =>
      api.get<Bill>(`/api/bills/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });

  const markPaidMutation = useMutation({
    mutationFn: () =>
      api.post<Bill>(`/api/bills/${id}/pay`).then((r) => r.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bills'] });
      void queryClient.invalidateQueries({ queryKey: ['bill', id] });
      Alert.alert('Success', 'Marked as paid!');
    },
    onError: () => {
      Alert.alert('Error', 'Could not mark bill as paid. Please try again.');
    },
  });

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Bill Detail', headerShown: true }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#DC2626" />
        </View>
      </>
    );
  }

  if (isError || !bill) {
    return (
      <>
        <Stack.Screen options={{ title: 'Bill Detail', headerShown: true }} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
            Could not load bill details.
          </Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            style={{
              marginTop: 16,
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: 24,
            }}
          >
            <Text style={{ color: '#DC2626', fontSize: 16 }}>Go back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const daysUntilDue = Math.ceil(
    (new Date(bill.dueDate).getTime() - Date.now()) / 86400000
  );
  const bgColor = getUrgencyColor(daysUntilDue, bill.status);
  const textColor = getTextColor(daysUntilDue, bill.status);
  const formattedAmount = `₱${parseFloat(bill.amount).toLocaleString()}`;
  const isPaid = bill.status === 'paid';
  const isPending = markPaidMutation.isPending;

  return (
    <>
      <Stack.Screen options={{ title: bill.name, headerShown: true }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#F9FAFB' }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        {/* Header section */}
        <View
          style={{
            backgroundColor: bgColor,
            borderRadius: 16,
            padding: 24,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: textColor,
              marginBottom: 8,
            }}
          >
            {bill.name}
          </Text>
          <Text
            style={{
              fontSize: 40,
              fontWeight: 'bold',
              color: textColor,
              marginBottom: 12,
            }}
          >
            {formattedAmount}
          </Text>

          {/* Urgency badge */}
          <View style={{ flexDirection: 'row' }}>
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.15)',
                borderRadius: 6,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Text
                style={{
                  color: textColor,
                  fontSize: 13,
                  fontWeight: '600',
                }}
              >
                {getUrgencyLabel(bill.urgencyLevel)} Priority
              </Text>
            </View>
          </View>
        </View>

        {/* Details card */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <DetailRow
            label="Status"
            value={bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
          />
          <DetailRow
            label="Due date"
            value={formatDueDate(bill.dueDate)}
          />
          {bill.category !== undefined && bill.category.length > 0 && (
            <DetailRow
              label="Category"
              value={bill.category.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            />
          )}
          {bill.recurrenceEnabled === true && (
            <DetailRow
              label="Recurrence"
              value={
                bill.recurrenceFrequency
                  ? bill.recurrenceFrequency.charAt(0).toUpperCase() +
                    bill.recurrenceFrequency.slice(1)
                  : 'Recurring'
              }
            />
          )}
        </View>

        {/* Mark Paid button */}
        {isPaid ? (
          <View style={{ alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, color: '#16A34A', fontWeight: '600' }}>
              Already paid
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => markPaidMutation.mutate()}
            disabled={isPending}
            accessibilityRole="button"
            accessibilityLabel={isPending ? 'Marking as paid' : 'Mark as paid'}
            accessibilityState={{ disabled: isPending }}
            style={{
              backgroundColor: isPending ? '#86EFAC' : '#16A34A',
              borderRadius: 12,
              height: 56,
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>
              {isPending ? 'Saving...' : 'Mark Paid'}
            </Text>
          </Pressable>
        )}

        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={{
            marginTop: 16,
            minHeight: 44,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#6B7280', fontSize: 15 }}>Back</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
