'use client';

import { useEffect, useState } from 'react';

interface StreakEntry {
  userId: number;
  userName: string;
  totalStreaks: number;
  longestStreak: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<StreakEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/chores/leaderboard');
      const data = await response.json();
      setLeaderboard(data.leaderboard);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading leaderboard...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Leaderboard</h1>

      <div className="space-y-3">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.userId}
            className={`flex items-center justify-between bg-white rounded-lg shadow p-4 ${
              index === 0 ? 'border-2 border-yellow-400' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-gray-400">
                {index + 1}
              </div>
              <div>
                <p className="font-medium text-lg">{entry.userName}</p>
                <p className="text-sm text-gray-500">
                  Longest streak: {entry.longestStreak} days
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {entry.totalStreaks}
              </p>
              <p className="text-sm text-gray-500">current streaks</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
