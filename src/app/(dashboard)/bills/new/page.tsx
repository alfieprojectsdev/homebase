'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RecurrenceSelector from '@/components/RecurrenceSelector';
import SmartSuggestions from '@/components/SmartSuggestions';

export default function NewBillPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    dueDate: '',
    accountNumber: '',
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSuggestionApply = (billName: string) => {
    setFormData(prev => ({ ...prev, name: billName }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/bills', {
        method: 'POST',
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
        setError(data.error || 'Failed to create bill');
        setLoading(false);
        return;
      }

      router.push('/bills');
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Add New Bill</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <SmartSuggestions onApply={handleSuggestionApply} />

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
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Account Number / Code (Optional)
              </label>
              <input
                id="accountNumber"
                name="accountNumber"
                type="text"
                className="appearance-none relative block w-full px-3 py-4 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-lg"
                placeholder="e.g., 123456789"
                value={formData.accountNumber}
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
                disabled={loading}
                className="flex-1 bg-indigo-600 text-white py-4 px-4 border border-transparent text-lg font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '48px' }}
              >
                {loading ? 'Creating...' : 'Create Bill'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
