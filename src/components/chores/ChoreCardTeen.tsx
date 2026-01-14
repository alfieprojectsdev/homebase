'use client';

import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

interface ChoreCardTeenProps {
  chore: {
    id: number;
    title: string;
    description?: string;
    progress: number;
    streak?: number;
    notes?: string;
  };
  onProgressUpdate: (id: number, progress: number) => void;
  onAddNote: (id: number, note: string) => void;
  previousProgress?: number;
}

export default function ChoreCardTeen({ chore, onProgressUpdate, onAddNote, previousProgress }: ChoreCardTeenProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [note, setNote] = useState('');
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (chore.progress === 100 && previousProgress !== 100) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [chore.progress, previousProgress]);

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 100) {
      onProgressUpdate(chore.id, value);
    }
  };

  const handleMarkDone = () => {
    onProgressUpdate(chore.id, 100);
  };

  const handleAddNote = () => {
    if (note.trim()) {
      onAddNote(chore.id, note.trim());
      setNote('');
    }
  };

  return (
    <div className="relative">
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={200}
        />
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold">{chore.title}</h3>
          {chore.streak && (
            <div className="flex items-center gap-2 text-orange-600">
              <span className="text-2xl">🔥</span>
              <span className="text-lg font-bold">{chore.streak}</span>
            </div>
          )}
        </div>

        {chore.description && (
          <p className="text-gray-600 mb-4">{chore.description}</p>
        )}

        <div className="mb-4">
          <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                chore.progress === 100 ? 'bg-green-600' :
                chore.progress >= 70 ? 'bg-green-400' :
                chore.progress >= 30 ? 'bg-yellow-400' : 'bg-red-500'
              }`}
              style={{ width: `${chore.progress}%` }}
            />
          </div>
          <div className="text-right text-sm text-gray-600 mt-1">{chore.progress}%</div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <input
            type="number"
            value={chore.progress}
            onChange={handleProgressChange}
            className="w-24 h-10 text-center border rounded-lg"
            min="0"
            max="100"
          />
          <span className="text-lg">%</span>
          <button
            onClick={handleMarkDone}
            className="ml-auto px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 active:bg-green-700 font-medium min-h-[44px]"
          >
            Done
          </button>
        </div>

        {chore.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700 italic">{chore.notes}</p>
          </div>
        )}

        <div className="mt-4">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            className="w-full p-3 border rounded-lg resize-none min-h-[88px]"
            rows={2}
          />
          <button
            onClick={handleAddNote}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 font-medium min-h-[44px]"
          >
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
