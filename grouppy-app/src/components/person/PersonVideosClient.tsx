"use client";

import React from "react";

type Vid = {
  key: string;
  name: string;
  site: string;
  type: string;
  id: string;
  from: { id: number; title: string; media_type: string; poster_path?: string | null };
};

export default function PersonVideosClient({ personId }: { personId: string }) {
  const [items, setItems] = React.useState<Vid[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);

  const loadPage = React.useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const url = new URL(`/api/person/${personId}/videos`, window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", "9");
      const res = await fetch(url.toString());
      if (res.ok) {
        const json = await res.json();
        setItems((prev) => [...prev, ...(json.results || [])]);
        setTotal(json.total || 0);
        setPage((p) => p + 1);
      }
    } finally {
      setLoading(false);
    }
  }, [personId, page, loading]);

  React.useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  React.useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const canLoadMore = items.length < total && !loading;
          if (canLoadMore) loadPage();
        }
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [items.length, total, loading, loadPage]);

  if (!items?.length && loading) return <div className="text-sm text-neutral-400">Loading videos…</div>;
  if (!items?.length) return <div className="text-sm text-neutral-400">No videos available.</div>;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((v) => (
          <a key={v.id} href={`https://www.youtube.com/watch?v=${v.key}`} target="_blank" rel="noreferrer" className="group block">
            <div className="relative w-full overflow-hidden rounded-xl bg-neutral-900 aspect-video ring-1 ring-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://img.youtube.com/vi/${v.key}/hqdefault.jpg`} alt={v.name} className="w-full h-full object-cover group-hover:opacity-90" />
              <div className="absolute bottom-0 left-0 right-0 p-2 text-xs bg-gradient-to-t from-black/70 to-transparent">
                <span className="text-neutral-100 line-clamp-2">{v.name}</span>
                <div className="text-neutral-400 mt-1">{v.from.title}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
      {items.length < total && (
        <div ref={loadMoreRef} className="h-10" />
      )}
    </div>
  );
}
