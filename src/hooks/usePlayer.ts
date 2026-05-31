import { useState, useEffect, useCallback, useRef } from 'react';
import type { Episode, Podcast, PlayerState, QueueItem } from '../types';
import { podcastDB } from '../db';
import { audio } from '../audio';

export function usePlayer() {
  const [state, setState] = useState<PlayerState>({
    episode: null,
    podcast: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isExpanded: false,
    upNext: [],
    feed: [],
    feedIndex: -1,
  });

  const episodeRef = useRef<Episode | null>(null);
  const upNextRef = useRef<QueueItem[]>([]);
  const feedRef = useRef<QueueItem[]>([]);
  const feedIndexRef = useRef(-1);

  // Play an episode immediately (does not touch upNext or feed structure)
  const playEpisode = useCallback(async (episode: Episode, podcast: Podcast) => {
    episodeRef.current = episode;
    setState((s) => ({
      ...s,
      episode,
      podcast,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }));
    audio.src = episode.audioUrl;
    const progress = await podcastDB.getProgress(episode.id);
    if (progress && !progress.completed && progress.currentTime > 10) {
      audio.currentTime = progress.currentTime;
    }
    audio.play().catch(console.error);
  }, []);

  // Keep a ref so event handlers never go stale
  const playEpisodeRef = useRef(playEpisode);
  useEffect(() => { playEpisodeRef.current = playEpisode; }, [playEpisode]);

  // Wire up audio element events once
  useEffect(() => {
    const onTimeUpdate = () =>
      setState((s) => ({ ...s, currentTime: audio.currentTime }));
    const onDurationChange = () =>
      setState((s) => ({ ...s, duration: isFinite(audio.duration) ? audio.duration : 0 }));
    const onPlay = () => setState((s) => ({ ...s, isPlaying: true }));
    const onPause = () => {
      setState((s) => ({ ...s, isPlaying: false }));
      if (episodeRef.current) {
        podcastDB.saveProgress({
          episodeId: episodeRef.current.id,
          currentTime: audio.currentTime,
          duration: isFinite(audio.duration) ? audio.duration : 0,
          completed: false,
          lastPlayedAt: Date.now(),
        });
      }
    };
    const onEnded = () => {
      if (episodeRef.current) {
        podcastDB.saveProgress({
          episodeId: episodeRef.current.id,
          currentTime: audio.duration,
          duration: audio.duration,
          completed: true,
          lastPlayedAt: Date.now(),
        });
      }
      // Auto-advance: upNext first, then feed
      const nextUpNext = [...upNextRef.current];
      if (nextUpNext.length > 0) {
        const next = nextUpNext.shift()!;
        upNextRef.current = nextUpNext;
        setState((s) => ({ ...s, upNext: nextUpNext }));
        playEpisodeRef.current(next.episode, next.podcast);
      } else {
        const nextFeedIdx = feedIndexRef.current + 1;
        if (nextFeedIdx < feedRef.current.length) {
          feedIndexRef.current = nextFeedIdx;
          const next = feedRef.current[nextFeedIdx];
          setState((s) => ({ ...s, feedIndex: nextFeedIdx }));
          playEpisodeRef.current(next.episode, next.podcast);
        } else {
          setState((s) => ({ ...s, isPlaying: false }));
        }
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Periodic progress save every 15s while playing
  useEffect(() => {
    if (!state.isPlaying || !state.episode) return;
    const id = setInterval(() => {
      if (episodeRef.current && !audio.paused) {
        podcastDB.saveProgress({
          episodeId: episodeRef.current.id,
          currentTime: audio.currentTime,
          duration: isFinite(audio.duration) ? audio.duration : 0,
          completed: false,
          lastPlayedAt: Date.now(),
        });
      }
    }, 15_000);
    return () => clearInterval(id);
  }, [state.isPlaying, state.episode]);

  // Play an episode — updates feedIndex if episode is in feed, preserves upNext
  const play = useCallback(async (episode: Episode, podcast: Podcast) => {
    if (episodeRef.current?.id === episode.id) {
      audio.play().catch(console.error);
      return;
    }
    const idx = feedRef.current.findIndex((q) => q.episode.id === episode.id);
    if (idx >= 0) {
      feedIndexRef.current = idx;
      setState((s) => ({ ...s, feedIndex: idx }));
    }
    await playEpisode(episode, podcast);
  }, [playEpisode]);

  // Set the feed and play from a specific index — preserves upNext
  const playFromFeed = useCallback(async (items: QueueItem[], index: number) => {
    feedRef.current = items;
    feedIndexRef.current = index;
    setState((s) => ({ ...s, feed: items, feedIndex: index }));
    const item = items[index];
    if (item) await playEpisode(item.episode, item.podcast);
  }, [playEpisode]);

  // Play a specific item from upNext by index
  const playUpNextItem = useCallback(async (index: number) => {
    const item = upNextRef.current[index];
    if (!item) return;
    const newUpNext = upNextRef.current.filter((_, i) => i !== index);
    upNextRef.current = newUpNext;
    setState((s) => ({ ...s, upNext: newUpNext }));
    // Try to find the episode in feed and sync feedIndex
    const feedIdx = feedRef.current.findIndex((q) => q.episode.id === item.episode.id);
    if (feedIdx >= 0) {
      feedIndexRef.current = feedIdx;
      setState((s) => ({ ...s, feedIndex: feedIdx }));
    }
    await playEpisode(item.episode, item.podcast);
  }, [playEpisode]);

  // Play a specific item from feed by feedIndex
  const playFeedItem = useCallback(async (index: number) => {
    const item = feedRef.current[index];
    if (!item) return;
    feedIndexRef.current = index;
    setState((s) => ({ ...s, feedIndex: index }));
    await playEpisode(item.episode, item.podcast);
  }, [playEpisode]);

  const playNext = useCallback(() => {
    const nextUpNext = [...upNextRef.current];
    if (nextUpNext.length > 0) {
      const next = nextUpNext.shift()!;
      upNextRef.current = nextUpNext;
      setState((s) => ({ ...s, upNext: nextUpNext }));
      playEpisodeRef.current(next.episode, next.podcast);
    } else {
      const nextFeedIdx = feedIndexRef.current + 1;
      if (nextFeedIdx < feedRef.current.length) {
        feedIndexRef.current = nextFeedIdx;
        setState((s) => ({ ...s, feedIndex: nextFeedIdx }));
        playEpisodeRef.current(feedRef.current[nextFeedIdx].episode, feedRef.current[nextFeedIdx].podcast);
      }
    }
  }, []);

  const playPrevious = useCallback(() => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const prevFeedIdx = feedIndexRef.current - 1;
    if (prevFeedIdx >= 0) {
      feedIndexRef.current = prevFeedIdx;
      setState((s) => ({ ...s, feedIndex: prevFeedIdx }));
      playEpisodeRef.current(feedRef.current[prevFeedIdx].episode, feedRef.current[prevFeedIdx].podcast);
    } else {
      audio.currentTime = 0;
    }
  }, []);

  // Add to end of personal queue
  const addToQueue = useCallback((episode: Episode, podcast: Podcast) => {
    const newUpNext = [...upNextRef.current, { episode, podcast }];
    upNextRef.current = newUpNext;
    setState((s) => ({ ...s, upNext: newUpNext }));
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    const newUpNext = upNextRef.current.filter((_, i) => i !== index);
    upNextRef.current = newUpNext;
    setState((s) => ({ ...s, upNext: newUpNext }));
  }, []);

  // Set the feed without changing playback or upNext
  const setFeed = useCallback((items: QueueItem[]) => {
    feedRef.current = items;
    setState((s) => ({ ...s, feed: items }));
  }, []);

  const togglePlay = useCallback(() => {
    if (audio.paused) audio.play().catch(console.error);
    else audio.pause();
  }, []);

  const seek = useCallback((time: number) => {
    audio.currentTime = time;
    setState((s) => ({ ...s, currentTime: time }));
  }, []);

  const skip = useCallback((seconds: number) => {
    audio.currentTime = Math.max(
      0,
      Math.min(isFinite(audio.duration) ? audio.duration : 0, audio.currentTime + seconds),
    );
  }, []);

  const toggleExpanded = useCallback(() => {
    setState((s) => ({ ...s, isExpanded: !s.isExpanded }));
  }, []);

  return {
    state,
    play,
    playFromFeed,
    playUpNextItem,
    playFeedItem,
    playNext,
    playPrevious,
    addToQueue,
    removeFromQueue,
    setFeed,
    togglePlay,
    seek,
    skip,
    toggleExpanded,
  };
}
