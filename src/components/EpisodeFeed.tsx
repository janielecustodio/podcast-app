import { useEffect, useState } from 'react';
import { Play, Pause, ListPlus } from 'lucide-react';
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
  const now = Date.now();
  const diff = now - ts;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface Props {
  episodes: Episode[];
  podcasts: Podcast[];
  currentEpisodeId: string | null;
  isPlaying: boolean;
  onPlayEpisode: (episode: Episode, podcast: Podcast) => void;
  onAddToQueue: (episode: Episode, podcast: Podcast) => void;
}

export function EpisodeFeed({ episodes, podcasts, currentEpisodeId, isPlaying, onPlayEpisode, onAddToQueue }: Props) {
  const [progress, setProgress] = useState<Record<string, PlaybackProgress>>({});
  const podcastMap = Object.fromEntries(podcasts.map((p) => [p.id, p]));

  useEffect(() => {
    podcastDB.getAllProgress().then((all) => {
      const map: Record<string, PlaybackProgress> = {};
      all.forEach((p) => { map[p.episodeId] = p; });
      setProgress(map);
    });
  }, [episodes]);

  const recent = [...episodes]
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, 75);

  if (recent.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-8 pt-4">
        <p className="text-white text-lg font-semibold mb-1">No episodes yet</p>
        <p className="text-gray-500 text-sm">Add podcasts to your library to see their latest episodes here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-white">Latest Episodes</h1>
      </div>

      {recent.map((episode) => {
        const podcast = podcastMap[episode.podcastId];
        if (!podcast) return null;

        const p = progress[episode.id];
        const isCurrent = currentEpisodeId === episode.id;
        const isCurrentlyPlaying = isCurrent && isPlaying;
        const progressPct = p ? p.currentTime / (p.duration || 1) : 0;
        const artworkUrl = episode.artworkUrl || podcast.artworkUrl;

        return (
          <div key={episode.id} className="border-b border-gray-900 px-4 py-4">
            <div className="flex gap-3">
              <img
                src={artworkUrl}
                alt={podcast.title}
                className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-xs mb-1 truncate">{podcast.title}</p>
                <p
                  className={`text-sm font-semibold leading-snug mb-1 ${
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

              <div className="flex flex-col items-center gap-2 flex-shrink-0 self-center ml-1">
                <button onClick={() => onPlayEpisode(episode, podcast)}>
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
                <button
                  onClick={() => onAddToQueue(episode, podcast)}
                  className="text-gray-600 active:text-purple-400"
                  title="Add to queue"
                >
                  <ListPlus size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
