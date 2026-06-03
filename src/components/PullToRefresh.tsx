import { useRef, useCallback, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 64; // px drag distance to trigger refresh

export function PullToRefresh({ onRefresh, children, className = '' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);

  const setIndicator = (pull: number) => {
    const el = indicatorRef.current;
    if (!el) return;
    const ratio = Math.min(pull / THRESHOLD, 1);
    el.style.height = `${Math.min(pull * 0.5, 40)}px`;
    el.style.opacity = String(ratio);
    const icon = el.querySelector('svg');
    if (icon) {
      (icon as HTMLElement).style.transform = `rotate(${ratio * 180}deg)`;
    }
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshingRef.current) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pullingRef.current || refreshingRef.current) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) { pullingRef.current = false; return; }
    const pull = e.touches[0].clientY - startYRef.current;
    if (pull <= 0) return;
    // Resist scroll beyond threshold
    setIndicator(pull);
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (!pullingRef.current || refreshingRef.current) return;
    pullingRef.current = false;

    const el = indicatorRef.current;
    if (!el) return;
    const currentH = parseFloat(el.style.height || '0');
    const triggered = currentH >= THRESHOLD * 0.5 * 0.9; // ~90% of max indicator height

    if (!triggered) {
      el.style.transition = 'height 0.2s, opacity 0.2s';
      el.style.height = '0px';
      el.style.opacity = '0';
      setTimeout(() => { if (el) el.style.transition = ''; }, 200);
      return;
    }

    // Show spinner
    refreshingRef.current = true;
    el.style.transition = 'height 0.15s';
    el.style.height = '40px';
    el.style.opacity = '1';
    const icon = el.querySelector('svg');
    if (icon) { (icon as HTMLElement).style.transform = ''; (icon as HTMLElement).className = 'animate-spin'; }

    try {
      await onRefresh();
    } finally {
      refreshingRef.current = false;
      el.style.transition = 'height 0.2s, opacity 0.2s';
      el.style.height = '0px';
      el.style.opacity = '0';
      setTimeout(() => { if (el) el.style.transition = ''; }, 200);
    }
  }, [onRefresh]);

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto overscroll-y-contain ${className}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator */}
      <div
        ref={indicatorRef}
        style={{ height: 0, opacity: 0, overflow: 'hidden' }}
        className="flex items-center justify-center"
      >
        <Loader2 size={20} className="text-purple-400" />
      </div>
      {children}
    </div>
  );
}
