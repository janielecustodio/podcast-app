import { Play, Pause, SkipBack, SkipForward, ChevronDown, RotateCcw, RotateCw } from 'lucide-react';
import type { Episode, Podcast } from '../types';

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
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onToggleExpanded: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
}

export function AudioPlayer({
  episode, podcast, isPlaying, currentTime, duration,
  isExpanded, hasNext, hasPrevious,
  onTogglePlay, onSeek, onSkip, onToggleExpanded, onPlayNext, onPlayPrevious,
}: Props) {
  const progress = duration > 0 ? currentTime / duration : 0;
  const artworkUrl = episode.artworkUrl || podcast.artworkUrl;
  const remaining = duration - currentTime;

  if (isExpanded) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center px-6 overflow-y-auto"
        style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))', paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}>
        <button onClick={onToggleExpanded} className="absolute top-4 left-4 p-2 rounded-full"
          style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
          <ChevronDown size={28} className="text-white" />
        </button>

        <img
          src={artworkUrl}
          alt={episode.title}
          className="w-64 h-64 rounded-2xl object-cover mb-8 shadow-2xl mt-4"
        />

        <div className="w-full max-w-sm">
          <h2 className="text-white font-bold text-xl mb-1 text-center leading-tight line-clamp-2">
            {episode.title}
          </h2>
          <p className="text-gray-400 text-sm text-center mb-8">{podcast.title}</p>

          {/* Seek bar */}
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={1}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full mb-2"
          />
          <div className="flex justify-between text-gray-500 text-xs mb-10">
            <span>{formatTime(currentTime)}</span>
            <span>-{formatTime(remaining > 0 ? remaining : 0)}</span>
          </div>

          {/* Controls: [⏮ prev] [↩ 15s] [▶] [30s ↪] [next ⏭] */}
          <div className="flex items-center justify-center gap-7">
            <button
              onClick={onPlayPrevious}
              className={`flex flex-col items-center gap-1 ${hasPrevious ? 'text-white opacity-80 active:opacity-100' : 'text-gray-700'}`}
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
              className={`flex flex-col items-center gap-1 ${hasNext ? 'text-white opacity-80 active:opacity-100' : 'text-gray-700'}`}
            >
              <SkipForward size={26} />
            </button>
          </div>
        </div>
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
