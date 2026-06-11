import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Loader2, ExternalLink, RotateCcw } from 'lucide-react';
import type { Podcast, Episode } from '../types';
import { fetchEpisodesFromUrl } from '../api';
import { audio } from '../audio';

const APP_URL = 'https://janielecustodio.com/podcast-app/';

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(ts: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface PlayerBarProps {
  episode: Episode;
  podcast: Podcast;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

function PlayerBar({ episode, podcast, isPlaying, onTogglePlay }: PlayerBarProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const art = episode.artworkUrl || podcast.artworkUrl;

  useEffect(() => {
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(audio.duration || 0);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('durationchange', onDuration);
    setCurrentTime(audio.currentTime);
    setDuration(audio.duration || 0);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('durationchange', onDuration);
    };
  }, []);

  const remaining = duration - currentTime;

  return (
    <div
      className="flex-shrink-0 bg-black border-t border-gray-900 px-4 pt-3 pb-4"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      {/* Artwork + title */}
      <div className="flex items-center gap-3 mb-3">
        {art && <img src={art} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{episode.title}</p>
          <p className="text-gray-500 text-xs truncate">{podcast.title}</p>
        </div>
      </div>

      {/* Seek bar */}
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={1}
        value={currentTime}
        onChange={(e) => { audio.currentTime = Number(e.target.value); }}
        className="w-full mb-1"
      />
      <div className="flex justify-between text-gray-600 text-xs mb-3">
        <span>{formatTime(currentTime)}</span>
        <span>-{formatTime(remaining > 0 ? remaining : 0)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-8">
        <button
          onClick={() => { audio.currentTime = Math.max(0, audio.currentTime - 15); }}
          className="text-white opacity-80 active:opacity-100 flex flex-col items-center gap-0.5"
        >
          <RotateCcw size={24} />
          <span className="text-xs text-gray-500">15</span>
        </button>
        <button
          onClick={onTogglePlay}
          className="w-14 h-14 rounded-full bg-white flex items-center justify-center active:bg-gray-200"
        >
          {isPlaying
            ? <Pause size={24} className="text-black fill-black" />
            : <Play size={24} className="text-black fill-black ml-0.5" />}
        </button>
        <button
          onClick={() => { audio.currentTime = Math.min(duration, audio.currentTime + 30); }}
          className="text-white opacity-80 active:opacity-100 flex flex-col items-center gap-0.5"
        >
          <RotateCcw size={24} style={{ transform: 'scaleX(-1)' }} />
          <span className="text-xs text-gray-500">30</span>
        </button>
      </div>
    </div>
  );
}

interface Props {
  feedUrl: string;
  episodeGuid: string | null;
}

export function ShareView({ feedUrl, episodeGuid }: Props) {
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | null>(null);

  useEffect(() => {
    fetchEpisodesFromUrl(feedUrl)
      .then(({ podcast, episodes }) => {
        setPodcast(podcast);
        setEpisodes(episodes);
      })
      .catch(() => setError('Failed to load podcast. The feed may be unavailable.'))
      .finally(() => setLoading(false));
  }, [feedUrl]);

  useEffect(() => {
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const currentEpisode = currentEpisodeId
    ? episodes.find((e) => e.id === currentEpisodeId) ?? null
    : null;

  const playEpisode = (episode: Episode) => {
    if (currentEpisodeId === episode.id && !audio.paused) {
      audio.pause();
    } else if (currentEpisodeId === episode.id) {
      audio.play().catch(console.error);
    } else {
      audio.src = episode.audioUrl;
      audio.load();
      audio.play().catch(console.error);
      setCurrentEpisodeId(episode.id);
    }
  };

  const togglePlay = () => {
    if (audio.paused) audio.play().catch(console.error);
    else audio.pause();
  };

  const highlightedEpisode = episodeGuid
    ? episodes.find((e) => e.id.split('::')[1] === episodeGuid || e.id === episodeGuid)
    : null;

  const displayEpisodes = highlightedEpisode
    ? episodes.filter((e) => e.id !== highlightedEpisode.id).slice(0, 10)
    : episodes.slice(0, 10);

  const artworkUrl = highlightedEpisode?.artworkUrl || podcast?.artworkUrl || '';

  if (loading) {
    return (
      <div className="h-dvh bg-black flex flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 size={28} className="animate-spin" />
        <p className="text-sm">Loading podcast…</p>
      </div>
    );
  }

  if (error || !podcast) {
    return (
      <div className="h-dvh bg-black flex flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="text-white font-semibold">Could not load podcast</p>
        <p className="text-gray-500 text-sm">{error}</p>
        <a href={APP_URL} className="text-purple-400 text-sm">Open app</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-900"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          {artworkUrl && (
            <img src={artworkUrl} alt="" className="w-7 h-7 rounded-md object-cover" />
          )}
          <span className="text-sm font-semibold text-white truncate max-w-[200px]">{podcast.title}</span>
        </div>
        <a
          href={APP_URL}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 text-white text-xs font-semibold active:bg-purple-700"
        >
          <ExternalLink size={12} />
          Open app
        </a>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Highlighted episode */}
        {highlightedEpisode && (
          <div className="px-4 py-5 border-b border-gray-900">
            {highlightedEpisode.artworkUrl && (
              <img
                src={highlightedEpisode.artworkUrl}
                alt=""
                className="w-24 h-24 rounded-2xl object-cover mb-4 shadow-xl"
              />
            )}
            <p className="text-white font-bold text-base leading-snug mb-1">{highlightedEpisode.title}</p>
            <p className="text-gray-500 text-sm mb-1">{podcast.title}</p>
            <div className="flex items-center gap-2 text-gray-600 text-xs mb-4">
              {highlightedEpisode.publishedAt > 0 && <span>{formatDate(highlightedEpisode.publishedAt)}</span>}
              {highlightedEpisode.duration > 0 && <span>· {formatDuration(highlightedEpisode.duration)}</span>}
            </div>
            <button
              onClick={() => playEpisode(highlightedEpisode)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-600 text-white font-semibold text-sm active:bg-purple-700"
            >
              {currentEpisodeId === highlightedEpisode.id && isPlaying
                ? <><Pause size={16} className="fill-white" /> Pause</>
                : <><Play size={16} className="fill-white ml-0.5" /> Play</>}
            </button>
          </div>
        )}

        {/* Podcast header (no highlighted episode) */}
        {!highlightedEpisode && (
          <div className="px-4 py-5 border-b border-gray-900 flex gap-4 items-center">
            {podcast.artworkUrl && (
              <img src={podcast.artworkUrl} alt={podcast.title} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 shadow-xl" />
            )}
            <div>
              <p className="text-white font-bold text-base leading-tight">{podcast.title}</p>
              <p className="text-gray-400 text-sm mt-0.5">{podcast.author}</p>
            </div>
          </div>
        )}

        {/* Episode list */}
        {displayEpisodes.length > 0 && (
          <>
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 pt-4 pb-2">
              {highlightedEpisode ? 'More episodes' : 'Recent episodes'}
            </p>
            {displayEpisodes.map((episode) => {
              const playing = currentEpisodeId === episode.id && isPlaying;
              return (
                <div
                  key={episode.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-900"
                >
                  <button
                    onClick={() => playEpisode(episode)}
                    className="flex-shrink-0 w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center active:bg-gray-800"
                  >
                    {playing
                      ? <Pause size={14} className="text-purple-400 fill-purple-400" />
                      : <Play size={14} className="text-white fill-white ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate leading-snug">{episode.title}</p>
                    <div className="flex items-center gap-1.5 text-gray-600 text-xs mt-0.5">
                      {episode.publishedAt > 0 && <span>{formatDate(episode.publishedAt)}</span>}
                      {episode.duration > 0 && <span>· {formatDuration(episode.duration)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        <div className="py-8 text-center">
          <a href={APP_URL} className="text-purple-400 text-sm">
            Sign in to save your library →
          </a>
        </div>
      </div>

      {/* Player bar — shown when an episode is loaded */}
      {currentEpisode && (
        <PlayerBar
          episode={currentEpisode}
          podcast={podcast}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
        />
      )}
    </div>
  );
}
