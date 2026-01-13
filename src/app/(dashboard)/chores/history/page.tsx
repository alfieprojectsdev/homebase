'use client';

import { useEffect, useState } from 'react';

export default function ChoreHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/chores/history');
      const data = await response.json();
      setHistory(data.history);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading history...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Chore History</h1>

      <div className="space-y-4">
        {history.map((entry) => (
          <div key={entry.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{entry.choreTitle}</p>
                <p className="text-sm text-gray-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium capitalize">
                  {entry.action.replace('_', ' ')}
                </span>
                {entry.previousProgress !== undefined && (
                  <p className="text-sm text-gray-500">
                    {entry.previousProgress}% → {entry.newProgress}%
                  </p>
                )}
              </div>
            </div>
            {entry.notes && (
              <p className="mt-2 text-sm text-gray-600 italic">{entry.notes}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
