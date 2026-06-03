import { useState, useCallback, useEffect } from 'react';
import { BookOpen, ListMusic } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import type { Podcast, Episode, QueueItem } from './types';
// EpisodeFeed removed — feed is now shown inside QueueView
import { supabase } from './supabase';
import { Auth } from './components/Auth';
import { usePodcasts } from './hooks/usePodcasts';
import { usePlayer } from './hooks/usePlayer';
import { Library } from './components/Library';
import { AddPodcast } from './components/AddPodcast';
import { PodcastDetail } from './components/PodcastDetail';
import { AudioPlayer } from './components/AudioPlayer';
import { QueueView } from './components/QueueView';
import { PullToRefresh } from './components/PullToRefresh';

type Tab = 'library' | 'queue';
type View =
  | { type: 'library' }
  | { type: 'queue' }
  | { type: 'podcast'; podcast: Podcast }
  | { type: 'add' };

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const timeout = setTimeout(() => setSession((s) => s === undefined ? null : s), 6000);

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        clearTimeout(timeout);
        if (session) {
          setSession(session);
        } else {
          const { data } = await supabase.auth.signInAnonymously();
          setSession(data.session ?? null);
        }
      })
      .catch(() => { clearTimeout(timeout); setSession(null); });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  if (session === undefined) return <div className="h-dvh bg-black" />;
  if (!session) return <Auth />;

  return <AuthenticatedApp key={session.user.id} session={session} />;
}

function AuthenticatedApp({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('library');
  const [view, setView] = useState<View>({ type: 'library' });
  const [loadingPodcastId, setLoadingPodcastId] = useState<string | null>(null);

  const { podcasts, episodesByPodcast, addPodcast, removePodcast, loadEpisodes, refreshEpisodes, refreshAll } =
    usePodcasts();

  const {
    state: player,
    playFromFeed,
    playUpNextItem,
    playFeedItem,
    playNext,
    playPrevious,
    addToQueue,
    addToQueueFirst,
    removeFromQueue,
    reorderUpNext,
    setFeed,
    togglePlay,
    seek,
    skip,
    toggleExpanded,
  } = usePlayer();

  const allEpisodes = Object.values(episodesByPodcast).flat();
  const podcastMap = Object.fromEntries(podcasts.map((p) => [p.id, p]));

  // Sort podcasts by most recent episode (newest first), fall back to addedAt
  const sortedPodcasts = [...podcasts].sort((a, b) => {
    const aLatest = episodesByPodcast[a.id]?.[0]?.publishedAt ?? a.addedAt;
    const bLatest = episodesByPodcast[b.id]?.[0]?.publishedAt ?? b.addedAt;
    return bLatest - aLatest;
  });

  const buildAllEpisodeItems = useCallback((): QueueItem[] => {
    const sorted = [...allEpisodes].sort((a, b) => b.publishedAt - a.publishedAt);
    return sorted
      .map((e) => ({ episode: e, podcast: podcastMap[e.podcastId] }))
      .filter((item): item is QueueItem => Boolean(item.podcast));
  }, [allEpisodes, podcastMap]);

  // Set default feed from all episodes when they first load
  useEffect(() => {
    if (allEpisodes.length === 0 || player.feed.length > 0) return;
    setFeed(buildAllEpisodeItems());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEpisodes.length]);

  const handlePlayFromPodcast = useCallback((episode: Episode) => {
    if (view.type !== 'podcast') return;
    const pod = view.podcast;
    // Find the episode in the global all-episodes feed (preserves feed order)
    const allItems = buildAllEpisodeItems();
    const globalIndex = allItems.findIndex((item) => item.episode.id === episode.id);
    if (globalIndex >= 0) {
      // Episode is in the global feed — play from there, keeping feed intact
      playFromFeed(allItems, globalIndex);
    } else {
      // Episode not in global feed (e.g. old cached episode) — fall back to podcast-only feed
      const episodes = episodesByPodcast[pod.id] ?? [];
      const items = episodes.map((e) => ({ episode: e, podcast: pod }));
      const index = items.findIndex((item) => item.episode.id === episode.id);
      playFromFeed(items, Math.max(0, index));
    }
  }, [view, episodesByPodcast, playFromFeed, buildAllEpisodeItems]);

  const handleAddToQueueFirstFromPodcast = useCallback((episode: Episode) => {
    if (view.type !== 'podcast') return;
    addToQueueFirst(episode, view.podcast);
  }, [view, addToQueueFirst]);

  const handleAddToQueueLastFromPodcast = useCallback((episode: Episode) => {
    if (view.type !== 'podcast') return;
    addToQueue(episode, view.podcast);
  }, [view, addToQueue]);

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
    async (podcast: Podcast): Promise<void> => {
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
  const hasNext = player.upNext.length > 0 || player.feedIndex < player.feed.length - 1;
  const hasPrevious = player.feedIndex > 0 || player.currentTime > 3;

  return (
    <div className="flex flex-col h-dvh bg-black text-white overflow-hidden">
      {/* Scrollable main content */}
      <PullToRefresh onRefresh={refreshAll} className="flex-1">
        {view.type === 'library' && (
          <Library
            podcasts={sortedPodcasts}
            isAnonymous={session.user.is_anonymous ?? false}
            userEmail={session.user.email}
            onAddPodcast={() => setView({ type: 'add' })}
            onSelectPodcast={handleSelectPodcast}
            onRefresh={refreshAll}
          />
        )}

        {view.type === 'queue' && (
          <QueueView
            upNext={player.upNext}
            feed={player.feed}
            feedIndex={player.feedIndex}
            currentEpisodeId={player.episode?.id ?? null}
            onPlayUpNextItem={playUpNextItem}
            onPlayFeedItem={playFeedItem}
            onRemoveFromUpNext={removeFromQueue}
            onReorderUpNext={reorderUpNext}
            onAddToQueueFirst={(item) => addToQueueFirst(item.episode, item.podcast)}
            onAddToQueueLast={(item) => addToQueue(item.episode, item.podcast)}
            onRefresh={refreshAll}
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
            onAddToQueueFirst={handleAddToQueueFirstFromPodcast}
            onAddToQueueLast={handleAddToQueueLastFromPodcast}
            onRefresh={() => handleRefresh(view.podcast)}
            onRemove={(podcast) => removePodcast(podcast.id)}
          />
        )}
      </PullToRefresh>

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
          upNext={player.upNext}
          feed={player.feed}
          feedIndex={player.feedIndex}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onSkip={skip}
          onToggleExpanded={toggleExpanded}
          onPlayNext={playNext}
          onPlayPrevious={playPrevious}
          onPlayUpNextItem={playUpNextItem}
          onPlayFeedItem={playFeedItem}
          onRemoveFromUpNext={removeFromQueue}
          onReorderUpNext={reorderUpNext}
          onAddToQueueFirst={(item) => addToQueueFirst(item.episode, item.podcast)}
          onAddToQueueLast={(item) => addToQueue(item.episode, item.podcast)}
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
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors touch-manipulation ${
              tab === 'library' ? 'text-purple-400' : 'text-gray-600'
            }`}
          >
            <BookOpen size={22} />
            <span className="text-xs font-medium">Library</span>
          </button>
          <button
            onClick={() => switchTab('queue')}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors touch-manipulation ${
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
