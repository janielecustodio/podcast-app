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

export interface PlayerState {
  episode: Episode | null;
  podcast: Podcast | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isExpanded: boolean;
}
