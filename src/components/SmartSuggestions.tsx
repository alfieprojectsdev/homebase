import { useState, useEffect } from 'react';

interface Suggestion {
  bill: string;
  reason: string;
  confidence: number;
}

interface SmartSuggestionsProps {
  onApply: (billName: string) => void;
}

export default function SmartSuggestions({ onApply }: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const res = await fetch('/api/heuristics/suggestions');
        if (res.ok) {
          const data = await res.json();
          if (data.suggestions && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
          }
        }
      } catch (err) {
        console.error('Failed to load suggestions', err);
      }
    }
    fetchSuggestions();
  }, []);

  if (!visible || suggestions.length === 0) return null;

  return (
    <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
          💡 Smart Suggestions
        </h3>
        <button
          onClick={() => setVisible(false)}
          className="text-blue-400 hover:text-blue-600 font-bold px-2"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion, idx) => (
          <div key={idx} className="flex justify-between items-center bg-white p-3 rounded border border-blue-100">
            <div>
              <p className="font-bold text-gray-800">{suggestion.bill}</p>
              <p className="text-sm text-gray-600">{suggestion.reason}</p>
            </div>
            <button
              onClick={() => onApply(suggestion.bill)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 active:bg-blue-800 transition-colors"
            >
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
