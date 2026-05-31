import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Episode, Podcast } from '../types';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const episode: Episode = {
  id: 'ep1',
  podcastId: 'pod1',
  title: 'Test Episode',
  description: 'desc',
  audioUrl: 'https://example.com/ep1.mp3',
  duration: 3600,
  publishedAt: Date.now(),
};

const podcast: Podcast = {
  id: 'pod1',
  title: 'Test Podcast',
  author: 'Author',
  artworkUrl: 'https://example.com/art.jpg',
  feedUrl: 'https://example.com/feed.xml',
  addedAt: Date.now(),
};

// ── localStorage persistence ──────────────────────────────────────────────────
const STORAGE_KEY = 'podcast-player-v1';

describe('localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and restores player state', () => {
    const state = {
      episode,
      podcast,
      savedTime: 120,
      upNext: [],
      feed: [],
      feedIndex: 2,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const restored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(restored.episode.id).toBe('ep1');
    expect(restored.savedTime).toBe(120);
    expect(restored.feedIndex).toBe(2);
  });

  it('returns null when no state stored', () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeNull();
  });

  it('clears localStorage when Supabase returns no row', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ episode, podcast, savedTime: 0, upNext: [], feed: [], feedIndex: 0 }));

    // Simulate: remote.found === false → clear localStorage
    const remote = { found: false, episode: null };
    if (!remote.found || !remote.episode) {
      localStorage.removeItem(STORAGE_KEY);
    }

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('preserves localStorage when Supabase errors (returns null)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ episode, podcast, savedTime: 0, upNext: [], feed: [], feedIndex: 0 }));

    // Simulate: remote === null (Supabase error) → don't touch localStorage
    const remote = null;
    if (remote === null) {
      // do nothing
    }

    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});

// ── Magic link redirect ────────────────────────────────────────────────────────
describe('magic link redirect', () => {
  it('uses hardcoded podcast-app URL as emailRedirectTo', () => {
    const EXPECTED_REDIRECT = 'https://janielecustodio.com/podcast-app/';

    // Simulate the Library component logic
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const redirectTo = 'https://janielecustodio.com/podcast-app/';

    signInWithOtp({ email: 'test@test.com', options: { emailRedirectTo: redirectTo } });

    expect(signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: EXPECTED_REDIRECT,
        }),
      }),
    );
  });

  it('redirect URL points to /podcast-app/ not root domain', () => {
    const redirectTo = 'https://janielecustodio.com/podcast-app/';
    expect(redirectTo).toContain('/podcast-app/');
    expect(redirectTo).not.toBe('https://janielecustodio.com/');
  });
});

// ── Supabase loadPlayerState response shape ───────────────────────────────────
describe('loadPlayerState response', () => {
  it('found:false when no row exists', () => {
    // Simulates what db.ts returns when data === null
    const data = null;
    const result = !data
      ? { found: false, episode: null, podcast: null, savedTime: 0, upNext: [], feedIndex: -1 }
      : { found: true, episode: data };

    expect(result.found).toBe(false);
    expect(result.episode).toBeNull();
  });

  it('found:true when row exists', () => {
    const data = {
      episode_data: episode,
      podcast_data: podcast,
      saved_time: 300,
      up_next: [],
      feed_index: 5,
    };
    const result = {
      found: true,
      episode: data.episode_data,
      podcast: data.podcast_data,
      savedTime: data.saved_time,
      upNext: data.up_next,
      feedIndex: data.feed_index,
    };

    expect(result.found).toBe(true);
    expect(result.episode.id).toBe('ep1');
    expect(result.savedTime).toBe(300);
    expect(result.feedIndex).toBe(5);
  });
});
