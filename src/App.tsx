import { useState, useCallback } from 'react';
import { BookOpen, Radio } from 'lucide-react';
import type { Podcast, Episode } from './types';
import { usePodcasts } from './hooks/usePodcasts';
import { usePlayer } from './hooks/usePlayer';
import { Library } from './components/Library';
import { AddPodcast } from './components/AddPodcast';
import { PodcastDetail } from './components/PodcastDetail';
import { EpisodeFeed } from './components/EpisodeFeed';
import { AudioPlayer } from './components/AudioPlayer';

type Tab = 'library' | 'feed';
type View =
  | { type: 'library' }
  | { type: 'feed' }
  | { type: 'podcast'; podcast: Podcast }
  | { type: 'add' };

export default function App() {
  const [tab, setTab] = useState<Tab>('library');
  const [view, setView] = useState<View>({ type: 'library' });
  const [loadingPodcastId, setLoadingPodcastId] = useState<string | null>(null);

  const { podcasts, episodesByPodcast, addPodcast, removePodcast, loadEpisodes, refreshEpisodes } =
    usePodcasts();
  const { state: player, play, togglePlay, seek, skip, toggleExpanded } = usePlayer();

  const allEpisodes = Object.values(episodesByPodcast).flat();

  const handleSelectPodcast = useCallback(
    async (podcast: Podcast) => {
      setView({ type: 'podcast', podcast });
      setLoadingPodcastId(podcast.id);
      try {
        await loadEpisodes(podcast);
      } finally {
        setLoadingPodcastId(null);
      }
    },
    [loadEpisodes],
  );

  const handleRefresh = useCallback(
    async (podcast: Podcast) => {
      setLoadingPodcastId(podcast.id);
      try {
        await refreshEpisodes(podcast);
      } finally {
        setLoadingPodcastId(null);
      }
    },
    [refreshEpisodes],
  );

  const handlePlayEpisode = useCallback(
    (episode: Episode, podcast?: Podcast) => {
      const pod = podcast ?? podcasts.find((p) => p.id === episode.podcastId);
      if (pod) play(episode, pod);
    },
    [play, podcasts],
  );

  const switchTab = (newTab: Tab) => {
    setTab(newTab);
    setView({ type: newTab });
  };

  const existingIds = new Set(podcasts.map((p) => p.id));
  const showTabBar = view.type !== 'podcast';

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* Scrollable main content */}
      <div className="flex-1 overflow-y-auto">
        {view.type === 'library' && (
          <Library
            podcasts={podcasts}
            onAddPodcast={() => setView({ type: 'add' })}
            onSelectPodcast={handleSelectPodcast}
          />
        )}

        {view.type === 'feed' && (
          <EpisodeFeed
            episodes={allEpisodes}
            podcasts={podcasts}
            currentEpisodeId={player.episode?.id ?? null}
            isPlaying={player.isPlaying}
            onPlayEpisode={(episode, podcast) => handlePlayEpisode(episode, podcast)}
          />
        )}

        {view.type === 'podcast' && (
          <PodcastDetail
            podcast={view.podcast}
            episodes={episodesByPodcast[view.podcast.id] ?? []}
            currentEpisodeId={player.episode?.id ?? null}
            isPlaying={player.isPlaying}
            loading={loadingPodcastId === view.podcast.id}
            onBack={() => setView({ type: tab })}
            onPlayEpisode={(episode) => handlePlayEpisode(episode)}
            onRefresh={() => handleRefresh(view.podcast)}
            onRemove={(podcast) => removePodcast(podcast.id)}
          />
        )}
      </div>

      {/* Mini / expanded audio player */}
      {player.episode && player.podcast && (
        <AudioPlayer
          episode={player.episode}
          podcast={player.podcast}
          isPlaying={player.isPlaying}
          currentTime={player.currentTime}
          duration={player.duration}
          isExpanded={player.isExpanded}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onSkip={skip}
          onToggleExpanded={toggleExpanded}
        />
      )}

      {/* Tab bar */}
      {showTabBar && (
        <div className="flex-shrink-0 flex border-t border-gray-900 bg-black">
          <button
            onClick={() => switchTab('library')}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              tab === 'library' ? 'text-purple-400' : 'text-gray-600'
            }`}
          >
            <BookOpen size={22} />
            <span className="text-xs font-medium">Library</span>
          </button>
          <button
            onClick={() => switchTab('feed')}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              tab === 'feed' ? 'text-purple-400' : 'text-gray-600'
            }`}
          >
            <Radio size={22} />
            <span className="text-xs font-medium">Feed</span>
          </button>
        </div>
      )}

      {/* Add podcast modal */}
      {view.type === 'add' && (
        <AddPodcast
          existingIds={existingIds}
          onAdd={(podcast) => addPodcast(podcast)}
          onClose={() => setView({ type: 'library' })}
        />
      )}
    </div>
  );
}
