'use client';

import { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

interface ChoreCardStepsProps {
  chore: {
    id: number;
    title: string;
    description?: string;
    progress: number;
    completedSteps?: number;
    totalSteps?: number;
    steps?: string[];
  };
  onStepToggle: (id: number, stepIndex: number) => void;
  onMarkDone: (id: number) => void;
}

export default function ChoreCardSteps({ chore, onStepToggle, onMarkDone }: ChoreCardStepsProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (chore.progress === 100) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  }, [chore.progress]);

  const steps = chore.steps
    ? (typeof chore.steps === 'string' ? JSON.parse(chore.steps) : chore.steps)
    : [];

  const handleStepClick = (index: number) => {
    onStepToggle(chore.id, index);
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

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">💧</span>
          <div>
            <h3 className="text-xl font-bold">{chore.title}</h3>
            <p className="text-sm text-gray-600">
              Progress: {chore.completedSteps || 0}/{chore.totalSteps || steps.length} steps
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {steps.map((step: string, index: number) => (
            <button
              key={index}
              onClick={() => handleStepClick(index)}
              className={`w-full text-left p-4 rounded-lg border-2 flex items-center gap-3 hover:opacity-80 min-h-[56px] ${
                index < (chore.completedSteps || 0)
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'bg-gray-50 border-gray-300 text-gray-700'
              }`}
            >
              <span className="text-2xl">
                {index < (chore.completedSteps || 0) ? '✅' : '⬜'}
              </span>
              <span className="text-lg">{step}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => onMarkDone(chore.id)}
          className="w-full h-14 bg-green-500 text-white rounded-lg text-xl font-bold hover:bg-green-600 active:bg-green-700"
        >
          Mark All Steps Done ✅
        </button>
      </div>
    </div>
  );
}
