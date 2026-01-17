'use client';

import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import ProgressBar from './ProgressBar';

interface ChoreCardProps {
  chore: {
    id: number;
    title: string;
    description?: string;
    progress: number;
    totalSteps?: number;
    completedSteps?: number;
    steps?: string[];
  };
  onProgressUpdate: (id: number, progress: number) => void;
  previousProgress?: number;
}

export default function ChoreCard({ chore, onProgressUpdate, previousProgress }: ChoreCardProps) {
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

      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <h3 className="text-xl font-bold mb-2">{chore.title}</h3>
        {chore.description && (
          <p className="text-gray-600 mb-4">{chore.description}</p>
        )}

        <ProgressBar progress={chore.progress} choreTitle={chore.title} />

        {chore.steps && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">
              Steps: {chore.completedSteps || 0}/{chore.totalSteps || chore.steps.length}
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              {chore.steps.map((step, index) => {
                const stepText = typeof step === 'string' ? step : JSON.stringify(step);
                return (
                  <li
                    key={index}
                    className={
                      index < (chore.completedSteps || 0)
                        ? 'text-green-600 line-through'
                        : 'text-gray-700'
                    }
                  >
                    {stepText}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleIncrement(25)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 text-sm font-medium min-h-[44px]"
          >
            +25%
          </button>
          <button
            onClick={() => handleIncrement(50)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 active:bg-blue-700 text-sm font-medium min-h-[44px]"
          >
            +50%
          </button>
          <button
            onClick={handleMarkDone}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 active:bg-green-700 text-sm font-medium min-h-[44px]"
          >
            Done ✓
          </button>
        </div>
      </div>
    </div>
  );
}
