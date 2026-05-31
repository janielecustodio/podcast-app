import type { Podcast, Episode } from './types';

const CORS_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];

async function fetchFeed(feedUrl: string): Promise<string> {
  const encoded = encodeURIComponent(feedUrl);
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy + encoded);
      if (res.ok) return res.text();
    } catch {
      // try next proxy
    }
  }
  throw new Error('All proxies failed to fetch feed');
}

export async function searchPodcasts(query: string): Promise<Podcast[]> {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&entity=podcast&limit=15`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.results as any[])
    .filter((r) => r.feedUrl)
    .map((r) => ({
      id: String(r.collectionId),
      title: r.collectionName ?? 'Unknown',
      author: r.artistName ?? '',
      artworkUrl: r.artworkUrl600 ?? r.artworkUrl100 ?? '',
      feedUrl: r.feedUrl,
      addedAt: Date.now(),
    }));
}

function parseDuration(raw: string | null | undefined): number {
  if (!raw) return 0;
  const parts = raw.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(raw) || 0;
}

function getItunesNs(el: Element, localName: string): string | null {
  // Try both with and without the namespace prefix
  const withNs = el.getElementsByTagNameNS(
    'http://www.itunes.com/dtds/podcast-1.0.dtd',
    localName,
  )[0];
  return withNs?.textContent ?? null;
}

function getItunesAttr(el: Element, localName: string, attr: string): string | null {
  const withNs = el.getElementsByTagNameNS(
    'http://www.itunes.com/dtds/podcast-1.0.dtd',
    localName,
  )[0];
  return withNs?.getAttribute(attr) ?? null;
}

export async function fetchEpisodes(podcast: Podcast): Promise<Episode[]> {
  const text = await fetchFeed(podcast.feedUrl);

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');

  const items = Array.from(doc.querySelectorAll('item'));

  return items
    .slice(0, 75)
    .map((item) => {
      const enclosure = item.querySelector('enclosure');
      const guid =
        item.querySelector('guid')?.textContent?.trim() ||
        enclosure?.getAttribute('url') ||
        '';
      const pubDate = item.querySelector('pubDate')?.textContent;
      const duration = getItunesNs(item, 'duration');
      const episodeArt = getItunesAttr(item, 'image', 'href');

      return {
        id: `${podcast.id}::${guid}`,
        podcastId: podcast.id,
        title: item.querySelector('title')?.textContent?.trim() || 'Untitled',
        description: item.querySelector('description')?.textContent?.trim() || '',
        audioUrl: enclosure?.getAttribute('url') || '',
        duration: parseDuration(duration),
        publishedAt: pubDate ? new Date(pubDate).getTime() : 0,
        artworkUrl: episodeArt || undefined,
      };
    })
    .filter((e) => Boolean(e.audioUrl));
}
