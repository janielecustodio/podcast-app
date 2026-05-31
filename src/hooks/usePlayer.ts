import { useState, useEffect, useCallback, useRef } from 'react';
import type { Episode, Podcast, PlayerState } from '../types';
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
  });

  const episodeRef = useRef<Episode | null>(null);

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
      setState((s) => ({ ...s, isPlaying: false }));
      if (episodeRef.current) {
        podcastDB.saveProgress({
          episodeId: episodeRef.current.id,
          currentTime: audio.duration,
          duration: audio.duration,
          completed: true,
          lastPlayedAt: Date.now(),
        });
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

  // Periodic progress save every 15 s while playing
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

  const play = useCallback(async (episode: Episode, podcast: Podcast) => {
    if (episodeRef.current?.id === episode.id) {
      audio.play().catch(console.error);
      return;
    }

    episodeRef.current = episode;
    setState((s) => ({ ...s, episode, podcast, isPlaying: false, currentTime: 0, duration: 0 }));
    audio.src = episode.audioUrl;

    const progress = await podcastDB.getProgress(episode.id);
    if (progress && !progress.completed && progress.currentTime > 10) {
      audio.currentTime = progress.currentTime;
    }

    audio.play().catch(console.error);
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

  return { state, play, togglePlay, seek, skip, toggleExpanded };
}
