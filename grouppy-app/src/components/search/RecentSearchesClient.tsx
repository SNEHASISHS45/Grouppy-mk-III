"use client";

import React from "react";
import Link from "next/link";

type RecentItem = { q: string; tab?: "movies" | "tv" | "people" | "users" };

const STORAGE_KEY = "recentSearches";

function readRecent(): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(Boolean).slice(0, 20);
  } catch {
    return [];
  }
}

export function pushRecent(item: RecentItem) {
  try {
    const list = readRecent();
    const exists = list.find((x) => x.q.toLowerCase() === item.q.toLowerCase() && (x.tab || "movies") === (item.tab || "movies"));
    const next = [item, ...list.filter((x) => x !== exists)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 15)));
  } catch {}
}

export function removeRecent(item: RecentItem) {
  try {
    const list = readRecent();
    const next = list.filter((x) => !(x.q.toLowerCase() === item.q.toLowerCase() && (x.tab || "movies") === (item.tab || "movies")));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export default function RecentSearchesClient({ inline = false, filterTab }: { inline?: boolean; filterTab?: "movies" | "tv" | "people" | "users" | "content" }) {
  const [items, setItems] = React.useState<RecentItem[]>([]);

  React.useEffect(() => {
    const all = readRecent();
    setItems(all);
  }, []);

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setItems([]);
  };

  const filtered = React.useMemo(() => {
    if (!filterTab) return items;
    if (filterTab === "content") return items.filter((x) => (x.tab || "movies") !== "users");
    return items.filter((x) => (x.tab || "movies") === filterTab);
  }, [items, filterTab]);

  if (filtered.length === 0) return null;

  return (
    <div className={inline ? "flex items-center gap-2 flex-wrap" : ""}>
      {!inline && <div className="text-xs uppercase tracking-wide text-neutral-400 mb-2">Recent Searches</div>}
      <div className="flex items-center gap-2 flex-wrap">
        {filtered.slice(0, 10).map((it, idx) => (
          <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-xs">
            <Link
              href={{ pathname: "/search", query: { q: it.q, tab: it.tab || "movies", page: 1 } }}
              className="hover:underline"
            >
              {it.q}{it.tab && it.tab !== "movies" ? ` · ${it.tab}` : ""}
            </Link>
            <button
              aria-label="Remove from recent"
              className="text-neutral-400 hover:text-neutral-200"
              onClick={() => {
                removeRecent(it);
                const all = readRecent();
                // re-apply filter
                setItems(all);
              }}
            >
              ×
            </button>
          </span>
        ))}
        {!inline && (
          <button onClick={clear} className="text-xs text-neutral-400 hover:text-neutral-200 ml-2">Clear</button>
        )}
      </div>
    </div>
  );
}
