import { describe, it, expect } from 'vitest';
import type { QueueItem, Episode, Podcast } from '../types';

// ── Test fixtures ─────────────────────────────────────────────────────────────
function makeEpisode(id: string, extra: Partial<Episode> = {}): Episode {
  return {
    id,
    podcastId: 'pod1',
    title: `Episode ${id}`,
    description: 'A long description that should be stripped before storage.',
    audioUrl: `https://example.com/${id}.mp3`,
    duration: 3600,
    publishedAt: Date.now(),
    ...extra,
  };
}

function makePodcast(id = 'pod1'): Podcast {
  return {
    id,
    title: 'Test Podcast',
    author: 'Author',
    artworkUrl: 'https://example.com/art.jpg',
    feedUrl: 'https://example.com/feed.xml',
    addedAt: Date.now(),
  };
}

function makeItem(episodeId: string, extra: Partial<Episode> = {}): QueueItem {
  return { episode: makeEpisode(episodeId, extra), podcast: makePodcast() };
}

// ── slim() — strips descriptions before localStorage ─────────────────────────
function slim(items: QueueItem[]): QueueItem[] {
  return items.map((q) => ({
    episode: { ...q.episode, description: '' },
    podcast: q.podcast,
  }));
}

describe('slim()', () => {
  it('strips descriptions from all items', () => {
    const items = [makeItem('ep1'), makeItem('ep2')];
    const result = slim(items);
    expect(result[0].episode.description).toBe('');
    expect(result[1].episode.description).toBe('');
  });

  it('preserves all other episode fields', () => {
    const items = [makeItem('ep1')];
    const result = slim(items);
    expect(result[0].episode.id).toBe('ep1');
    expect(result[0].episode.audioUrl).toBe('https://example.com/ep1.mp3');
    expect(result[0].episode.duration).toBe(3600);
  });

  it('preserves podcast data', () => {
    const items = [makeItem('ep1')];
    const result = slim(items);
    expect(result[0].podcast.id).toBe('pod1');
  });

  it('returns empty array for empty input', () => {
    expect(slim([])).toEqual([]);
  });
});

// ── Queue operations ──────────────────────────────────────────────────────────
function addToQueueLast(upNext: QueueItem[], item: QueueItem): QueueItem[] {
  return [...upNext, item];
}

function addToQueueFirst(upNext: QueueItem[], item: QueueItem): QueueItem[] {
  return [item, ...upNext];
}

function removeFromQueue(upNext: QueueItem[], index: number): QueueItem[] {
  return upNext.filter((_, i) => i !== index);
}

function reorderUpNext(upNext: QueueItem[], from: number, to: number): QueueItem[] {
  const result = [...upNext];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}

describe('addToQueueLast()', () => {
  it('appends to end', () => {
    const q = [makeItem('ep1'), makeItem('ep2')];
    const result = addToQueueLast(q, makeItem('ep3'));
    expect(result[2].episode.id).toBe('ep3');
    expect(result).toHaveLength(3);
  });
});

describe('addToQueueFirst()', () => {
  it('inserts at start', () => {
    const q = [makeItem('ep1'), makeItem('ep2')];
    const result = addToQueueFirst(q, makeItem('ep0'));
    expect(result[0].episode.id).toBe('ep0');
    expect(result).toHaveLength(3);
  });
});

describe('removeFromQueue()', () => {
  it('removes item at index', () => {
    const q = [makeItem('ep1'), makeItem('ep2'), makeItem('ep3')];
    const result = removeFromQueue(q, 1);
    expect(result.map((i) => i.episode.id)).toEqual(['ep1', 'ep3']);
  });

  it('does not mutate original', () => {
    const q = [makeItem('ep1'), makeItem('ep2')];
    removeFromQueue(q, 0);
    expect(q).toHaveLength(2);
  });
});

