"use client";

import React from "react";
import { TmdbItem, img } from "@/lib/tmdb";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, endAt, getDocs, limit, orderBy, query, startAt } from "firebase/firestore";
import RecentSearchesClient, { pushRecent } from "@/components/search/RecentSearchesClient";
import { rankCandidates } from "@/lib/fuzzy";

export default function SearchOverlay() {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<TmdbItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [userResults, setUserResults] = React.useState<Array<any>>([]);
  const [userLoading, setUserLoading] = React.useState(false);
  const router = useRouter();
  const [activeIndex, setActiveIndex] = React.useState<number>(-1); // -1 means none selected
  const [overlayTab, setOverlayTab] = React.useState<"content" | "actors" | "users">("content");
  const [contentFilter, setContentFilter] = React.useState<"all" | "movies" | "tv" | "people">("all");

  const goToFull = React.useCallback((query: string, tab?: "movies" | "tv" | "people" | "users") => {
    const q = query.trim();
    if (!q) return;
    pushRecent({ q, tab: tab || "movies" });
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}${tab && tab !== "movies" ? `&tab=${tab}` : ""}`);
  }, [router]);

  React.useEffect(() => {
    if (!open) return;
    const id = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        // Prefer direct people search when Actors tab is active, or content filter is 'people'
        const isPeopleOnly = overlayTab === "actors" || (overlayTab === "content" && contentFilter === "people");
        if (isPeopleOnly) {
          const url1 = new URL("/api/tmdb/search/person", window.location.origin);
          url1.searchParams.set("query", q.trim());
          url1.searchParams.set("page", "1");

          const url2 = new URL("/api/tmdb/search/multi", window.location.origin);
          url2.searchParams.set("query", q.trim());
          url2.searchParams.set("page", "1");

          const [r1, r2] = await Promise.allSettled([fetch(url1), fetch(url2)]);
          const resultsArr: any[] = [];
          if (r1.status === "fulfilled" && r1.value.ok) {
            const j1 = await r1.value.json();
            if (Array.isArray(j1?.results)) resultsArr.push(...j1.results.map((r: any) => ({ ...r, media_type: "person" })));
          }
          if (r2.status === "fulfilled" && r2.value.ok) {
            const j2 = await r2.value.json();
            if (Array.isArray(j2?.results)) resultsArr.push(...j2.results.filter((r: any) => r.media_type === "person"));
          }
          // de-duplicate by id
          const seen = new Set<number>();
          const merged = resultsArr.filter((r: any) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
          setResults(merged as TmdbItem[]);
        } else {
          const url = new URL("/api/search/suggest", window.location.origin);
          url.searchParams.set("query", q.trim());
          url.searchParams.set("page", "1");
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            const list: TmdbItem[] = (json.results || []) as TmdbItem[];
            setResults(list);
          } else {
            setResults([]);
          }
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // debounce
    return () => clearTimeout(id);
  }, [q, open, overlayTab, contentFilter]);

  // Reset active index when opening or context changes
  React.useEffect(() => {
    setActiveIndex(-1);
  }, [q, open, overlayTab, contentFilter]);

  // Firestore user search
  React.useEffect(() => {
    if (!open) return;
    const id = setTimeout(async () => {
      const term = q.trim();
      if (!term) {
        setUserResults([]);
        return;
      }
      setUserLoading(true);
      try {
        const creators = collection(db, "creators");
        const usersCol = collection(db, "users");
        const tasks: Promise<any>[] = [];
        // Prefix queries on creators
        try { tasks.push(getDocs(query(creators, orderBy("name"), startAt(term), endAt(term + "\uf8ff"), limit(10)))); } catch {}
        try { tasks.push(getDocs(query(creators, orderBy("username"), startAt(term), endAt(term + "\uf8ff"), limit(10)))); } catch {}
        // Also try users collection if present
        try { tasks.push(getDocs(query(usersCol, orderBy("name"), startAt(term), endAt(term + "\uf8ff"), limit(10)))); } catch {}
        try { tasks.push(getDocs(query(usersCol, orderBy("username"), startAt(term), endAt(term + "\uf8ff"), limit(10)))); } catch {}
        const snaps = await Promise.all(tasks);
        const list: any[] = [];
        const seen = new Set<string>();
        for (const snap of snaps) {
          snap.forEach((d: any) => {
            if (!seen.has(d.id)) {
              seen.add(d.id);
              list.push({ id: d.id, ...d.data() });
            }
          });
        }
        let ranked = rankCandidates(term, list, [
          (u) => (u?.name as string | undefined) || "",
          (u) => (u?.displayName as string | undefined) || "",
          (u) => (u?.username as string | undefined) || "",
          (u) => (u?.handle as string | undefined) || "",
          (u) => (u?.email as string | undefined) || "",
        ]);
        // Fallback: if nothing from prefix, do a small scan and fuzzy rank
        if (ranked.length === 0) {
          const broadSnaps: any[] = [];
          try { broadSnaps.push(await getDocs(query(creators, limit(100)))); } catch {}
          try { broadSnaps.push(await getDocs(query(usersCol, limit(100)))); } catch {}
          const broadList: any[] = [];
          const seen2 = new Set<string>();
          for (const bs of broadSnaps) {
            bs.forEach((d: any) => { if (!seen2.has(d.id)) { seen2.add(d.id); broadList.push({ id: d.id, ...d.data() }); } });
          }
          ranked = rankCandidates(term, broadList, [
            (u) => (u?.name as string | undefined) || "",
            (u) => (u?.displayName as string | undefined) || "",
            (u) => (u?.username as string | undefined) || "",
            (u) => (u?.handle as string | undefined) || "",
            (u) => (u?.email as string | undefined) || "",
          ]);
        }
        setUserResults(ranked.filter(r => r.score > 0.3).map(r => r.item).slice(0, 10));
      } catch {
        setUserResults([]);
      } finally {
        setUserLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [q, open]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-8 w-8 grid place-items-center rounded bg-white/10 text-white hover:bg-white/20"
        title="Search (Ctrl/⌘+K)"
      >
        🔎
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur">
          <div className="max-w-xl mx-auto mt-24 bg-neutral-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  const totalMedia = overlayTab === "content" ? Math.min(results.length, 20) : 0;
                  const totalUsers = overlayTab === "users" ? Math.min(userResults.length, 10) : 0;
                  const total = totalMedia + totalUsers;
                  if (e.key === "ArrowDown" && total > 0) {
                    e.preventDefault();
                    setActiveIndex((prev) => {
                      const next = prev + 1;
                      return next >= total ? 0 : next;
                    });
                    return;
                  }
                  if (e.key === "ArrowUp" && total > 0) {
                    e.preventDefault();
                    setActiveIndex((prev) => {
                      const next = prev - 1;
                      return next < 0 ? total - 1 : next;
                    });
                    return;
                  }
                  if (e.key === "Enter" && q.trim()) {
                    e.preventDefault();
                    // If an item is highlighted, open it; else go to full search
                    if (activeIndex >= 0 && activeIndex < total) {
                      if (overlayTab === "content" && activeIndex < totalMedia) {
                        const it = results[activeIndex]!;
                        const title = it.title || it.name || "Untitled";
                        const href = it.media_type === "tv" ? `/tv/${it.id}` : it.media_type === "movie" ? `/movie/${it.id}` : `/person/${it.id}`;
                        pushRecent({ q: title, tab: it.media_type === "tv" ? "tv" : it.media_type === "movie" ? "movies" : "people" });
                        setOpen(false);
                        router.push(href);
                      } else if (overlayTab === "users") {
                        const uIdx = activeIndex - totalMedia;
                        const u = userResults[uIdx]!;
                        pushRecent({ q: u.name || u.username || "User", tab: "users" });
                        setOpen(false);
                        router.push(`/creator/${u.id}`);
                      } else {
                        goToFull(q);
                      }
                    } else {
                      // Determine intended tab from current overlay context
                      const tab = overlayTab === "users"
                        ? "users"
                        : (contentFilter === "tv" ? "tv" : contentFilter === "people" ? "people" : "movies");
                      goToFull(q, tab);
                    }
                  }
                }}
                placeholder="Search movies, TV, actors, and users..."
                className="flex-1 bg-transparent outline-none text-white placeholder:text-neutral-400 text-sm py-2"
              />
              <button onClick={() => setOpen(false)} className="text-neutral-300 hover:text-white text-sm">Close</button>
            </div>

            <div className="max-h-[60vh] overflow-auto p-3">
              {/* Recent searches */}
              {!q && (
                <div className="mb-4">
                  <RecentSearchesClient filterTab={overlayTab === "users" ? "users" : overlayTab === "actors" ? "people" : "content"} />
                </div>
              )}
              {/* Tabs inside overlay */}
              <div className="mb-3 flex items-center gap-2 text-sm border-b border-white/10">
                <button
                  className={`px-3 py-1 -mb-[1px] border-b-2 ${overlayTab === "content" ? "border-white text-white" : "border-transparent text-neutral-400 hover:text-neutral-200"}`}
                  onClick={() => setOverlayTab("content")}
                >
                  Content
                </button>
                <button
                  className={`px-3 py-1 -mb-[1px] border-b-2 ${overlayTab === "actors" ? "border-white text-white" : "border-transparent text-neutral-400 hover:text-neutral-200"}`}
                  onClick={() => setOverlayTab("actors")}
                >
                  Actors
                </button>
                <button
                  className={`px-3 py-1 -mb-[1px] border-b-2 ${overlayTab === "users" ? "border-white text-white" : "border-transparent text-neutral-400 hover:text-neutral-200"}`}
                  onClick={() => setOverlayTab("users")}
                >
                  Users
                </button>
              </div>

              {/* Content sub-filter */}
              {overlayTab === "content" && (
                <div className="mb-3 flex items-center gap-2 text-xs">
                  {(["all","movies","tv","people"] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setContentFilter(k)}
                      className={`px-2 py-1 rounded-full border ${contentFilter === k ? "bg-white/15 border-white/20 text-white" : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"}`}
                    >
                      {k === "people" ? "Actors" : k[0].toUpperCase()+k.slice(1)}
                    </button>
                  ))}
                </div>
              )}
              {loading && <div className="text-sm text-neutral-400">Searching...</div>}
              {!loading && results.length === 0 && q && (
                <div className="text-sm text-neutral-400">No results</div>
              )}
              {overlayTab === "content" && (
              <ul className="space-y-2">
                {results
                  .filter((it) => contentFilter === "all" ? ["movie","tv","person"].includes(it.media_type as any) : (contentFilter === "movies" ? it.media_type === "movie" : contentFilter === "tv" ? it.media_type === "tv" : it.media_type === "person"))
                  .slice(0, 20)
                  .map((it, idx) => {
                  const title = it.title || it.name || "Untitled";
                  const poster = it.media_type === "person" ? ((it as any).profile_path ? `https://image.tmdb.org/t/p/w92${(it as any).profile_path}` : undefined) : img.poster(it.poster_path, "w92");
                  const href = it.media_type === "tv" ? `/tv/${it.id}` : it.media_type === "movie" ? `/movie/${it.id}` : `/person/${it.id}`;
                  return (
                    <li key={`${it.media_type}-${it.id}`} className={`flex items-center gap-3 ${activeIndex === idx ? 'bg-white/10 rounded-md' : ''}`}>
                      {poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={poster} alt={title} className="h-12 w-8 object-cover rounded" />
                      ) : (
                        <div className="h-12 w-8 bg-white/10 rounded" />)
                      }
                      <Link href={href} className="text-sm text-neutral-200 hover:text-white line-clamp-1" onClick={() => { pushRecent({ q: title, tab: it.media_type === "tv" ? "tv" : it.media_type === "movie" ? "movies" : "people" }); setOpen(false); }}>
                        {title}
                      </Link>
                      <span className="text-xs text-neutral-500 ml-auto">{it.media_type}</span>
                    </li>
                  );
                })}
              </ul>
              )}

              {overlayTab === "actors" && (
              <ul className="space-y-2">
                {results
                  .filter((it) => it.media_type === "person")
                  .slice(0, 20)
                  .map((it, idx) => {
                    const title = it.title || it.name || "Untitled";
                    const poster = (it as any).profile_path ? `https://image.tmdb.org/t/p/w92${(it as any).profile_path}` : undefined;
                    const href = `/person/${it.id}`;
                    return (
                      <li key={`person-${it.id}`} className={`flex items-center gap-3 ${activeIndex === idx ? 'bg-white/10 rounded-md' : ''}`}>
                        {poster ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={poster} alt={title} className="h-12 w-8 object-cover rounded" />
                        ) : (
                          <div className="h-12 w-8 bg-white/10 rounded" />)
                        }
                        <Link href={href} className="text-sm text-neutral-200 hover:text-white line-clamp-1" onClick={() => { pushRecent({ q: title, tab: "people" }); setOpen(false); }}>
                          {title}
                        </Link>
                        <span className="text-xs text-neutral-500 ml-auto">actor</span>
                      </li>
                    );
                  })}
              </ul>
              )}

              {/* Users section */}
              {(overlayTab === "users") && (userLoading || userResults.length > 0) && (
                <div className="mt-4">
                  <div className="text-xs uppercase tracking-wide text-neutral-400 mb-2">Users</div>
                  {userLoading && <div className="text-sm text-neutral-400">Searching users…</div>}
                  {!userLoading && userResults.length === 0 && q && (
                    <div className="text-sm text-neutral-400">No users found</div>
                  )}
                  <ul className="space-y-2">
                    {userResults.slice(0, 10).map((u: any, uIdx: number) => (
                      <li key={`user-${u.id}`} className="">
                        <Link
                          href={`/creator/${u.id}`}
                          className={`flex items-center gap-3 px-2 py-1 rounded-md ${activeIndex === uIdx ? 'bg-white/10' : 'hover:bg-white/5'}`}
                          onClick={() => { pushRecent({ q: (u.name || u.displayName || u.username || u.handle || "User") as string, tab: "users" }); setOpen(false); }}
                        >
                          <span className="inline-flex h-8 w-8 rounded-full overflow-hidden bg-white/10 ring-1 ring-white/10">
                            {u.avatar || u.photoURL ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={(u.avatar || u.photoURL) as string} alt={(u.name || u.displayName || u.username || u.handle || "User") as string} className="h-full w-full object-cover" />
                            ) : null}
                          </span>
                          <span className="text-sm text-neutral-200 line-clamp-1">
                            {(u.name || u.displayName || u.username || u.handle || "User") as string}
                          </span>
                          {(u.username || u.handle) && <span className="text-xs text-neutral-500">@{(u.username || u.handle) as string}</span>}
                          <span className="text-xs text-neutral-500 ml-auto">user</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
