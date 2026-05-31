import { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, ChevronDown, RotateCcw, RotateCw, GripVertical, X, ListEnd, ListStart } from 'lucide-react';
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
  arrayMove as _arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Episode, Podcast, QueueItem, PlaybackProgress } from '../types';
import { podcastDB } from '../db';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function AddMenu({ onAddFirst, onAddLast, onClose }: {
  onAddFirst: () => void;
  onAddLast: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div className="absolute right-0 top-8 z-[70] bg-gray-800 rounded-xl shadow-xl overflow-hidden w-44 border border-gray-700">
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

function SortableUpNextItem({ item, index, onPlay, onRemove }: {
  item: QueueItem;
  index: number;
  onPlay: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.episode.id + '-upnext-' + index });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };
  const art = item.episode.artworkUrl || item.podcast.artworkUrl;

  return (
    <div ref={setNodeRef} style={style} className="border-b border-gray-900 px-4 py-3 flex items-center gap-3 bg-black">
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
  episode: Episode;
  podcast: Podcast;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isExpanded: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  upNext: QueueItem[];
  feed: QueueItem[];
  feedIndex: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSkip: (seconds: number) => void;
  onToggleExpanded: () => void;
  onPlayNext: () => void;
  onPlayPrevious: () => void;
  onPlayUpNextItem: (index: number) => void;
  onPlayFeedItem: (feedIndex: number) => void;
  onRemoveFromUpNext: (index: number) => void;
  onReorderUpNext: (from: number, to: number) => void;
  onAddToQueueFirst: (item: QueueItem) => void;
  onAddToQueueLast: (item: QueueItem) => void;
}

export function AudioPlayer({
  episode, podcast, isPlaying, currentTime, duration,
  isExpanded, hasNext, hasPrevious, upNext, feed, feedIndex,
  onTogglePlay, onSeek, onSkip, onToggleExpanded,
  onPlayNext, onPlayPrevious, onPlayUpNextItem, onPlayFeedItem,
  onRemoveFromUpNext, onReorderUpNext, onAddToQueueFirst, onAddToQueueLast,
}: Props) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, PlaybackProgress>>({});

  useEffect(() => {
    if (!isExpanded) return;
    podcastDB.getAllProgress().then((all) => {
      const map: Record<string, PlaybackProgress> = {};
      all.forEach((p) => { map[p.episodeId] = p; });
      setProgress(map);
    });
  }, [isExpanded, feed, upNext]);

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

  const artworkUrl = episode.artworkUrl || podcast.artworkUrl;
  const progress_ = duration > 0 ? currentTime / duration : 0;
  const remaining = duration - currentTime;

  // Feed: upcoming unfinished items only, newest→oldest (feed is already sorted)
  const upcomingFeed = feed
    .slice(feedIndex + 1)
    .map((item, i) => ({ item, actualIdx: feedIndex + 1 + i }))
    .filter(({ item }) => !progress[item.episode.id]?.completed);

  if (isExpanded) {
    return (
      <div
        className="fixed inset-0 bg-black z-50 flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* ── Player controls (non-scrolling) ── */}
        <div className="flex-shrink-0 flex flex-col items-center px-6 pt-12 pb-5">
          <button
            onClick={onToggleExpanded}
            className="absolute top-4 left-4 p-2"
            style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
          >
            <ChevronDown size={28} className="text-white" />
          </button>

          <img
            src={artworkUrl}
            alt={episode.title}
            className="w-40 h-40 rounded-2xl object-cover mb-4 shadow-2xl"
          />

          <h2 className="text-white font-bold text-base mb-0.5 text-center leading-tight line-clamp-2 w-full max-w-sm">
            {episode.title}
          </h2>
          <p className="text-gray-400 text-sm text-center mb-4">{podcast.title}</p>

          <div className="w-full max-w-sm">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={1}
              value={currentTime}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="w-full mb-1"
            />
            <div className="flex justify-between text-gray-500 text-xs mb-4">
              <span>{formatTime(currentTime)}</span>
              <span>-{formatTime(remaining > 0 ? remaining : 0)}</span>
            </div>

            <div className="flex items-center justify-center gap-7">
              <button
                onClick={onPlayPrevious}
                className={hasPrevious ? 'text-white opacity-80 active:opacity-100' : 'text-gray-700'}
              >
                <SkipBack size={26} />
              </button>
              <button
                onClick={() => onSkip(-15)}
                className="text-white opacity-80 active:opacity-100 flex flex-col items-center gap-1"
              >
                <RotateCcw size={26} />
                <span className="text-xs text-gray-500">15</span>
              </button>
              <button
                onClick={onTogglePlay}
                className="w-16 h-16 rounded-full bg-white flex items-center justify-center active:bg-gray-200"
              >
                {isPlaying
                  ? <Pause size={28} className="text-black fill-black" />
                  : <Play size={28} className="text-black fill-black ml-1" />}
              </button>
              <button
                onClick={() => onSkip(30)}
                className="text-white opacity-80 active:opacity-100 flex flex-col items-center gap-1"
              >
                <RotateCw size={26} />
                <span className="text-xs text-gray-500">30</span>
              </button>
              <button
                onClick={onPlayNext}
                className={hasNext ? 'text-white opacity-80 active:opacity-100' : 'text-gray-700'}
              >
                <SkipForward size={26} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Queue (scrollable) ── */}
        <div className="flex-1 overflow-y-auto border-t border-gray-900">

          {/* Up Next */}
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

          {/* Feed */}
          <div className="mt-2">
            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider px-4 py-2">
              Feed{upcomingFeed.length > 0 ? ` · ${upcomingFeed.length} remaining` : ''}
            </p>
            {upcomingFeed.length === 0 ? (
              <p className="text-gray-700 text-sm px-4">No more episodes.</p>
            ) : (
              upcomingFeed.map(({ item, actualIdx }) => {
                const art = item.episode.artworkUrl || item.podcast.artworkUrl;
                const menuId = item.episode.id + '-feed-' + actualIdx;
                const isMenuOpen = menuOpenId === menuId;
                const prog = progress[item.episode.id];

                return (
                  <div key={menuId} className="border-b border-gray-900 px-4 py-3 flex items-center gap-3">
                    <button
                      onClick={() => onPlayFeedItem(actualIdx)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="relative flex-shrink-0">
                        <img src={art} alt="" className="w-11 h-11 rounded-xl object-cover" />
                      </div>
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
      </div>
    );
  }

  // Mini player
  return (
    <div
      className="bg-gray-950 border-t border-gray-800 cursor-pointer active:bg-gray-900"
      onClick={onToggleExpanded}
    >
      <div className="h-0.5 bg-gray-800">
        <div
          className="h-full bg-purple-500 transition-all duration-1000"
          style={{ width: `${progress_ * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5">
        <img
          src={artworkUrl}
          alt={episode.title}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{episode.title}</p>
          <p className="text-gray-500 text-xs truncate">{podcast.title}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          className="p-2 active:opacity-70"
        >
          {isPlaying
            ? <Pause size={22} className="text-white fill-white" />
            : <Play size={22} className="text-white fill-white" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onPlayNext(); }}
          disabled={!hasNext}
          className={`p-2 ${hasNext ? 'active:opacity-70' : 'opacity-30'}`}
        >
          <SkipForward size={22} className="text-white" />
        </button>
      </div>
    </div>
  );
}
