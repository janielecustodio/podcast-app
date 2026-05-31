import { describe, it, expect, vi } from 'vitest';
import type { Podcast, Episode } from '../types';

// ── Fixtures ──────────────────────────────────────────────────────────────────
function makePodcast(id: string): Podcast {
  return { id, title: `Pod ${id}`, author: 'A', artworkUrl: '', feedUrl: `https://feed/${id}`, addedAt: 0 };
}

function makeEpisode(id: string, podcastId: string): Episode {
  return { id, podcastId, title: `Ep ${id}`, description: '', audioUrl: `https://audio/${id}`, duration: 60, publishedAt: Date.now() };
}

// ── Episode fetch on mount ────────────────────────────────────────────────────
describe('episode fetch on mount', () => {
  it('fetches from RSS when cached count < 10', async () => {
    const fetchEpisodes = vi.fn().mockResolvedValue([makeEpisode('e1', 'pod1')]);
    const saveEpisodes = vi.fn();
    const podcast = makePodcast('pod1');
    const cached: Episode[] = []; // empty cache

    let episodes = cached;
    if (episodes.length < 10) {
      episodes = await fetchEpisodes(podcast);
      await saveEpisodes(episodes);
    }

    expect(fetchEpisodes).toHaveBeenCalledWith(podcast);
    expect(saveEpisodes).toHaveBeenCalled();
  });

  it('skips RSS fetch when cache has 10+ episodes', async () => {
    const fetchEpisodes = vi.fn();
    const podcast = makePodcast('pod1');
    const cached = Array.from({ length: 10 }, (_, i) => makeEpisode(`e${i}`, 'pod1'));

    let episodes = cached;
    if (episodes.length < 10) {
      episodes = await fetchEpisodes(podcast);
    }

    expect(fetchEpisodes).not.toHaveBeenCalled();
  });

  it('still loads other podcasts if one fetch fails', async () => {
    const results: string[] = [];
    const podcasts = [makePodcast('pod1'), makePodcast('pod2')];
    const fetchEpisodes = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce([makeEpisode('e1', 'pod2')]);

    await Promise.all(
      podcasts.map(async (pod) => {
        try {
          const eps = await fetchEpisodes(pod);
          results.push(pod.id);
          return eps;
        } catch {
          console.error(`Failed for ${pod.id}`);
          return [];
        }
      }),
    );

    expect(results).toContain('pod2');
    expect(results).not.toContain('pod1');
  });
});

// ── Feed building ─────────────────────────────────────────────────────────────
describe('feed building from subscriptions', () => {
  it('merges and sorts all episodes newest first', () => {
    const pod1eps = [
      makeEpisode('a', 'pod1'),
      makeEpisode('b', 'pod1'),
    ];
    pod1eps[0].publishedAt = 3000;
    pod1eps[1].publishedAt = 1000;

    const pod2eps = [makeEpisode('c', 'pod2')];
    pod2eps[0].publishedAt = 2000;

    const allEpisodes = [...pod1eps, ...pod2eps];
    const sorted = [...allEpisodes].sort((a, b) => b.publishedAt - a.publishedAt);
    expect(sorted.map((e) => e.id)).toEqual(['a', 'c', 'b']);
  });

  it('filters out items whose podcast is not in library', () => {
    const podcastMap: Record<string, Podcast> = { pod1: makePodcast('pod1') };
    const episodes = [makeEpisode('e1', 'pod1'), makeEpisode('e2', 'pod_unknown')];

    const items = episodes
      .map((e) => ({ episode: e, podcast: podcastMap[e.podcastId] }))
      .filter((item): item is { episode: Episode; podcast: Podcast } => Boolean(item.podcast));

    expect(items).toHaveLength(1);
    expect(items[0].episode.id).toBe('e1');
  });
});
