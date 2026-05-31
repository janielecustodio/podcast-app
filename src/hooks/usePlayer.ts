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
    queue: [],
    queueIndex: 0,
  });

  const episodeRef = useRef<Episode | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const queueIndexRef = useRef(0);

  const playItem = useCallback(async (items: QueueItem[], index: number) => {
    const item = items[index];
    if (!item) return;

    queueRef.current = items;
    queueIndexRef.current = index;
    episodeRef.current = item.episode;

    setState((s) => ({
      ...s,
      episode: item.episode,
      podcast: item.podcast,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      queue: items,
      queueIndex: index,
    }));

    audio.src = item.episode.audioUrl;
    const progress = await podcastDB.getProgress(item.episode.id);
    if (progress && !progress.completed && progress.currentTime > 10) {
      audio.currentTime = progress.currentTime;
    }
    audio.play().catch(console.error);
  }, []);

  // Keep a ref to the latest playItem so event handlers never go stale
  const playItemRef = useRef(playItem);
  useEffect(() => { playItemRef.current = playItem; }, [playItem]);

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
      // Auto-advance to next in queue
      const nextIdx = queueIndexRef.current + 1;
      if (nextIdx < queueRef.current.length) {
        playItemRef.current(queueRef.current, nextIdx);
      } else {
        setState((s) => ({ ...s, isPlaying: false }));
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

  // Play a single episode — if it's already in the queue, navigate there
  const play = useCallback(async (episode: Episode, podcast: Podcast) => {
    if (episodeRef.current?.id === episode.id) {
      audio.play().catch(console.error);
      return;
    }
    const existingIdx = queueRef.current.findIndex((q) => q.episode.id === episode.id);
    if (existingIdx >= 0) {
      await playItem(queueRef.current, existingIdx);
      return;
    }
    await playItem([{ episode, podcast }], 0);
  }, [playItem]);

  // Play from a specific queue context (replaces queue)
  const playQueue = useCallback(async (items: QueueItem[], index: number) => {
    await playItem(items, index);
  }, [playItem]);

  const playNext = useCallback(() => {
    const nextIdx = queueIndexRef.current + 1;
    if (nextIdx < queueRef.current.length) {
      playItemRef.current(queueRef.current, nextIdx);
    }
  }, []);

  // If > 3s into episode: restart. Otherwise: go to previous.
  const playPrevious = useCallback(() => {
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const prevIdx = queueIndexRef.current - 1;
    if (prevIdx >= 0) {
      playItemRef.current(queueRef.current, prevIdx);
    }
  }, []);

  // Insert episode after current position in queue
  const addToQueue = useCallback((episode: Episode, podcast: Podcast) => {
    const newQueue = [...queueRef.current];
    const insertAt = newQueue.length > 0 ? queueIndexRef.current + 1 : 0;
    newQueue.splice(insertAt, 0, { episode, podcast });
    queueRef.current = newQueue;
    setState((s) => ({ ...s, queue: newQueue }));
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    const newQueue = queueRef.current.filter((_, i) => i !== index);
    let newIndex = queueIndexRef.current;
    if (index < newIndex) newIndex -= 1;
    newIndex = Math.max(0, Math.min(newIndex, newQueue.length - 1));
    queueRef.current = newQueue;
    queueIndexRef.current = newIndex;
    setState((s) => ({ ...s, queue: newQueue, queueIndex: newIndex }));
  }, []);

  const setQueue = useCallback((items: QueueItem[]) => {
    queueRef.current = items;
    setState((s) => ({ ...s, queue: items }));
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
  };
}
