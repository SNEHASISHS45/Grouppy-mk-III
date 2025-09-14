import Header from "@/components/Header";
import MediaGrid from "@/components/MediaGrid";
import { TmdbItem, TmdbResponse } from "@/lib/tmdb";
import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
// Import client components directly; Server Components cannot use dynamic({ ssr: false })
import UsersSearchClient from "@/components/search/UsersSearchClient";
import RecentSearchesClient from "@/components/search/RecentSearchesClient";
import SearchQueryRecorder from "@/components/search/SearchQueryRecorder";
import { rankCandidates } from "@/lib/fuzzy";


export const revalidate = 3600; // cache search responses for 1 hour

export const metadata: Metadata = {
  title: "Search Movies | Grouppy",
  description: "Search movies worldwide",
};

async function getJSON<T>(path: string, search?: Record<string, string | number | boolean>): Promise<T> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  const base = `${proto}://${host}`;
  const url = new URL(`/api/tmdb/${path}`, base);
  if (search) Object.entries(search).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { next: { revalidate } });
  if (!res.ok) throw new Error(`TMDB request failed: ${res.status}`);
  return (await res.json()) as T;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; tab?: string }>
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const tab = (sp.tab || "movies").toLowerCase();
  const normalizedTab: "movies" | "tv" | "people" | "users" =
    tab === "tv" ? "tv" : tab === "people" ? "people" : tab === "users" ? "users" : "movies";

  let data: TmdbResponse<TmdbItem> | null = null;
  let error: string | null = null;

  if (q && normalizedTab !== "users") {
    try {
      const endpoint =
        normalizedTab === "tv" ? "search/tv" : normalizedTab === "people" ? "search/person" : "search/movie";
      data = await getJSON<TmdbResponse<TmdbItem>>(endpoint, { query: q, page, include_adult: false });
    } catch (e: any) {
      error = e?.message || "Failed to search";
    }
  }

  const items: TmdbItem[] = (data?.results || []).map((r) => ({
    ...r,
    media_type: normalizedTab === "tv" ? ("tv" as const) : normalizedTab === "people" ? ("person" as const) : ("movie" as const),
  }));
  const totalPages = data?.total_pages || 0;
  const totalResults = data?.total_results || 0;

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = totalPages && page < totalPages ? page + 1 : null;

  // Did you mean: based on top item title/name similarity vs query
  let didYouMean: string | null = null;
  if (q && (normalizedTab === "movies" || normalizedTab === "tv" || normalizedTab === "people") && items.length > 0) {
    const fields = [
      (it: TmdbItem) => it.title || it.name || "",
    ];
    const ranked = rankCandidates<TmdbItem>(q, items.slice(0, 20), fields);
    const top = ranked[0];
    if (top && top.score > 0.65) {
      const title = (top.item.title || top.item.name || "").trim();
      if (title && title.toLowerCase() !== q.toLowerCase()) {
        didYouMean = title;
      }
    }
  }

  return (
    <main className="min-h-dvh">
      <Header />
      <div className="-mt-[56px] pt-[56px]" />

      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold mb-4">Search</h1>

        <form action="/search" className="mb-4 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search movies, TV shows, actors, and users..."
            className="flex-1 rounded-md bg-neutral-900 border border-white/10 px-3 py-2 outline-none"
          />
          <input type="hidden" name="tab" value={normalizedTab} />
          <button className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20">Search</button>
        </form>

        <SearchQueryRecorder q={q} tab={normalizedTab} />

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          {([
            { key: "movies", label: "Movies" },
            { key: "tv", label: "TV Shows" },
            { key: "people", label: "Actors" },
            { key: "users", label: "Users" },
          ] as const).map((t) => (
            <Link
              key={t.key}
              href={{ pathname: "/search", query: { q, tab: t.key, page: 1 } }}
              className={`px-3 py-1 rounded-md border ${normalizedTab === t.key ? "bg-white/20 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Recent searches */}
        {!q && <RecentSearchesClient inline />}

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-500/10 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!q && (
          <div className="text-neutral-400 text-sm">Type a movie name above and press Enter.</div>
        )}

        {q && (
          <>
            {didYouMean && (
              <div className="text-sm text-neutral-300 mb-2">
                Did you mean {" "}
                <Link className="underline hover:text-white" href={{ pathname: "/search", query: { q: didYouMean, tab: normalizedTab, page: 1 } }}>{didYouMean}</Link>
                ?
              </div>
            )}
            <div className="text-sm text-neutral-400 mb-3">
              Showing results for <span className="text-white">"{q}"</span>
              {typeof totalResults === "number" ? ` · ${totalResults} found` : null}
            </div>
            {normalizedTab === "people" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((p) => {
                  const name = p.name || "Unknown";
                  const profile = (p as any).profile_path as string | undefined;
                  const imgUrl = profile ? `https://image.tmdb.org/t/p/w342${profile}` : undefined;
                  const dept = (p as any).known_for_department as string | undefined;
                  const href = `/person/${p.id}`;
                  return (
                    <Link key={`person-${p.id}`} href={href} className="flex flex-col gap-2 group">
                      <div className="relative w-full overflow-hidden rounded-xl bg-neutral-900 aspect-[2/3] ring-1 ring-white/5">
                        {imgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-xs text-neutral-500">No Image</div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold leading-snug line-clamp-1 text-neutral-100 group-hover:text-white">{name}</h3>
                        <p className="text-xs text-neutral-400 mt-0.5">{dept || "Person"}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : normalizedTab === "users" ? (
              <UsersSearchClient q={q} />
            ) : (
              <MediaGrid items={items} limit={undefined as any} compact={true} />
            )}

            {normalizedTab !== "users" && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-xs text-neutral-500">Page {page}{totalPages ? ` / ${totalPages}` : ""}</div>
              <div className="flex gap-2">
                {prevPage ? (
                  <Link prefetch href={{ pathname: "/search", query: { q, tab: normalizedTab, page: prevPage } }} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-sm">Previous</Link>
                ) : (
                  <button disabled className="px-3 py-1 rounded bg-white/5 text-neutral-500 text-sm cursor-not-allowed">Previous</button>
                )}
                {nextPage ? (
                  <Link prefetch href={{ pathname: "/search", query: { q, tab: normalizedTab, page: nextPage } }} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-sm">Next</Link>
                ) : (
                  <button disabled className="px-3 py-1 rounded bg-white/5 text-neutral-500 text-sm cursor-not-allowed">Next</button>
                )}
              </div>
            </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
