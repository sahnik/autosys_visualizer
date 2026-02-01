import { useState, useRef, useEffect, useCallback } from 'react';

interface SearchResult {
  id: string;
  name: string;
  type?: string;
}

interface ExplorerSearchInputProps {
  onSearch: (query: string) => SearchResult[];
  onSelectJob: (jobId: string) => void;
}

export default function ExplorerSearchInput({ onSearch, onSelectJob }: ExplorerSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const r = onSearch(q);
    setResults(r);
    setShowDropdown(r.length > 0);
    setHighlightIndex(-1);
  }, [onSearch]);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 200);
  };

  const handleSelect = (id: string) => {
    setShowDropdown(false);
    setQuery('');
    setResults([]);
    onSelectJob(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIndex].id);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const typeBadgeColor: Record<string, string> = {
    box: 'bg-gray-600',
    command: 'bg-teal-700',
    file_watcher: 'bg-indigo-700',
    condition: 'bg-yellow-700',
  };

  return (
    <div ref={containerRef} className="relative">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Search Database
      </h3>
      <div className="relative">
        <svg
          className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          placeholder="Search jobs in database..."
          className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-gray-800 border border-gray-600 rounded shadow-lg">
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r.id)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                i === highlightIndex ? 'bg-gray-700' : 'hover:bg-gray-700/50'
              }`}
            >
              <span className="text-gray-200 truncate">{r.name}</span>
              {r.type && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${typeBadgeColor[r.type] ?? 'bg-gray-600'} text-gray-200 shrink-0`}>
                  {r.type}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
