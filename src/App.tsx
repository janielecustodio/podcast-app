import { useState, useCallback, useEffect } from 'react';
import { BookOpen, Radio, ListMusic } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type { Podcast, Episode, QueueItem } from './types';
import { supabase } from './supabase';
import { Auth } from './components/Auth';
import { usePodcasts } from './hooks/usePodcasts';
import { usePlayer } from './hooks/usePlayer';
import { Library } from './components/Library';
import { AddPodcast } from './components/AddPodcast';
import { PodcastDetail } from './components/PodcastDetail';
import { EpisodeFeed } from './components/EpisodeFeed';
import { AudioPlayer } from './components/AudioPlayer';
import { QueueView } from './components/QueueView';

type Tab = 'library' | 'feed' | 'queue';
type View =
  | { type: 'library' }
  | { type: 'feed' }
  | { type: 'queue' }
  | { type: 'podcast'; podcast: Podcast }
  | { type: 'add' };

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Still loading session
  if (session === undefined) {
    return <div className="h-dvh bg-black" />;
  }

  if (!session) {
    return <Auth />;
  }

  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const [tab, setTab] = useState<Tab>('library');
  const [view, setView] = useState<View>({ type: 'library' });
  const [loadingPodcastId, setLoadingPodcastId] = useState<string | null>(null);

  const { podcasts, episodesByPodcast, addPodcast, removePodcast, loadEpisodes, refreshEpisodes } =
    usePodcasts();

  const {
    state: player,
    play,
    playQueue,
    playNext,
    playPrevious,
    addToQueue,
    removeFromQueue,
    setQueue,
    togglePlay,
    seek,
    skip,
    toggleExpanded,
  } = usePlayer();

  const allEpisodes = Object.values(episodesByPodcast).flat();
  const podcastMap = Object.fromEntries(podcasts.map((p) => [p.id, p]));

  // Populate default queue with recent episodes once episodes load
  useEffect(() => {
    if (allEpisodes.length === 0 || player.queue.length > 0) return;
    const sorted = [...allEpisodes].sort((a, b) => b.publishedAt - a.publishedAt);
    const items = sorted
      .map((e) => ({ episode: e, podcast: podcastMap[e.podcastId] }))
      .filter((item): item is QueueItem => Boolean(item.podcast));
    setQueue(items);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEpisodes.length]);

  const buildFeedQueue = useCallback((): QueueItem[] => {
    const sorted = [...allEpisodes].sort((a, b) => b.publishedAt - a.publishedAt);
    return sorted
      .map((e) => ({ episode: e, podcast: podcastMap[e.podcastId] }))
      .filter((item): item is QueueItem => Boolean(item.podcast));
  }, [allEpisodes, podcastMap]);

  const handlePlayFromFeed = useCallback((episode: Episode, podcast: Podcast) => {
    const items = buildFeedQueue();
    const index = items.findIndex((item) => item.episode.id === episode.id);
    playQueue(items, Math.max(0, index));
  }, [buildFeedQueue, playQueue]);

  const handlePlayFromPodcast = useCallback((episode: Episode) => {
    if (view.type !== 'podcast') return;
    const pod = view.podcast;
    const episodes = episodesByPodcast[pod.id] ?? [];
    const items = episodes.map((e) => ({ episode: e, podcast: pod }));
    const index = items.findIndex((item) => item.episode.id === episode.id);
    playQueue(items, Math.max(0, index));
  }, [view, episodesByPodcast, playQueue]);

  const handleAddToQueueFromFeed = useCallback((episode: Episode, podcast: Podcast) => {
    addToQueue(episode, podcast);
  }, [addToQueue]);

  const handleAddToQueueFromPodcast = useCallback((episode: Episode) => {
    if (view.type !== 'podcast') return;
    addToQueue(episode, view.podcast);
  }, [view, addToQueue]);

  const handlePlayFromQueue = useCallback((index: number) => {
    const item = player.queue[index];
    if (item) play(item.episode, item.podcast);
  }, [player.queue, play]);

  const handleResetQueue = useCallback(() => {
    const items = buildFeedQueue();
    setQueue(items);
  }, [buildFeedQueue, setQueue]);

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

  const switchTab = (newTab: Tab) => {
    setTab(newTab);
    setView({ type: newTab });
  };

  const showTabBar = view.type !== 'podcast';
  const hasNext = player.queueIndex < player.queue.length - 1;
  const hasPrevious = player.queueIndex > 0 || (player.currentTime > 3);

  return (
    <div className="flex flex-col h-dvh bg-black text-white overflow-hidden">
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
            onPlayEpisode={handlePlayFromFeed}
            onAddToQueue={handleAddToQueueFromFeed}
          />
        )}

        {view.type === 'queue' && (
          <QueueView
            queue={player.queue}
            queueIndex={player.queueIndex}
            currentEpisodeId={player.episode?.id ?? null}
            onPlayItem={handlePlayFromQueue}
            onRemoveItem={removeFromQueue}
            onResetQueue={handleResetQueue}
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
            onPlayEpisode={handlePlayFromPodcast}
            onAddToQueue={handleAddToQueueFromPodcast}
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
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onSkip={skip}
          onToggleExpanded={toggleExpanded}
          onPlayNext={playNext}
          onPlayPrevious={playPrevious}
        />
      )}

      {/* Tab bar */}
      {showTabBar && (
        <div
          className="flex-shrink-0 flex border-t border-gray-900 bg-black"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
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
          <button
            onClick={() => switchTab('queue')}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              tab === 'queue' ? 'text-purple-400' : 'text-gray-600'
            }`}
          >
            <ListMusic size={22} />
            <span className="text-xs font-medium">Queue</span>
          </button>
        </div>
      )}

      {/* Add podcast modal */}
      {view.type === 'add' && (
        <AddPodcast
          existingIds={new Set(podcasts.map((p) => p.id))}
          onAdd={(podcast) => addPodcast(podcast)}
          onClose={() => setView({ type: 'library' })}
        />
      )}
    </div>
  );
}
