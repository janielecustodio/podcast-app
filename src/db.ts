import { openDB, type IDBPDatabase } from 'idb';
import type { Podcast, Episode, PlaybackProgress } from './types';
import { supabase } from './supabase';

// ── IndexedDB (episode cache only) ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: IDBPDatabase<any>;

async function getDB() {
  if (!db) {
    db = await openDB('podcast-app', 1, {
      upgrade(database) {
        const episodeStore = database.createObjectStore('episodes', { keyPath: 'id' });
        episodeStore.createIndex('by-podcastId', 'podcastId');
        episodeStore.createIndex('by-publishedAt', 'publishedAt');
      },
    });
  }
  return db;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function rowToPodcast(row: Record<string, unknown>): Podcast {
  return {
    id: row.id as string,
    title: row.title as string,
    author: row.author as string,
    artworkUrl: row.artwork_url as string,
    feedUrl: row.feed_url as string,
    addedAt: row.added_at as number,
  };
}

function rowToProgress(row: Record<string, unknown>): PlaybackProgress {
  return {
    episodeId: row.episode_id as string,
    currentTime: row.playback_time as number,
    duration: row.duration as number,
    completed: row.completed as boolean,
    lastPlayedAt: row.last_played_at as number,
  };
}

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const podcastDB = {
  // Podcasts — Supabase
  async getPodcasts(): Promise<Podcast[]> {
    const { data, error } = await supabase
      .from('podcasts')
      .select('*')
      .order('added_at', { ascending: true });
    if (error) { console.error('getPodcasts:', error); return []; }
    return (data ?? []).map(rowToPodcast);
  },

  async addPodcast(podcast: Podcast): Promise<void> {
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase.from('podcasts').upsert({
      id: podcast.id,
      user_id: userId,
      title: podcast.title,
      author: podcast.author,
      artwork_url: podcast.artworkUrl,
      feed_url: podcast.feedUrl,
      added_at: podcast.addedAt,
    });
    if (error) console.error('addPodcast:', error);
  },

  async removePodcast(id: string): Promise<void> {
    const { error } = await supabase.from('podcasts').delete().eq('id', id);
    if (error) { console.error('removePodcast:', error); return; }
    // Also remove cached episodes from IndexedDB
    const d = await getDB();
    const episodes: Episode[] = await d.getAllFromIndex('episodes', 'by-podcastId', id);
    const tx = d.transaction('episodes', 'readwrite');
    await Promise.all(episodes.map((e) => tx.store.delete(e.id)));
    await tx.done;
  },

  // Episodes — IndexedDB cache (fetched from RSS, not user data)
  async getEpisodes(podcastId: string): Promise<Episode[]> {
    const d = await getDB();
    const episodes: Episode[] = await d.getAllFromIndex('episodes', 'by-podcastId', podcastId);
    return episodes.sort((a, b) => b.publishedAt - a.publishedAt);
  },

  async getAllEpisodes(): Promise<Episode[]> {
    const d = await getDB();
    return d.getAll('episodes');
  },

  async saveEpisodes(episodes: Episode[]): Promise<void> {
    const d = await getDB();
    const tx = d.transaction('episodes', 'readwrite');
    await Promise.all(episodes.map((e) => tx.store.put(e)));
    await tx.done;
  },

  // Progress — Supabase
  async getProgress(episodeId: string): Promise<PlaybackProgress | undefined> {
    const { data, error } = await supabase
      .from('progress')
      .select('*')
      .eq('episode_id', episodeId)
      .maybeSingle();
    if (error) { console.error('getProgress:', error); return undefined; }
    if (!data) return undefined;
    return rowToProgress(data);
  },

  async saveProgress(progress: PlaybackProgress): Promise<void> {
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase.from('progress').upsert({
      episode_id: progress.episodeId,
      user_id: userId,
      playback_time: progress.currentTime,
      duration: progress.duration,
      completed: progress.completed,
      last_played_at: progress.lastPlayedAt,
    });
    if (error) console.error('saveProgress:', error);
  },

  async getAllProgress(): Promise<PlaybackProgress[]> {
    const { data, error } = await supabase.from('progress').select('*');
    if (error) { console.error('getAllProgress:', error); return []; }
    return (data ?? []).map(rowToProgress);
  },
};
