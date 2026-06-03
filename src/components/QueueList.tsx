/**
 * Shared queue list UI used by both QueueView (tab) and AudioPlayer (expanded).
 * Renders Up Next (drag-to-reorder) + Feed (unfinished, newest-first) sections.
 */
import { useEffect, useState } from 'react';
import { X, GripVertical, ListEnd, ListStart } from 'lucide-react';
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
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { QueueItem, PlaybackProgress } from '../types';
import { podcastDB } from '../db';

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function QueueActions({ onAddFirst, onAddLast }: {
  onAddFirst: () => void;
  onAddLast: () => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={onAddFirst}
        title="Play next"
        className="p-1.5 text-gray-600 active:text-purple-400"
      >
        <ListStart size={18} />
      </button>
      <button
        onClick={onAddLast}
        title="Add to queue"
        className="p-1.5 text-gray-600 active:text-purple-400"
      >
        <ListEnd size={18} />
      </button>
    </div>
  );
}

function SortableUpNextItem({ item, index, onPlay, onRemove }: {
  item: QueueItem;
  index: number;
  onPlay: () => void;
  onRemove: () => void;
}) {
  const id = item.episode.id + '-upnext-' + index;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const art = item.episode.artworkUrl || item.podcast.artworkUrl;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="border-b border-gray-900 px-4 py-3 flex items-center gap-3 bg-black"
    >
      <button className="text-gray-700 flex-shrink-0 touch-none cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
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
  onReorderUpNext: (from: number, to: number) => void;
  onAddToQueueFirst: (item: QueueItem) => void;
  onAddToQueueLast: (item: QueueItem) => void;
}

export function QueueList({
  upNext, feed, feedIndex, currentEpisodeId,
  onPlayUpNextItem, onPlayFeedItem, onRemoveFromUpNext, onReorderUpNext,
  onAddToQueueFirst, onAddToQueueLast,
}: Props) {
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

  const sortableIds = upNext.map((item, i) => item.episode.id + '-upnext-' + i);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = sortableIds.indexOf(active.id as string);
      const newIdx = sortableIds.indexOf(over.id as string);
      if (oldIdx !== -1 && newIdx !== -1) onReorderUpNext(oldIdx, newIdx);
    }
  }

  // Feed: all unread episodes newest→oldest, excluding currently playing
  const upcomingFeed = feed
    .map((item, i) => ({ item, actualIdx: i }))
    .filter(({ item, actualIdx }) =>
      actualIdx !== feedIndex &&
      !progress[item.episode.id]?.completed
    );

  return (
    <>
      {/* ── Up Next ── */}
      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 pt-3 pb-1">
        Up Next{upNext.length > 0 ? ` · ${upNext.length}` : ''}
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
          Feed{upcomingFeed.length > 0 ? ` · ${upcomingFeed.length} remaining` : ''}
        </p>
        {upcomingFeed.length === 0 ? (
          <p className="text-gray-700 text-sm px-4">No more episodes.</p>
        ) : (
          upcomingFeed.map(({ item, actualIdx }) => {
            const art = item.episode.artworkUrl || item.podcast.artworkUrl;
            const prog = progress[item.episode.id];

            return (
              <div
                key={item.episode.id + '-feed-' + actualIdx}
                className={`border-b border-gray-900 px-4 py-3 flex items-center gap-3 ${item.episode.id === currentEpisodeId ? 'bg-gray-950' : ''}`}
              >
                <button
                  onClick={() => onPlayFeedItem(actualIdx)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <img src={art} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-white leading-snug">{item.episode.title}</p>
                    <p className="text-gray-500 text-xs truncate">{item.podcast.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.episode.duration > 0 && (
                        <p className="text-gray-700 text-xs">{formatDuration(item.episode.duration)}</p>
                      )}
                      {prog && !prog.completed && prog.currentTime > 10 && (
                        <span className="text-purple-700 text-xs">· In progress</span>
                      )}
                    </div>
                  </div>
                </button>

                <QueueActions
                  onAddFirst={() => onAddToQueueFirst(item)}
                  onAddLast={() => onAddToQueueLast(item)}
                />
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
