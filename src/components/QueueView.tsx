import { useState, useEffect } from 'react';
import { X, GripVertical, ListEnd, ListStart } from 'lucide-react';
import { podcastDB } from '../db';
import type { PlaybackProgress } from '../types';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { QueueItem } from '../types';

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function AddMenu({
  onAddFirst,
  onAddLast,
  onClose,
}: {
  onAddFirst: () => void;
  onAddLast: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-8 z-50 bg-gray-800 rounded-xl shadow-xl overflow-hidden w-44 border border-gray-700">
        <button
          onClick={() => { onAddFirst(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-white active:bg-gray-700 border-b border-gray-700"
        >
          <ListStart size={15} className="text-purple-400" />
          Play next
        </button>
        <button
          onClick={() => { onAddLast(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-white active:bg-gray-700"
        >
          <ListEnd size={15} className="text-purple-400" />
          Add to queue
        </button>
      </div>
    </>
  );
}

function SortableUpNextItem({
  item,
  index,
  onPlay,
  onRemove,
}: {
  item: QueueItem;
  index: number;
  onPlay: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.episode.id + '-' + index });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const art = item.episode.artworkUrl || item.podcast.artworkUrl;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-b border-gray-900 px-4 py-3 flex items-center gap-3 bg-black"
    >
      {/* Drag handle */}
      <button
        className="text-gray-700 flex-shrink-0 touch-none cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>

      <button onClick={onPlay} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <img src={art} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate text-white leading-snug">{item.episode.title}</p>
          <p className="text-gray-500 text-xs truncate">{item.podcast.title}</p>
          {item.episode.duration > 0 && (
            <p className="text-gray-700 text-xs mt-0.5">{formatDuration(item.episode.duration)}</p>
          )}
        </div>
      </button>

      <button onClick={onRemove} className="text-gray-700 active:text-gray-400 flex-shrink-0 p-1">
        <X size={16} />
      </button>
    </div>
  );
}

interface Props {
  upNext: QueueItem[];
  feed: QueueItem[];
  feedIndex: number;
  currentEpisodeId: string | null;
  onPlayUpNextItem: (index: number) => void;
  onPlayFeedItem: (feedIndex: number) => void;
  onRemoveFromUpNext: (index: number) => void;
  onReorderUpNext: (fromIndex: number, toIndex: number) => void;
  onAddToQueueFirst: (item: QueueItem) => void;
  onAddToQueueLast: (item: QueueItem) => void;
}

export function QueueView({
  upNext, feed, feedIndex, currentEpisodeId,
  onPlayUpNextItem, onPlayFeedItem, onRemoveFromUpNext, onReorderUpNext,
  onAddToQueueFirst, onAddToQueueLast,
}: Props) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, PlaybackProgress>>({});

  useEffect(() => {
    podcastDB.getAllProgress().then((all) => {
      const map: Record<string, PlaybackProgress> = {};
      all.forEach((p) => { map[p.episodeId] = p; });
      setProgress(map);
    });
  }, [feed, upNext]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const upcomingFeed = feed.slice(feedIndex + 1);
  const sortableIds = upNext.map((item, i) => item.episode.id + '-' + i);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = sortableIds.indexOf(active.id as string);
      const newIdx = sortableIds.indexOf(over.id as string);
      if (oldIdx !== -1 && newIdx !== -1) {
        onReorderUpNext(oldIdx, newIdx);
      }
    }
  }

  const hasAnything = upNext.length > 0 || upcomingFeed.length > 0 || currentEpisodeId;

  if (!hasAnything) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-8">
        <p className="text-white text-lg font-semibold mb-1">Queue is empty</p>
        <p className="text-gray-500 text-sm">Play from a podcast or add episodes using the + button</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-white">Queue</h1>
      </div>

      {/* ── Up Next ── */}
      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-2">
        Up Next {upNext.length > 0 ? `· ${upNext.length}` : ''}
      </p>
      {upNext.length === 0 ? (
        <p className="text-gray-700 text-sm px-4 pb-3">Nothing added yet — tap + on any episode.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            {upNext.map((item, index) => (
              <SortableUpNextItem
                key={sortableIds[index]}
                item={item}
                index={index}
                onPlay={() => onPlayUpNextItem(index)}
                onRemove={() => onRemoveFromUpNext(index)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* ── Feed ── */}
      <div className="mt-2">
        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-2">
          Feed {upcomingFeed.length > 0 ? `· ${upcomingFeed.length} remaining` : ''}
        </p>
        {upcomingFeed.length === 0 ? (
          <p className="text-gray-700 text-sm px-4">No more episodes.</p>
        ) : (
          upcomingFeed.map((item, i) => {
            const actualFeedIdx = feedIndex + 1 + i;
            const art = item.episode.artworkUrl || item.podcast.artworkUrl;
            const menuId = item.episode.id + '-feed-' + actualFeedIdx;
            const isMenuOpen = menuOpenId === menuId;

            return (
              <div
                key={menuId}
                className={`border-b border-gray-900 px-4 py-3 flex items-center gap-3 ${item.episode.id === currentEpisodeId ? 'bg-gray-950' : ''}`}
              >
                <button
                  onClick={() => onPlayFeedItem(actualFeedIdx)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="relative flex-shrink-0">
                    <img src={art} alt="" className={`w-11 h-11 rounded-xl object-cover ${progress[item.episode.id]?.completed ? 'opacity-40' : ''}`} />
                    {progress[item.episode.id]?.completed && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-green-400 text-lg font-bold">✓</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate leading-snug ${progress[item.episode.id]?.completed ? 'text-gray-600' : 'text-white'}`}>
                      {item.episode.title}
                    </p>
                    <p className="text-gray-500 text-xs truncate">{item.podcast.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.episode.duration > 0 && (
                        <p className="text-gray-700 text-xs">{formatDuration(item.episode.duration)}</p>
                      )}
                      {progress[item.episode.id]?.completed && (
                        <span className="text-green-700 text-xs">· Played</span>
                      )}
                      {!progress[item.episode.id]?.completed && progress[item.episode.id]?.currentTime > 10 && (
                        <span className="text-purple-700 text-xs">· In progress</span>
                      )}
                    </div>
                  </div>
                </button>

                {/* Add to Up Next menu */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setMenuOpenId(isMenuOpen ? null : menuId)}
                    className="p-1.5 text-gray-600 active:text-purple-400"
                  >
                    <ListEnd size={18} />
                  </button>
                  {isMenuOpen && (
                    <AddMenu
                      onAddFirst={() => onAddToQueueFirst(item)}
                      onAddLast={() => onAddToQueueLast(item)}
                      onClose={() => setMenuOpenId(null)}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
