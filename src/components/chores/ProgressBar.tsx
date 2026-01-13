interface ProgressBarProps {
  progress: number;
  choreTitle: string;
  showPercentage?: boolean;
}

export default function ProgressBar({ progress, choreTitle, showPercentage = true }: ProgressBarProps) {
  const getColorClass = () => {
    if (progress === 100) return 'bg-green-600';
    if (progress >= 70) return 'bg-green-400';
    if (progress >= 30) return 'bg-yellow-400';
    return 'bg-red-500';
  };

  const getTextColor = () => {
    return progress >= 30 ? 'text-gray-800' : 'text-white';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">{choreTitle}</span>
        {showPercentage && (
          <span className="text-sm font-semibold">{progress}%</span>
        )}
      </div>
      <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColorClass()} transition-all duration-500 flex items-center justify-center ${getTextColor()}`}
          style={{ width: `${progress}%` }}
        >
          {progress > 20 && (
            <span className="text-xs font-bold">{progress}%</span>
          )}
        </div>
      </div>
    </div>
  );
}
