import { Plus, LogOut } from 'lucide-react';
import type { Podcast } from '../types';
import { supabase } from '../supabase';

interface Props {
  podcasts: Podcast[];
  onAddPodcast: () => void;
  onSelectPodcast: (podcast: Podcast) => void;
}

export function Library({ podcasts, onAddPodcast, onSelectPodcast }: Props) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6 pt-2">
        <h1 className="text-2xl font-bold text-white">Library</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-9 h-9 rounded-full bg-gray-900 flex items-center justify-center active:bg-gray-800"
            title="Sign out"
          >
            <LogOut size={16} className="text-gray-400" />
          </button>
          <button
            onClick={onAddPodcast}
            className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center active:bg-purple-700"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>
      </div>

      {podcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-900 flex items-center justify-center mb-4">
            <span className="text-3xl">🎙️</span>
          </div>
          <p className="text-white text-lg font-semibold mb-1">No podcasts yet</p>
          <p className="text-gray-500 text-sm">Tap + to add your first podcast</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {podcasts.map((podcast) => (
            <button
              key={podcast.id}
              onClick={() => onSelectPodcast(podcast)}
              className="flex flex-col items-start text-left active:opacity-70"
            >
              <img
                src={podcast.artworkUrl}
                alt={podcast.title}
                className="w-full aspect-square rounded-2xl object-cover mb-2 shadow-lg"
              />
              <p className="text-white text-sm font-semibold truncate w-full leading-tight">
                {podcast.title}
              </p>
              <p className="text-gray-500 text-xs truncate w-full mt-0.5">{podcast.author}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
