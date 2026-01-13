'use client';

import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import ProgressBar from './ProgressBar';

interface ChoreCardJuniorProps {
  chore: {
    id: number;
    title: string;
    description?: string;
    progress: number;
  };
  onProgressUpdate: (id: number, progress: number) => void;
  previousProgress?: number;
}

export default function ChoreCardJunior({ chore, onProgressUpdate, previousProgress }: ChoreCardJuniorProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (chore.progress === 100 && previousProgress !== 100) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [chore.progress, previousProgress]);

  const handleIncrement = (increment: number) => {
    const newProgress = Math.min(100, chore.progress + increment);
    onProgressUpdate(chore.id, newProgress);
  };

  const handleMarkDone = () => {
    onProgressUpdate(chore.id, 100);
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

      <div className="bg-white rounded-xl shadow-lg p-6 border-4 border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">🧹</span>
          <h3 className="text-2xl font-bold">{chore.title}</h3>
        </div>

        <ProgressBar progress={chore.progress} choreTitle={chore.title} showPercentage={false} />

        <div className="grid grid-cols-3 gap-3 mt-4">
          <button
            onClick={() => handleIncrement(25)}
            className="h-16 text-2xl bg-blue-500 text-white rounded-xl hover:bg-blue-600 active:bg-blue-700 font-bold"
          >
            +25%
          </button>
          <button
            onClick={() => handleIncrement(25)}
            className="h-16 text-2xl bg-blue-500 text-white rounded-xl hover:bg-blue-600 active:bg-blue-700 font-bold"
          >
            +25%
          </button>
          <button
            onClick={handleMarkDone}
            className="h-16 text-2xl bg-green-500 text-white rounded-xl hover:bg-green-600 active:bg-green-700 font-bold"
          >
            ✅ Done
          </button>
        </div>
      </div>
    </div>
  );
}
