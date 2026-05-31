import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── parseDuration (extracted for testing) ────────────────────────────────────
function parseDuration(raw: string | null | undefined): number {
  if (!raw) return 0;
  const parts = raw.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(raw) || 0;
}

describe('parseDuration', () => {
  it('parses HH:MM:SS', () => {
    expect(parseDuration('1:30:00')).toBe(5400);
    expect(parseDuration('2:06:00')).toBe(7560);
  });
  it('parses MM:SS', () => {
    expect(parseDuration('23:45')).toBe(1425);
  });
  it('parses raw seconds string', () => {
    expect(parseDuration('3600')).toBe(3600);
  });
  it('returns 0 for null/undefined/empty', () => {
    expect(parseDuration(null)).toBe(0);
    expect(parseDuration(undefined)).toBe(0);
    expect(parseDuration('')).toBe(0);
  });
  it('returns 0 for non-numeric garbage', () => {
    expect(parseDuration('abc')).toBe(0);
  });
});

// ── CORS proxy chain ──────────────────────────────────────────────────────────
describe('CORS proxy chain', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns on first successful proxy', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, text: async () => '<rss/>' });

    const xml = await fetchFeedWithMock('https://example.com/feed.xml', fetchMock);
    expect(xml).toBe('<rss/>');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls through to second proxy if first fails', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ ok: true, text: async () => '<rss/>' });

    const xml = await fetchFeedWithMock('https://example.com/feed.xml', fetchMock);
    expect(xml).toBe('<rss/>');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls through to allorigins JSON fallback when all raw proxies fail', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValue(new Error('blocked'))
      // allorigins JSON fallback (6th call)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ contents: '<rss fallback/>' }) });

    // 5 raw proxies fail, then JSON fallback succeeds
    fetchMock
      .mockRejectedValueOnce(new Error('blocked'))
      .mockRejectedValueOnce(new Error('blocked'))
      .mockRejectedValueOnce(new Error('blocked'))
      .mockRejectedValueOnce(new Error('blocked'))
      .mockRejectedValueOnce(new Error('blocked'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ contents: '<rss fallback/>' }) });

    const xml = await fetchFeedWithMock('https://example.com/feed.xml', fetchMock);
    expect(xml).toBe('<rss fallback/>');
  });

  it('throws when all proxies including fallback fail', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('blocked'));
    await expect(fetchFeedWithMock('https://example.com/feed.xml', fetchMock))
      .rejects.toThrow('All proxies failed');
  });
});

// Inline version of fetchFeed that accepts a fetch mock for testing
async function fetchFeedWithMock(
  feedUrl: string,
  fetchFn: typeof fetch,
): Promise<string> {
  const RAW_PROXIES = [
    'https://podcast-proxy.janielecustodio.workers.dev/?url=',
    'https://corsproxy.io/?url=',
    'https://corsproxy.org/?',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://api.allorigins.win/raw?url=',
  ];
  const encoded = encodeURIComponent(feedUrl);

  for (const proxy of RAW_PROXIES) {
    try {
      const res = await fetchFn(proxy + encoded, { signal: AbortSignal.timeout(8000) });
      if (res.ok) return res.text();
    } catch { /* try next */ }
  }

  try {
    const res = await fetchFn(`https://api.allorigins.win/get?url=${encoded}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json() as { contents?: string };
      if (data.contents) return data.contents;
    }
  } catch { /* fall through */ }

  throw new Error('All proxies failed to fetch feed');
}
