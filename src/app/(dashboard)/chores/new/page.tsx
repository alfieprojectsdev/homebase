'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewChorePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isRecurring: false,
    recurrencePattern: 'daily',
    reminderEnabled: true,
    reminderFrequency: 'daily',
    activeStartHour: 5,
    activeEndHour: 21,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to create chore');

      router.push('/chores');
    } catch (err) {
      setError('Failed to create chore. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <Link href="/chores" className="text-blue-600 hover:underline">
          ← Back to Chores
        </Link>
        <h1 className="text-3xl font-bold mt-2">Add New Chore</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-md">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-bold mb-2">Chore Title</label>
          <input
            type="text"
            name="title"
            required
            value={formData.title}
            onChange={handleChange}
            className="w-full p-4 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:ring-blue-500"
            placeholder="e.g., Wash Dishes"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-2">Description (Optional)</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
            placeholder="Details about the chore..."
            rows={3}
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isRecurring"
              checked={formData.isRecurring}
              onChange={handleChange}
              className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="font-bold">Recurring Chore</span>
          </label>
        </div>

        {formData.isRecurring && (
          <div>
            <label className="block text-sm font-bold mb-2">Recurrence Pattern</label>
            <select
              name="recurrencePattern"
              value={formData.recurrencePattern}
              onChange={handleChange}
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}

        <div className="border-t pt-6">
          <label className="flex items-center gap-2 cursor-pointer mb-4">
            <input
              type="checkbox"
              name="reminderEnabled"
              checked={formData.reminderEnabled}
              onChange={handleChange}
              className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="font-bold">Enable Reminders</span>
          </label>

          {formData.reminderEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">Frequency</label>
                <select
                  name="reminderFrequency"
                  value={formData.reminderFrequency}
                  onChange={handleChange}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg"
                >
                  <option value="hourly">Hourly</option>
                  <option value="every_2_hours">Every 2 Hours</option>
                  <option value="daily">Once Daily</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold mb-1">Start Hour</label>
                  <input
                    type="number"
                    name="activeStartHour"
                    min="0"
                    max="23"
                    value={formData.activeStartHour}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">End Hour</label>
                  <input
                    type="number"
                    name="activeEndHour"
                    min="0"
                    max="23"
                    value={formData.activeEndHour}
                    onChange={handleChange}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-xl hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creating...' : 'Create Chore'}
        </button>
      </form>
    </div>
  );
}
