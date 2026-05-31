import { X } from 'lucide-react';
import type { QueueItem } from '../types';

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface Props {
  upNext: QueueItem[];
  feed: QueueItem[];
  feedIndex: number;
  currentEpisodeId: string | null;
  onPlayUpNextItem: (index: number) => void;
  onPlayFeedItem: (feedIndex: number) => void;
  onRemoveFromUpNext: (index: number) => void;
}

function EpisodeRow({
  item,
  isCurrent,
  onPlay,
  onRemove,
  label,
}: {
  item: QueueItem;
  isCurrent?: boolean;
  onPlay: () => void;
  onRemove?: () => void;
  label?: string;
}) {
  const artworkUrl = item.episode.artworkUrl || item.podcast.artworkUrl;
  return (
    <div className={`border-b border-gray-900 px-4 py-3 flex items-center gap-3 ${isCurrent ? 'bg-gray-950' : ''}`}>
      <button onClick={onPlay} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <img src={artworkUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate leading-snug ${isCurrent ? 'text-purple-400' : 'text-white'}`}>
            {item.episode.title}
          </p>
          <p className="text-gray-500 text-xs truncate">{item.podcast.title}</p>
          {item.episode.duration > 0 && (
            <p className="text-gray-700 text-xs mt-0.5">{formatDuration(item.episode.duration)}</p>
          )}
          {label && <p className="text-purple-600 text-xs mt-0.5">{label}</p>}
        </div>
      </button>
      {isCurrent && <span className="text-purple-400 text-xs flex-shrink-0">▶</span>}
      {onRemove && (
        <button onClick={onRemove} className="text-gray-700 active:text-gray-400 flex-shrink-0 p-1">
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function QueueView({
  upNext, feed, feedIndex, currentEpisodeId,
  onPlayUpNextItem, onPlayFeedItem, onRemoveFromUpNext,
}: Props) {
  const upcomingFeed = feed.slice(feedIndex + 1);
  const hasAnything = upNext.length > 0 || upcomingFeed.length > 0;

  if (!currentEpisodeId && !hasAnything) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-8">
        <p className="text-white text-lg font-semibold mb-1">Queue is empty</p>
        <p className="text-gray-500 text-sm">Play from the feed or add episodes using the + button</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-white">Queue</h1>
      </div>

      {/* Up Next section */}
      <div>
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-2">
          Up Next {upNext.length > 0 ? `· ${upNext.length}` : ''}
        </p>
        {upNext.length === 0 ? (
          <p className="text-gray-700 text-sm px-4 pb-3">
            Nothing added — tap + on any episode to queue it.
          </p>
        ) : (
          upNext.map((item, index) => (
            <EpisodeRow
              key={`upnext-${item.episode.id}-${index}`}
              item={item}
              onPlay={() => onPlayUpNextItem(index)}
              onRemove={() => onRemoveFromUpNext(index)}
              label={index === 0 ? 'Up next' : undefined}
            />
          ))
        )}
      </div>

      {/* Feed section */}
      <div className="mt-2">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-2">
          Feed {upcomingFeed.length > 0 ? `· ${upcomingFeed.length} remaining` : ''}
        </p>
        {upcomingFeed.length === 0 ? (
          <p className="text-gray-700 text-sm px-4">No more episodes in feed.</p>
        ) : (
          upcomingFeed.map((item, i) => {
            const actualFeedIdx = feedIndex + 1 + i;
            return (
              <EpisodeRow
                key={`feed-${item.episode.id}-${actualFeedIdx}`}
                item={item}
                isCurrent={item.episode.id === currentEpisodeId}
                onPlay={() => onPlayFeedItem(actualFeedIdx)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
