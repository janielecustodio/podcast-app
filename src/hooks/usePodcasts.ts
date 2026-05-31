import { useState, useEffect, useCallback } from 'react';
import type { Podcast, Episode } from '../types';
import { podcastDB } from '../db';
import { fetchEpisodes } from '../api';

export function usePodcasts() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [episodesByPodcast, setEpisodesByPodcast] = useState<Record<string, Episode[]>>({});
  const [loading, setLoading] = useState(true);

  // Load everything from DB on mount, fetching from RSS for any podcast
  // with fewer than 10 cached episodes (handles new devices / empty cache)
  useEffect(() => {
    async function init() {
      const pods = await podcastDB.getPodcasts();
      setPodcasts(pods);

      const map: Record<string, Episode[]> = {};
      await Promise.all(
        pods.map(async (pod) => {
          let eps = await podcastDB.getEpisodes(pod.id);
          if (eps.length < 10) {
            try {
              eps = await fetchEpisodes(pod);
              await podcastDB.saveEpisodes(eps);
            } catch (e) {
              console.error('Failed to fetch episodes for', pod.title, e);
            }
          }
          if (eps.length > 0) map[pod.id] = eps;
        }),
      );
      setEpisodesByPodcast(map);
      setLoading(false);
    }
    init();
  }, []);

  const addPodcast = useCallback(async (podcast: Podcast) => {
    await podcastDB.addPodcast(podcast);
    setPodcasts((prev) => [...prev, podcast]);
    // Fetch episodes in background
    try {
      const episodes = await fetchEpisodes(podcast);
      await podcastDB.saveEpisodes(episodes);
      setEpisodesByPodcast((prev) => ({ ...prev, [podcast.id]: episodes }));
    } catch (e) {
      console.error('Failed to fetch episodes for', podcast.title, e);
    }
  }, []);

  const removePodcast = useCallback(async (id: string) => {
    await podcastDB.removePodcast(id);
    setPodcasts((prev) => prev.filter((p) => p.id !== id));
    setEpisodesByPodcast((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const loadEpisodes = useCallback(
    async (podcast: Podcast): Promise<Episode[]> => {
      if (episodesByPodcast[podcast.id]?.length) return episodesByPodcast[podcast.id];

      let episodes = await podcastDB.getEpisodes(podcast.id);
      if (episodes.length === 0) {
        episodes = await fetchEpisodes(podcast);
        await podcastDB.saveEpisodes(episodes);
      }
      setEpisodesByPodcast((prev) => ({ ...prev, [podcast.id]: episodes }));
      return episodes;
    },
    [episodesByPodcast],
  );

  const refreshEpisodes = useCallback(async (podcast: Podcast): Promise<Episode[]> => {
    const episodes = await fetchEpisodes(podcast);
    await podcastDB.saveEpisodes(episodes);
    setEpisodesByPodcast((prev) => ({ ...prev, [podcast.id]: episodes }));
    return episodes;
  }, []);

  return { podcasts, episodesByPodcast, loading, addPodcast, removePodcast, loadEpisodes, refreshEpisodes };
}