describe('reorderUpNext()', () => {
  it('moves item forward', () => {
    const q = [makeItem('ep1'), makeItem('ep2'), makeItem('ep3')];
    const result = reorderUpNext(q, 0, 2);
    expect(result.map((i) => i.episode.id)).toEqual(['ep2', 'ep3', 'ep1']);
  });

  it('moves item backward', () => {
    const q = [makeItem('ep1'), makeItem('ep2'), makeItem('ep3')];
    const result = reorderUpNext(q, 2, 0);
    expect(result.map((i) => i.episode.id)).toEqual(['ep3', 'ep1', 'ep2']);
  });

  it('does not mutate original', () => {
    const q = [makeItem('ep1'), makeItem('ep2')];
    reorderUpNext(q, 0, 1);
    expect(q[0].episode.id).toBe('ep1');
  });
});

// ── Auto-advance logic ────────────────────────────────────────────────────────
describe('auto-advance: upNext drains before feed advances', () => {
  it('plays first upNext item if available', () => {
    const upNext = [makeItem('next1'), makeItem('next2')];
    const feedIndex = 2;

    // Simulate onEnded logic
    const nextUpNext = [...upNext];
    let nextFeedIndex = feedIndex;
    let played: string | null = null;

    if (nextUpNext.length > 0) {
      const next = nextUpNext.shift()!;
      played = next.episode.id;
    } else {
      nextFeedIndex = feedIndex + 1;
    }

    expect(played).toBe('next1');
    expect(nextUpNext).toHaveLength(1);
    expect(nextFeedIndex).toBe(2); // feed index unchanged
  });

  it('advances feedIndex when upNext is empty', () => {
    const upNext: QueueItem[] = [];
    const feedIndex = 2;
    const feed = [makeItem('f0'), makeItem('f1'), makeItem('f2'), makeItem('f3')];

    let nextFeedIndex = feedIndex;
    let played: string | null = null;

    if (upNext.length > 0) {
      played = upNext[0].episode.id;
    } else {
      nextFeedIndex = feedIndex + 1;
      played = feed[nextFeedIndex].episode.id;
    }

    expect(played).toBe('f3');
    expect(nextFeedIndex).toBe(3);
  });
});

// ── Feed filtering ─────────────────────────────────────────────────────────────
describe('feed filtering', () => {
  it('excludes completed episodes from upcoming feed', () => {
    const feed = [makeItem('f1'), makeItem('f2'), makeItem('f3')];
    const feedIndex = 0;
    const progress: Record<string, { completed: boolean; currentTime: number }> = {
      'f2': { completed: true, currentTime: 3600 },
    };

    const upcoming = feed
      .slice(feedIndex + 1)
      .map((item, i) => ({ item, actualIdx: feedIndex + 1 + i }))
      .filter(({ item }) => !progress[item.episode.id]?.completed);

    expect(upcoming.map(({ item }) => item.episode.id)).toEqual(['f3']);
  });

  it('shows in-progress episodes (not completed)', () => {
    const feed = [makeItem('f1'), makeItem('f2')];
    const feedIndex = 0;
    const progress: Record<string, { completed: boolean; currentTime: number }> = {
      'f2': { completed: false, currentTime: 900 },
    };

    const upcoming = feed
      .slice(feedIndex + 1)
      .filter((item) => !progress[item.episode.id]?.completed);

    expect(upcoming.map((i) => i.episode.id)).toEqual(['f2']);
  });
});

// ── Feed sort order ────────────────────────────────────────────────────────────
describe('feed sort order', () => {
  it('sorts newest to oldest by publishedAt', () => {
    const episodes = [
      makeEpisode('old', { publishedAt: 1000 }),
      makeEpisode('new', { publishedAt: 3000 }),
      makeEpisode('mid', { publishedAt: 2000 }),
    ];
    const sorted = [...episodes].sort((a, b) => b.publishedAt - a.publishedAt);
    expect(sorted.map((e) => e.id)).toEqual(['new', 'mid', 'old']);
  });
});
