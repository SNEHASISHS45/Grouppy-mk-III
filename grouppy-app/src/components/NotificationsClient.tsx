"use client";

import React from "react";
import { TmdbItem, img } from "@/lib/tmdb";

function useNotificationsEnabled() {
  const [enabled, setEnabled] = React.useState<NotificationPermission | "unsupported">("default");
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setEnabled("unsupported");
      return;
    }
    setEnabled(Notification.permission);
  }, []);

  const request = React.useCallback(async () => {
    if (!("Notification" in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setEnabled(perm);
    } catch {}
  }, []);

  return { enabled, request } as const;
}

export default function NotificationsClient({
  todaysWatchable,
  trendingTop5,
  upcomingAll,
}: {
  todaysWatchable: TmdbItem[];
  trendingTop5: TmdbItem[];
  upcomingAll: TmdbItem[];
}) {
  const { enabled, request } = useNotificationsEnabled();
  const [open, setOpen] = React.useState(false);

  // Listen for navbar bell toggle
  React.useEffect(() => {
    const handler = () => setOpen((v) => !v);
    window.addEventListener("toggle-notifications", handler as any);
    return () => window.removeEventListener("toggle-notifications", handler as any);
  }, []);

  // Compare new items with what was previously seen and fire a browser notification once.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const key = "grp_seen_ids_v1";
    const prev = new Set<string>(JSON.parse(localStorage.getItem(key) || "[]"));
    const current = [...todaysWatchable, ...trendingTop5.slice(0, 5), ...upcomingAll.slice(0, 5)];
    const newOnes = current.filter((i) => !prev.has(String(i.id))).slice(0, 3);

    if (newOnes.length) {
      const first = newOnes[0];
      const title = first.title || first.name || "New titles";
      const body = `${newOnes.length} new ${newOnes.length > 1 ? "recommendations" : "recommendation"} today`;
      try {
        const icon = img.poster(first.poster_path, "w185");
        new Notification(title, { body, icon: icon });
      } catch {}
    }
    const newSet = Array.from(new Set([...prev, ...current.map((i) => String(i.id))]));
    localStorage.setItem(key, JSON.stringify(newSet));
  }, [todaysWatchable, trendingTop5, upcomingAll]);

  const items = React.useMemo(() => {
    return [
      { label: "Today’s Watchable", data: todaysWatchable },
      { label: "Trending Today", data: trendingTop5 },
      { label: "Upcoming", data: upcomingAll.slice(0, 10) },
    ];
  }, [todaysWatchable, trendingTop5, upcomingAll]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="flex flex-col items-end gap-2">
        {open && (
          <div className="w-80 max-h-[60vh] overflow-auto rounded-xl bg-neutral-900/95 border border-white/10 shadow-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Latest Picks</h4>
              <button onClick={() => setOpen(false)} className="text-neutral-300 hover:text-white text-sm">Close</button>
            </div>
            <div className="space-y-3">
              {items.map((sec) => (
                <div key={sec.label}>
                  <div className="text-xs text-neutral-400 mb-1">{sec.label}</div>
                  <ul className="space-y-2">
                    {sec.data.map((it) => {
                      const poster = img.poster(it.poster_path, "w185");
                      const title = it.title || it.name || "Untitled";
                      return (
                        <li key={`${it.media_type}-${it.id}`} className="flex gap-2 items-center">
                          {poster ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={poster} alt={title} className="h-10 w-7 object-cover rounded" />
                          ) : (
                            <div className="h-10 w-7 bg-white/10 rounded" />
                          )}
                          <span className="text-xs text-neutral-200 line-clamp-1">{title}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No local bell; navbar toggles this panel */}
      </div>
    </div>
  );
}
