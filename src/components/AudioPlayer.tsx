import { Play, Pause, SkipBack, SkipForward, ChevronDown, RotateCcw, RotateCw } from 'lucide-react';
import type { Episode, Podcast, QueueItem } from '../types';
import { QueueList } from './QueueList';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface Props {
  episode: Episode;
  podcast: Podcast;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isExpanded: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  upNext: QueueItem[];
  feed: QueueItem[];
  feedIndex: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onToggleExpanded: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onPlayUpNextItem: (index: number) => void;
  onPlayFeedItem: (feedIndex: number) => void;
  onRemoveFromUpNext: (index: number) => void;
  onReorderUpNext: (from: number, to: number) => void;
  onAddToQueueFirst: (item: QueueItem) => void;
  onAddToQueueLast: (item: QueueItem) => void;
}

export function AudioPlayer({
  episode, podcast, isPlaying, currentTime, duration,
  isExpanded, hasNext, hasPrevious, upNext, feed, feedIndex,
  onTogglePlay, onSeek, onSkip, onToggleExpanded,
  onPlayNext, onPlayPrevious, onPlayUpNextItem, onPlayFeedItem,
  onRemoveFromUpNext, onReorderUpNext, onAddToQueueFirst, onAddToQueueLast,
}: Props) {
  const artworkUrl = episode.artworkUrl || podcast.artworkUrl;
  const progress = duration > 0 ? currentTime / duration : 0;
  const remaining = duration - currentTime;

  if (isExpanded) {
    return (
      <div
        className="fixed inset-0 bg-black z-50 flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* ── Player controls (non-scrolling) ── */}
        <div className="flex-shrink-0 flex flex-col items-center px-6 pt-12 pb-5">
          <button
            onClick={onToggleExpanded}
            className="absolute top-4 left-4 p-2"
            style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
          >
            <ChevronDown size={28} className="text-white" />
          </button>

          <img
            src={artworkUrl}
            alt={episode.title}
            className="w-40 h-40 rounded-2xl object-cover mb-4 shadow-2xl"
          />

          <h2 className="text-white font-bold text-base mb-0.5 text-center leading-tight line-clamp-2 w-full max-w-sm">
            {episode.title}
          </h2>
          <p className="text-gray-400 text-sm text-center mb-4">{podcast.title}</p>

          <div className="w-full max-w-sm">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={1}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full mb-1"
            />
            <div className="flex justify-between text-gray-500 text-xs mb-4">
              <span>{formatTime(currentTime)}</span>
              <span>-{formatTime(remaining > 0 ? remaining : 0)}</span>
            </div>

            <div className="flex items-center justify-center gap-7">
              <button
                onClick={onPlayPrevious}
                className={hasPrevious ? 'text-white opacity-80 active:opacity-100' : 'text-gray-700'}
              >
                <SkipBack size={26} />
              </button>
              <button
                onClick={() => onSkip(-15)}
                className="text-white opacity-80 active:opacity-100 flex flex-col items-center gap-1"
              >
                <RotateCcw size={26} />
                <span className="text-xs text-gray-500">15</span>
              </button>
              <button
                onClick={onTogglePlay}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center active:bg-gray-200"
              >
                {isPlaying
                  ? <Pause size={28} className="text-black fill-black" />
                  : <Play size={28} className="text-black fill-black ml-1" />}
              </button>
              <button
                onClick={() => onSkip(30)}
                className="text-white opacity-80 active:opacity-100 flex flex-col items-center gap-1"
              >
                <RotateCcw size={26} style={{ transform: 'scaleX(-1)' }} />
                <span className="text-xs text-gray-500">30</span>
              </button>
              <button
                onClick={onPlayNext}
                className={hasNext ? 'text-white opacity-80 active:opacity-100' : 'text-gray-700'}
              >
                <SkipForward size={26} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Queue (scrollable) ── */}
        <div className="flex-1 overflow-y-auto border-t border-gray-900">
          <QueueList
            upNext={upNext}
            feed={feed}
            feedIndex={feedIndex}
            currentEpisodeId={episode.id}
            onPlayUpNextItem={onPlayUpNextItem}
            onPlayFeedItem={onPlayFeedItem}
            onRemoveFromUpNext={onRemoveFromUpNext}
            onReorderUpNext={onReorderUpNext}
            onAddToQueueFirst={onAddToQueueFirst}
            onAddToQueueLast={onAddToQueueLast}
          />
        </div>
      </div>
    );
  }

  // Mini player
  return (
    <div className="bg-gray-950 border-t border-gray-800">
      <div className="h-0.5 bg-gray-800">
        <div
          className="h-full bg-purple-500 transition-all duration-1000"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button
          onClick={onToggleExpanded}
          className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70"
        >
          <img src={artworkUrl} alt={episode.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{episode.title}</p>
            <p className="text-gray-500 text-xs truncate">{podcast.title}</p>
          </div>
        </button>
        <button onClick={onTogglePlay} className="p-2 active:opacity-70">
          {isPlaying
            ? <Pause size={22} className="text-white fill-white" />
            : <Play size={22} className="text-white fill-white" />}
        </button>
        <button
          onClick={onPlayNext}
          disabled={!hasNext}
          className={`p-2 ${hasNext ? 'active:opacity-70' : 'opacity-30'}`}
        >
          <SkipForward size={22} className="text-white" />
        </button>
      </div>
    </div>
  );
}
