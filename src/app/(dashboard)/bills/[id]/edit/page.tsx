'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import RecurrenceSelector from '@/components/RecurrenceSelector';

interface Bill {
  id: number;
  name: string;
  amount: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue';
  recurrenceEnabled: boolean;
  recurrenceFrequency: string | null;
  recurrenceInterval: number | null;
  recurrenceDayOfMonth: number | null;
}

export default function EditBillPage() {
  const router = useRouter();
  const params = useParams();
  const billId = params.id as string;
  const [bill, setBill] = useState<Bill | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: '',
  });
  const [recurrence, setRecurrence] = useState<{
    enabled: boolean;
    frequency: string;
    interval: number;
    dayOfMonth?: number;
  }>({
    enabled: false,
    frequency: 'monthly',
    interval: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const response = await fetch(`/api/bills/${billId}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch bill');
        }

        setBill(data.bill);
        setFormData({
          name: data.bill.name,
          amount: data.bill.amount,
          dueDate: data.bill.dueDate.split('T')[0],
        });
        setRecurrence({
          enabled: data.bill.recurrenceEnabled || false,
          frequency: data.bill.recurrenceFrequency || 'monthly',
          interval: data.bill.recurrenceInterval || 1,
          dayOfMonth: data.bill.recurrenceDayOfMonth || undefined,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch bill');
      } finally {
        setLoading(false);
      }
    };

    fetchBill();
  }, [billId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
        const response = await fetch(`/api/bills/${billId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            recurrenceEnabled: recurrence.enabled,
            recurrenceFrequency: recurrence.frequency,
            recurrenceInterval: recurrence.interval,
            recurrenceDayOfMonth: recurrence.dayOfMonth,
          }),
        });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update bill');
        setSubmitting(false);
        return;
      }

      router.push('/bills');
    } catch {
      setError('An error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error || 'Bill not found'}</div>
          <Link href="/bills" className="text-indigo-600 hover:text-indigo-800 text-lg font-medium">
            Back to Bills
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link
            href="/bills"
            className="text-indigo-600 hover:text-indigo-800 text-lg font-medium"
          >
            ← Back to Bills
          </Link>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Bill</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Bill Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-lg"
                placeholder="e.g., Electricity Bill"
                value={formData.name}
                onChange={handleChange}
                style={{ minHeight: '44px' }}
              />
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                Amount ($)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                className="appearance-none relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-lg"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                style={{ minHeight: '44px' }}
              />
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                required
                className="appearance-none relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-lg"
                value={formData.dueDate}
                onChange={handleChange}
                style={{ minHeight: '44px' }}
              />
            </div>

            <RecurrenceSelector
              enabled={recurrence.enabled}
              frequency={recurrence.frequency}
              interval={recurrence.interval}
              dayOfMonth={recurrence.dayOfMonth}
              onUpdate={setRecurrence}
            />

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/bills')}
                className="flex-1 bg-gray-200 text-gray-800 py-4 px-4 border border-transparent text-lg font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                style={{ minHeight: '48px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-indigo-600 text-white py-4 px-4 border border-transparent text-lg font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '48px' }}
              >
                {submitting ? 'Updating...' : 'Update Bill'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}