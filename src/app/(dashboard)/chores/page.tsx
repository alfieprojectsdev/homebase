'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChoreCard from '@/components/chores/ChoreCard';
import ChoreCardJunior from '@/components/chores/ChoreCardJunior';
import ChoreCardTeen from '@/components/chores/ChoreCardTeen';
import ChoreCardSteps from '@/components/chores/ChoreCardSteps';
import Link from 'next/link';

export default function ChoresPage() {
  const [chores, setChores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchChores();
  }, []);

  const fetchChores = async () => {
    try {
      const res = await fetch('/api/chores');
      if (res.ok) {
        const data = await res.json();
        setChores(data.chores);
      }
    } catch (error) {
      console.error('Failed to fetch chores', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = async (id: number, progress: number) => {
    try {
      const res = await fetch(`/api/chores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      });

      if (res.ok) {
        fetchChores(); // Refresh to update streaks/history
      }
    } catch (error) {
      console.error('Failed to update progress', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this chore?')) return;

    try {
      const res = await fetch(`/api/chores/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setChores(chores.filter(c => c.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete chore', error);
    }
  };

  if (loading) return <div className="p-8 text-center text-xl">Loading chores... 🧹</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Chores</h1>
        <Link
          href="/chores/new"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 transition-colors"
        >
          Add Chore
        </Link>
      </div>

      <div className="grid gap-6">
        {chores.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <p className="text-xl text-gray-500 mb-4">No chores yet!</p>
            <Link href="/chores/new" className="text-blue-600 font-bold hover:underline">
              Create your first chore
            </Link>
          </div>
        ) : (
          chores.map((chore) => {
            // Determine which card variant to use
            // In a real app, this might be based on user preference or age group
            // For now, we cycle through them or detect features

            if (chore.steps) {
              return (
                <ChoreCardSteps
                  key={chore.id}
                  chore={chore}
                  onStepToggle={(id, index) => {
                    // Logic to update steps handled in component or specialized API
                    // Simplified here to just reload
                    fetchChores();
                  }}
                  onMarkDone={(id) => handleProgressUpdate(id, 100)}
                />
              );
            }

            // Default fallback
            return (
              <ChoreCard
                key={chore.id}
                chore={chore}
                onProgressUpdate={handleProgressUpdate}
                onDelete={handleDelete}
              />
            );
          })
        )}
      </div>

      <div className="flex gap-4 justify-center mt-8">
        <Link href="/chores/history" className="text-blue-600 hover:underline">View History</Link>
        <span className="text-gray-300">|</span>
        <Link href="/chores/leaderboard" className="text-blue-600 hover:underline">Leaderboard</Link>
        <span className="text-gray-300">|</span>
        <Link href="/chores/feedback" className="text-blue-600 hover:underline">Feedback</Link>
      </div>
    </div>
  );
}
