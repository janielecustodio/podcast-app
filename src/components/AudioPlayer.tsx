import { Play, Pause, SkipBack, SkipForward, ChevronDown, RotateCcw, RotateCw } from 'lucide-react';
import type { Episode, Podcast, QueueItem } from '../types';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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
  queue: QueueItem[];
  queueIndex: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onToggleExpanded: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onPlayQueueItem: (index: number) => void;
}

export function AudioPlayer({
  episode, podcast, isPlaying, currentTime, duration,
  isExpanded, hasNext, hasPrevious, queue, queueIndex,
  onTogglePlay, onSeek, onSkip, onToggleExpanded,
  onPlayNext, onPlayPrevious, onPlayQueueItem,
}: Props) {
  const progress = duration > 0 ? currentTime / duration : 0;
  const artworkUrl = episode.artworkUrl || podcast.artworkUrl;
  const remaining = duration - currentTime;

  if (isExpanded) {
    const upNext = queue.slice(queueIndex + 1);

    return (
      <div
        className="fixed inset-0 bg-black z-50 flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* ── Player controls (fixed, non-scrolling) ── */}
        <div className="flex-shrink-0 flex flex-col items-center px-6 pt-12 pb-6">
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
            className="w-48 h-48 rounded-2xl object-cover mb-5 shadow-2xl"
          />

          <h2 className="text-white font-bold text-lg mb-0.5 text-center leading-tight line-clamp-2 w-full max-w-sm">
            {episode.title}
          </h2>
          <p className="text-gray-400 text-sm text-center mb-5">{podcast.title}</p>

          {/* Seek bar */}
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
            <div className="flex justify-between text-gray-500 text-xs mb-5">
              <span>{formatTime(currentTime)}</span>
              <span>-{formatTime(remaining > 0 ? remaining : 0)}</span>
            </div>

            {/* Controls */}
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
                {isPlaying ? (
                  <Pause size={28} className="text-black fill-black" />
                ) : (
                  <Play size={28} className="text-black fill-black ml-1" />
                )}
              </button>

              <button
                onClick={() => onSkip(30)}
                className="text-white opacity-80 active:opacity-100 flex flex-col items-center gap-1"
              >
                <RotateCw size={26} />
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
        {upNext.length > 0 && (
          <div className="flex-1 overflow-y-auto border-t border-gray-900">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 pt-3 pb-2">
              Up Next
            </p>
            {upNext.map((item, i) => {
              const globalIndex = queueIndex + 1 + i;
              const art = item.episode.artworkUrl || item.podcast.artworkUrl;
              const isUpNextImmediate = i === 0;
              return (
                <button
                  key={`${item.episode.id}-${globalIndex}`}
                  onClick={() => onPlayQueueItem(globalIndex)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-900 active:bg-gray-900 text-left"
                >
                  <img src={art} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isUpNextImmediate ? 'text-white' : 'text-gray-400'}`}>
                      {item.episode.title}
                    </p>
                    <p className="text-gray-600 text-xs truncate">{item.podcast.title}</p>
                  </div>
                  {item.episode.duration > 0 && (
                    <span className="text-gray-700 text-xs flex-shrink-0">
                      {formatDuration(item.episode.duration)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Mini player
  return (
    <div
      className="bg-gray-950 border-t border-gray-800 cursor-pointer active:bg-gray-900"
      onClick={onToggleExpanded}
    >
      <div className="h-0.5 bg-gray-800">
        <div
          className="h-full bg-purple-500 transition-all duration-1000"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5">
        <img
          src={artworkUrl}
          alt={episode.title}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{episode.title}</p>
          <p className="text-gray-500 text-xs truncate">{podcast.title}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          className="p-2 active:opacity-70"
        >
          {isPlaying ? (
            <Pause size={22} className="text-white fill-white" />
          ) : (
            <Play size={22} className="text-white fill-white" />
          )}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onPlayNext(); }}
          disabled={!hasNext}
          className={`p-2 ${hasNext ? 'active:opacity-70' : 'opacity-30'}`}
        >
          <SkipForward size={22} className="text-white" />
        </button>
      </div>
    </div>
  );
}
