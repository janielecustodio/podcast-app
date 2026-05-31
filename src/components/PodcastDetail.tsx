import { useEffect, useState } from 'react';
import { ChevronLeft, RefreshCw, Play, Pause, Trash2 } from 'lucide-react';
import type { Episode, Podcast, PlaybackProgress } from '../types';
import { podcastDB } from '../db';

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface Props {
  podcast: Podcast;
  episodes: Episode[];
  currentEpisodeId: string | null;
  isPlaying: boolean;
  loading: boolean;
  onBack: () => void;
  onPlayEpisode: (episode: Episode) => void;
  onRefresh: () => void;
  onRemove: (podcast: Podcast) => void;
}

export function PodcastDetail({
  podcast, episodes, currentEpisodeId, isPlaying,
  loading, onBack, onPlayEpisode, onRefresh, onRemove,
}: Props) {
  const [progress, setProgress] = useState<Record<string, PlaybackProgress>>({});
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (episodes.length === 0) return;
    Promise.all(episodes.map((e) => podcastDB.getProgress(e.id))).then((results) => {
      const map: Record<string, PlaybackProgress> = {};
      results.forEach((p, i) => { if (p) map[episodes[i].id] = p; });
      setProgress(map);
    });
  }, [episodes]);

  return (
    <div className="flex flex-col h-full">
      {/* Artwork header */}
      <div className="flex-shrink-0 relative">
        <img
          src={podcast.artworkUrl}
          alt={podcast.title}
          className="w-full aspect-square object-cover"
          style={{ maxHeight: '45vw' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black" />

        <button
          onClick={onBack}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>

        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={onRefresh}
            className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
          >
            <RefreshCw size={14} className={`text-white ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setConfirmRemove(true)}
            className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Podcast info */}
      <div className="flex-shrink-0 px-4 py-3 bg-black border-b border-gray-900">
        <h1 className="text-white text-lg font-bold leading-tight">{podcast.title}</h1>
        <p className="text-gray-400 text-sm mt-0.5">{podcast.author}</p>
      </div>

      {/* Episodes */}
      <div className="flex-1 overflow-y-auto">
        {loading && episodes.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            Loading episodes...
          </div>
        )}

        {!loading && episodes.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No episodes found. Try refreshing.
          </div>
        )}

        {episodes.map((episode) => {
          const p = progress[episode.id];
          const isCurrent = currentEpisodeId === episode.id;
          const isCurrentlyPlaying = isCurrent && isPlaying;
          const progressPct = p ? p.currentTime / (p.duration || 1) : 0;

          return (
            <div key={episode.id} className="border-b border-gray-900 px-4 py-4">
              <div className="flex gap-3">
                <button
                  onClick={() => onPlayEpisode(episode)}
                  className="flex-shrink-0 mt-0.5"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      isCurrentlyPlaying ? 'bg-purple-600' : 'bg-gray-800'
                    }`}
                  >
                    {isCurrentlyPlaying ? (
                      <Pause size={15} className="text-white fill-white" />
                    ) : (
                      <Play size={15} className="text-white fill-white ml-0.5" />
                    )}
                  </div>
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold mb-1 leading-snug ${
                      p?.completed ? 'text-gray-500' : 'text-white'
                    }`}
                  >
                    {episode.title}
                  </p>
                  <div className="flex items-center gap-1.5 text-gray-600 text-xs">
                    {episode.publishedAt > 0 && <span>{formatDate(episode.publishedAt)}</span>}
                    {episode.duration > 0 && (
                      <>
                        <span>·</span>
                        <span>{formatDuration(episode.duration)}</span>
                      </>
                    )}
                    {p?.completed && (
                      <>
                        <span>·</span>
                        <span className="text-green-700">Played</span>
                      </>
                    )}
                  </div>
                  {progressPct > 0 && !p?.completed && (
                    <div className="h-1 bg-gray-800 rounded-full mt-2">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${progressPct * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Remove confirmation dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-5">
            <h3 className="text-white font-bold text-lg mb-1">Remove podcast?</h3>
            <p className="text-gray-400 text-sm mb-5">
              "{podcast.title}" will be removed from your library.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(false)}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { onRemove(podcast); onBack(); }}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold text-sm active:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
