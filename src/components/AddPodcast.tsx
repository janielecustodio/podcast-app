import { useState } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import type { Podcast } from '../types';
import { searchPodcasts } from '../api';

interface Props {
  existingIds: Set<string>;
  onAdd: (podcast: Podcast) => void;
  onClose: () => void;
}

export function AddPodcast({ existingIds, onAdd, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await searchPodcasts(query.trim());
      setResults(r);
      if (r.length === 0) setError('No podcasts found. Try a different search.');
    } catch {
      setError('Search failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (podcast: Podcast) => {
    onAdd(podcast);
    setAddedIds((prev) => new Set(prev).add(podcast.id));
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Search bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-900 pt-safe">
        <div className="flex-1 flex items-center gap-2 bg-gray-900 rounded-xl px-3 py-2.5">
          <Search size={16} className="text-gray-500 flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search podcasts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            className="flex-1 bg-transparent text-white outline-none text-sm placeholder-gray-600"
          />
          {query.length > 0 && (
            <button onClick={() => { setQuery(''); setResults([]); }}>
              <X size={14} className="text-gray-500" />
            </button>
          )}
        </div>
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="px-4 py-2.5 bg-purple-600 rounded-xl text-white text-sm font-semibold disabled:opacity-50 active:bg-purple-700"
        >
          Search
        </button>
        <button onClick={onClose} className="p-1">
          <X size={22} className="text-gray-400" />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            Searching...
          </div>
        )}
        {error && !loading && (
          <div className="p-4 text-gray-500 text-sm text-center">{error}</div>
        )}
        {!loading && results.length > 0 && (
          <div>
            {results.map((podcast) => {
              const isAdded = existingIds.has(podcast.id) || addedIds.has(podcast.id);
              return (
                <div
                  key={podcast.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-900"
                >
                  <img
                    src={podcast.artworkUrl}
                    alt={podcast.title}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{podcast.title}</p>
                    <p className="text-gray-500 text-xs truncate mt-0.5">{podcast.author}</p>
                  </div>
                  <button
                    onClick={() => !isAdded && handleAdd(podcast)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      isAdded ? 'bg-green-600' : 'bg-purple-600 active:bg-purple-700'
                    }`}
                  >
                    {isAdded ? (
                      <Check size={16} className="text-white" />
                    ) : (
                      <Plus size={16} className="text-white" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {!loading && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-48 text-center px-8">
            <p className="text-gray-600 text-sm">Search for a podcast by name</p>
          </div>
        )}
      </div>
    </div>
  );
}
