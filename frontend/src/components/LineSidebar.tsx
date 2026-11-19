"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";

interface ProximityNavListProps {
  children: ReactNode;
  proximityRadius?: number;
  smoothing?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * Adapted from @react-bits/LineSidebar-TS-TW:
 * Single rAF loop with frame-rate-independent exponential smoothing driving `--effect`
 * on each `[data-proximity-item]` child based on vertical pointer proximity.
 */
export function ProximityNavList({
  children,
  proximityRadius = 88,
  smoothing = 85,
  disabled = false,
  className = "",
}: ProximityNavListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const targetsRef = useRef<number[]>([]);
  const currentRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const smoothingRef = useRef(smoothing);

  useEffect(() => {
    smoothingRef.current = smoothing;
  }, [smoothing]);

  const getItems = useCallback((): HTMLElement[] => {
    const root = listRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>("[data-proximity-item]"));
  }, []);

  const runFrame = useCallback(
    function step(now: number) {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05);
      lastRef.current = now;
      const tau = Math.max(smoothingRef.current, 1) / 1000;
      const k = 1 - Math.exp(-dt / tau);

      let moving = false;
      const items = getItems();
      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        const target = targetsRef.current[i] ?? 0;
        const cur = currentRef.current[i] ?? 0;
        const next = cur + (target - cur) * k;
        const settled = Math.abs(target - next) < 0.002;
        const value = settled ? target : next;
        currentRef.current[i] = value;
        el.style.setProperty("--effect", value.toFixed(4));
        if (!settled) moving = true;
      }

      rafRef.current = moving ? requestAnimationFrame(step) : null;
    },
    [getItems],
  );

  const startLoop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const list = listRef.current;
      if (!list) return;
      const items = getItems();
      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const dist = Math.abs(e.clientY - center);
        const p = Math.max(0, 1 - dist / proximityRadius);
        targetsRef.current[i] = p * p * (3 - 2 * p);
      }
      startLoop();
    },
    [disabled, getItems, proximityRadius, startLoop],
  );

  const handlePointerLeave = useCallback(() => {
    targetsRef.current = targetsRef.current.map(() => 0);
    startLoop();
  }, [startLoop]);

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    },
    [],
  );

  return (
    <div
      ref={listRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={className}
    >
      {children}
    </div>
  );
}

export default ProximityNavList;
