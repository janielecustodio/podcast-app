export interface Podcast {
  id: string;
  title: string;
  author: string;
  artworkUrl: string;
  feedUrl: string;
  addedAt: number;
}

export interface Episode {
  id: string;
  podcastId: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: number; // seconds
  publishedAt: number;
  artworkUrl?: string;
}

export interface PlaybackProgress {
  episodeId: string;
  currentTime: number;
  duration: number;
  completed: boolean;
  lastPlayedAt: number;
}

export interface QueueItem {
  episode: Episode;
  podcast: Podcast;
}

export interface PlayerState {
  episode: Episode | null;
  podcast: Podcast | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  upNext: QueueItem[];   // manually added personal queue
  feed: QueueItem[];     // auto-populated from subscriptions
  feedIndex: number;     // current position in feed (-1 = not playing from feed)
}
