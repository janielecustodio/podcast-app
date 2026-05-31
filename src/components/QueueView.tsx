import { X, RotateCcw } from 'lucide-react';
import type { QueueItem } from '../types';

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface Props {
  queue: QueueItem[];
  queueIndex: number;
  currentEpisodeId: string | null;
  onPlayItem: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onResetQueue: () => void;
}

export function QueueView({ queue, queueIndex, currentEpisodeId, onPlayItem, onRemoveItem, onResetQueue }: Props) {
  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-8">
        <p className="text-white text-lg font-semibold mb-1">Queue is empty</p>
        <p className="text-gray-500 text-sm">Play from the feed or add episodes using the <span className="text-gray-400">+</span> button</p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Queue</h1>
          <p className="text-gray-500 text-xs mt-0.5">{queue.length} episode{queue.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onResetQueue}
          className="flex items-center gap-1.5 text-gray-500 text-sm active:text-gray-300"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {queue.map((item, index) => {
        const isCurrent = item.episode.id === currentEpisodeId;
        const isUpNext = !isCurrent && index === queueIndex + 1;
        const artworkUrl = item.episode.artworkUrl || item.podcast.artworkUrl;

        return (
          <div
            key={`${item.episode.id}-${index}`}
            className={`border-b border-gray-900 px-4 py-3 flex items-center gap-3 ${
              isCurrent ? 'bg-gray-950' : ''
            }`}
          >
            {/* Position indicator */}
            <div className="w-5 flex-shrink-0 text-center">
              {isCurrent ? (
                <span className="text-purple-400 text-xs">▶</span>
              ) : (
                <span className="text-gray-700 text-xs">{index + 1}</span>
              )}
            </div>

            <button
              onClick={() => onPlayItem(index)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              <img
                src={artworkUrl}
                alt=""
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate leading-snug ${isCurrent ? 'text-purple-400' : 'text-white'}`}>
                  {item.episode.title}
                </p>
                <p className="text-gray-500 text-xs truncate">{item.podcast.title}</p>
                {item.episode.duration > 0 && (
                  <p className="text-gray-700 text-xs mt-0.5">{formatDuration(item.episode.duration)}</p>
                )}
                {isUpNext && (
                  <p className="text-purple-600 text-xs mt-0.5">Up next</p>
                )}
              </div>
            </button>

            <button
              onClick={() => onRemoveItem(index)}
              className="text-gray-700 active:text-gray-400 flex-shrink-0 p-1"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
