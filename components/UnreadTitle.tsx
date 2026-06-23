"use client";

import { useEffect, useRef } from "react";

interface UnreadTitleProps {
  baseTitle?: string;
  pollMs?: number;
}

export default function UnreadTitle({
  baseTitle = "Recovery Portal",
  pollMs = 30_000,
}: UnreadTitleProps) {
  const lastCountRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const apply = (count: number) => {
      lastCountRef.current = count;
      document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
    };

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/inbox/unread-count", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count: number };
        if (!cancelled) apply(data.count ?? 0);
      } catch {
        /* offline / silent */
      }
    };

    fetchCount();
    timer = setInterval(fetchCount, pollMs);

    const onRefresh = () => fetchCount();
    window.addEventListener("inbox:refresh", onRefresh);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      window.removeEventListener("inbox:refresh", onRefresh);
      document.title = baseTitle;
    };
  }, [baseTitle, pollMs]);

  return null;
}
