"use client";

import React from "react";

type Profile = { file_path: string };

export default function PersonPhotosClient({ personId }: { personId: string }) {
  const [items, setItems] = React.useState<Profile[]>([]);
  const [page, setPage] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);

  const loadPage = React.useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const url = new URL(`/api/person/${personId}/images`, window.location.origin);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", "20");
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
    // initial load
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

  if (!items?.length && loading) return <div className="text-sm text-neutral-400">Loading photos…</div>;
  if (!items?.length) return <div className="text-sm text-neutral-400">No photos available.</div>;

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((p, i) => (
          <div key={`${p.file_path}-${i}`} className="relative w-full overflow-hidden rounded-xl bg-neutral-900 aspect-[2/3] ring-1 ring-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://image.tmdb.org/t/p/w500${p.file_path}`} alt={`photo-${i}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      {items.length < total && (
        <div ref={loadMoreRef} className="h-10" />
      )}
    </div>
  );
}
