"use client";

import { useEffect, useState } from "react";
import PulsingDot from "@/components/PulsingDot";

export default function SidebarInboxBadge({
  pollMs = 30_000,
}: { pollMs?: number }) {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/inbox/unread-count", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count: number };
        if (!cancelled) setCount(data.count ?? 0);
      } catch {
        /* offline */
      }
    };

    fetchCount();
    const timer = setInterval(fetchCount, pollMs);
    const onRefresh = () => fetchCount();
    window.addEventListener("inbox:refresh", onRefresh);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("inbox:refresh", onRefresh);
    };
  }, [pollMs]);

  if (count <= 0) return null;

  return (
    <span className="flex items-center gap-1.5">
      <PulsingDot size={6} />
      <span className="text-[11px] font-semibold bg-red-500 text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
        {count > 99 ? "99+" : count}
      </span>
    </span>
  );
}
