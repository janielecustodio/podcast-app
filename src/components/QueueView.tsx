import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { QueueItem } from '../types';
import { QueueList } from './QueueList';

interface Props {
  upNext: QueueItem[];
  feed: QueueItem[];
  feedIndex: number;
  currentEpisodeId: string | null;
  onPlayUpNextItem: (index: number) => void;
  onPlayFeedItem: (feedIndex: number) => void;
  onRemoveFromUpNext: (index: number) => void;
  onReorderUpNext: (from: number, to: number) => void;
  onAddToQueueFirst: (item: QueueItem) => void;
  onAddToQueueLast: (item: QueueItem) => void;
  onRefresh: () => Promise<void>;
}

export function QueueView({
  upNext, feed, feedIndex, currentEpisodeId,
  onPlayUpNextItem, onPlayFeedItem, onRemoveFromUpNext, onReorderUpNext,
  onAddToQueueFirst, onAddToQueueLast, onRefresh,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const hasAnything = upNext.length > 0 || feedIndex < feed.length - 1 || currentEpisodeId;

  if (!hasAnything) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-8">
        <p className="text-white text-lg font-semibold mb-1">Queue is empty</p>
        <p className="text-gray-500 text-sm">Play from a podcast or add episodes using the + button</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-6 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Queue</h1>
        <button
          onClick={async () => { setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); } }}
          disabled={refreshing}
          className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center active:bg-gray-800 disabled:opacity-50"
          title="Refresh feed"
        >
          <RefreshCw size={15} className={`text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <QueueList
        upNext={upNext}
        feed={feed}
        feedIndex={feedIndex}
        currentEpisodeId={currentEpisodeId}
        onPlayUpNextItem={onPlayUpNextItem}
        onPlayFeedItem={onPlayFeedItem}
        onRemoveFromUpNext={onRemoveFromUpNext}
        onReorderUpNext={onReorderUpNext}
        onAddToQueueFirst={onAddToQueueFirst}
        onAddToQueueLast={onAddToQueueLast}
      />
    </div>
  );
}
