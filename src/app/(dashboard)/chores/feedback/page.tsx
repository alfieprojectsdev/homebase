'use client';

import { useEffect, useState } from 'react';

interface FeedbackEntry {
  id: number;
  choreTitle: string;
  userName: string;
  feedbackType: string;
  reason?: string;
  createdAt: string;
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const response = await fetch('/api/chores/feedback');
      const data = await response.json();
      setFeedback(data.feedback);
    } catch (error) {
      console.error('Failed to fetch feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading feedback...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Feedback</h1>

      <div className="space-y-4">
        {feedback.map((entry) => (
          <div key={entry.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium">{entry.choreTitle}</p>
                <p className="text-sm text-gray-500">
                  {entry.userName} • {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize">
                {entry.feedbackType.replace('_', ' ')}
              </span>
            </div>
            {entry.reason && (
              <p className="text-gray-700 italic">{entry.reason}</p>
            )}
          </div>
        ))}
      </div>

      {feedback.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No feedback yet. Feedback will appear here when children mark chores as "N/A".
        </div>
      )}
    </div>
  );
}
