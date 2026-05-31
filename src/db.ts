import { openDB, type IDBPDatabase } from 'idb';
import type { Podcast, Episode, PlaybackProgress } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: IDBPDatabase<any>;

async function getDB() {
  if (!db) {
    db = await openDB('podcast-app', 1, {
      upgrade(database) {
        const podcastStore = database.createObjectStore('podcasts', { keyPath: 'id' });
        podcastStore.createIndex('by-addedAt', 'addedAt');

        const episodeStore = database.createObjectStore('episodes', { keyPath: 'id' });
        episodeStore.createIndex('by-podcastId', 'podcastId');
        episodeStore.createIndex('by-publishedAt', 'publishedAt');

        database.createObjectStore('progress', { keyPath: 'episodeId' });
      },
    });
  }
  return db;
}

export const podcastDB = {
  async getPodcasts(): Promise<Podcast[]> {
    const d = await getDB();
    const all: Podcast[] = await d.getAll('podcasts');
    return all.sort((a, b) => a.addedAt - b.addedAt);
  },

  async addPodcast(podcast: Podcast): Promise<void> {
    const d = await getDB();
    await d.put('podcasts', podcast);
  },

  async removePodcast(id: string): Promise<void> {
    const d = await getDB();
    await d.delete('podcasts', id);
    const episodes: Episode[] = await d.getAllFromIndex('episodes', 'by-podcastId', id);
    const tx = d.transaction('episodes', 'readwrite');
    await Promise.all(episodes.map((e) => tx.store.delete(e.id)));
    await tx.done;
  },

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

  async getProgress(episodeId: string): Promise<PlaybackProgress | undefined> {
    const d = await getDB();
    return d.get('progress', episodeId);
  },

  async saveProgress(progress: PlaybackProgress): Promise<void> {
    const d = await getDB();
    await d.put('progress', progress);
  },

  async getAllProgress(): Promise<PlaybackProgress[]> {
    const d = await getDB();
    return d.getAll('progress');
  },
};
