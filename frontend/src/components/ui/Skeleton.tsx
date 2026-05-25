"use client";

import { useEffect, useRef, useState } from "react";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`block overflow-hidden rounded-md bg-[#2a2a2a] skeleton-shimmer ${className}`}
    />
  );
}

export function useMinimumLoading(loading: boolean, minimumMs = 300) {
  const [visible, setVisible] = useState(loading);
  const startedAt = useRef<number | null>(loading ? Date.now() : null);

  useEffect(() => {
    if (loading) {
      startedAt.current = Date.now();
      setVisible(true);
      return;
    }

    const elapsed = startedAt.current ? Date.now() - startedAt.current : minimumMs;
    const remaining = Math.max(minimumMs - elapsed, 0);
    const timeout = window.setTimeout(() => {
      startedAt.current = null;
      setVisible(false);
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [loading, minimumMs]);

  return visible;
}
