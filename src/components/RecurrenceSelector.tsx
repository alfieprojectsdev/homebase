'use client';

import { useState } from 'react';

interface RecurrenceSelectorProps {
  enabled: boolean;
  frequency: string;
  interval: number;
  dayOfMonth?: number;
  onUpdate: (config: {
    enabled: boolean;
    frequency: string;
    interval: number;
    dayOfMonth?: number;
  }) => void;
}

export default function RecurrenceSelector({
  enabled,
  frequency,
  interval,
  dayOfMonth,
  onUpdate,
}: RecurrenceSelectorProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [freq, setFreq] = useState(frequency || 'monthly');
  const [int, setInt] = useState(interval || 1);
  const [day, setDay] = useState(dayOfMonth);

  const handleToggle = (checked: boolean) => {
    setIsEnabled(checked);
    onUpdate({
      enabled: checked,
      frequency: freq,
      interval: int,
      dayOfMonth: day,
    });
  };

  const handleChange = () => {
    onUpdate({
      enabled: isEnabled,
      frequency: freq,
      interval: int,
      dayOfMonth: day,
    });
  };

  const getFrequencyLabel = () => {
    switch (freq) {
      case 'monthly':
        return 'month(s)';
      case 'quarterly':
        return 'quarter(s)';
      case 'biannual':
        return 'half-year(s)';
      case 'annual':
        return 'year(s)';
      default:
        return 'month(s)';
    }
  };

  return (
    <div className="space-y-4 p-4 border border-gray-300 rounded-md bg-gray-50">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="recurrence-enabled"
          checked={isEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="w-11 h-11"
        />
        <label htmlFor="recurrence-enabled" className="text-lg font-medium text-gray-900">
          🔄 Make this a recurring bill
        </label>
      </div>

      {isEnabled && (
        <div className="space-y-3 pl-7">
          {/* Frequency selector */}
          <div>
            <label htmlFor="frequency" className="block text-lg font-medium text-gray-900 mb-1">
              Frequency
            </label>
            <select
              id="frequency"
              value={freq}
              onChange={(e) => {
                setFreq(e.target.value);
                setTimeout(handleChange, 0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white min-h-[44px]"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly (3 months)</option>
              <option value="biannual">Biannual (6 months)</option>
              <option value="annual">Annual (yearly)</option>
            </select>
          </div>

          {/* Interval input */}
          <div>
            <label htmlFor="interval" className="block text-lg font-medium text-gray-900 mb-1">
              Repeat every
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="interval"
                min={1}
                max={12}
                value={int}
                onChange={(e) => {
                  setInt(parseInt(e.target.value, 10) || 1);
                  setTimeout(handleChange, 0);
                }}
                className="w-20 px-3 py-2 border border-gray-300 rounded-md text-gray-900 min-h-[44px]"
              />
              <span className="text-lg text-gray-900">{getFrequencyLabel()}</span>
            </div>
          </div>

          {/* Day of month input */}
          <div>
            <label htmlFor="dayOfMonth" className="block text-lg font-medium text-gray-900 mb-1">
              Day of month (optional)
            </label>
            <input
              type="number"
              id="dayOfMonth"
              min={1}
              max={31}
              value={day || ''}
              onChange={(e) => {
                setDay(e.target.value ? parseInt(e.target.value, 10) : undefined);
                setTimeout(handleChange, 0);
              }}
              placeholder="e.g., 15 for 15th of each month"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 min-h-[44px]"
            />
            <p className="mt-1 text-sm text-gray-600">
              Leave empty to use the same day as the due date
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
