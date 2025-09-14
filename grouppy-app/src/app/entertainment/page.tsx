import Header from "@/components/Header";
import HeroSlider from "@/components/HeroSlider";
import MediaCard from "@/components/MediaCard";
import { TmdbItem, TmdbResponse } from "@/lib/tmdb";
import { Metadata } from "next";
import { headers } from "next/headers";
import SectionRow from "@/components/SectionRow";
import MediaGrid from "@/components/MediaGrid";
import NotificationsClient from "@/components/NotificationsClient";
import UsersPicks from "@/components/UsersPicks";

export const revalidate = 86400; // revalidate daily

export const metadata: Metadata = {
  title: "Grouppy | Explore",
  description: "Today's watchable picks, trending, and upcoming movies/series/anime",
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

function uniqById(items: TmdbItem[]) {
  const seen = new Set<number>();
  return items.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
}

async function fetchSections(opts: { region?: string; language?: string }) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const region = opts.region || "IN";
  const language = opts.language || "en-US";

  const safe = async <T,>(p: Promise<T>): Promise<T | null> => {
    try { return await p; } catch { return null; }
  };

  const [discoverMovies, airingTodayTV, trendingAll, upcomingMovies, upcomingTV,
    netflixTV, primeTV, disneyHotstarTV, talkOfTown, trendingPeople,
    animeTrending, webSeriesTrending] = await Promise.all([
    // "Today's watchable" — discover movies available now and popular
    safe(getJSON<TmdbResponse>("discover/movie", {
      sort_by: "popularity.desc",
      include_adult: false,
      "primary_release_date.lte": dateStr,
      with_original_language: language.split("-")[0],
      language,
      region,
      page: 1,
    })),
    // TV airing today
    safe(getJSON<TmdbResponse>("tv/airing_today", { page: 1, language, region })),
    // Trending for trending section
    safe(getJSON<TmdbResponse>("trending/all/day", { page: 1, language, region })),
    // Upcoming movies and TV
    safe(getJSON<TmdbResponse>("movie/upcoming", { page: 1, language, region })),
    safe(getJSON<TmdbResponse>("tv/on_the_air", { page: 1, language, region })),
    // Curated network rows
    safe(getJSON<TmdbResponse>("discover/tv", { with_networks: 213, page: 1, language, region })), // Netflix
    safe(getJSON<TmdbResponse>("discover/tv", { with_networks: 1024, page: 1, language, region })), // Prime Video
    safe(getJSON<TmdbResponse>("discover/tv", { with_networks: "2739,3919", page: 1, language, region })), // Disney+ / Hotstar
    // Talk of the Town (popular movies today)
    safe(getJSON<TmdbResponse>("movie/popular", { page: 1, language, region })),
    // Sidebar: trending people today
    safe(getJSON<TmdbResponse>("trending/person/day", { page: 1, language, region })),
    // Anime: use trending TV and filter by Animation + Japanese for better coverage
    safe(getJSON<TmdbResponse>("trending/tv/day", { page: 1, language, region })),
    // Web Series: India-focused trending TV today
    safe(getJSON<TmdbResponse>("trending/tv/day", { page: 1, language, region })),
  ]);

  const todaysWatchable = uniqById([
    ...((discoverMovies?.results || []).map((r) => ({ ...r, media_type: "movie" as const }))),
    ...((airingTodayTV?.results || []).map((r) => ({ ...r, media_type: "tv" as const }))),
  ]).slice(0, 5);

  const trendingTop5 = (trendingAll?.results || []).slice(0, 10);

  const upcomingAll = uniqById([
    ...((upcomingMovies?.results || []).map((r) => ({ ...r, media_type: "movie" as const }))),
    ...((upcomingTV?.results || []).map((r) => ({ ...r, media_type: "tv" as const }))),
  ]);

  const talk = (talkOfTown?.results || []).slice(0, 12).map((r) => ({ ...r, media_type: (r.title ? "movie" : "tv") as "movie" | "tv" }));
  const netflix = (netflixTV?.results || []).slice(0, 12).map((r) => ({ ...r, media_type: "tv" as const }));
  const prime = (primeTV?.results || []).slice(0, 12).map((r) => ({ ...r, media_type: "tv" as const }));
  const disney = (disneyHotstarTV?.results || []).slice(0, 12).map((r) => ({ ...r, media_type: "tv" as const }));

  const animeFiltered = (animeTrending?.results || []).filter((r) =>
    Array.isArray(r.genre_ids) && r.genre_ids.includes(16) && (r.original_language === "ja" || r.original_language === "zh" || r.original_language === "ko")
  );
  const animeTop5 = animeFiltered.slice(0, 10).map((r) => ({ ...r, media_type: "tv" as const }));
  const webSeriesTop5 = (webSeriesTrending?.results || []).slice(0, 10).map((r) => ({ ...r, media_type: "tv" as const }));

  return { todaysWatchable, trendingTop5, upcomingAll, talk, netflix, prime, disney, trendingPeople: (trendingPeople?.results || []), animeTop5, webSeriesTop5 };
}

export default async function EntertainmentPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string; language?: string }>;
}) {
  let todaysWatchable: TmdbItem[] = [];
  let trendingTop5: TmdbItem[] = [];
  let upcomingAll: TmdbItem[] = [];
  let talk: TmdbItem[] = [];
  let netflix: TmdbItem[] = [];
  let prime: TmdbItem[] = [];
  let disney: TmdbItem[] = [];
  let trendingPeopleList: any[] = [];
  let animeTop5: TmdbItem[] = [];
  let webSeriesTop5: TmdbItem[] = [];
  let error: string | null = null;
  try {
    const sp = await searchParams;
    const data = await fetchSections({
      region: sp.region,
      language: sp.language,
    });
    todaysWatchable = data.todaysWatchable;
    trendingTop5 = data.trendingTop5;
    upcomingAll = data.upcomingAll;
    talk = data.talk;
    netflix = data.netflix;
    prime = data.prime;
    disney = data.disney;
    trendingPeopleList = data.trendingPeople || [];
    animeTop5 = data.animeTop5 || [];
    webSeriesTop5 = data.webSeriesTop5 || [];
  } catch (e: any) {
    error = e?.message || "Failed to fetch content";
  }

  return (
    <main className="min-h-dvh">
      <Header />
      {/* Hero at the very top, under the transparent header, 80% width on large screens */}
      <div className="-mt-[56px] pt-[56px]">
        <div className="w-full lg:w-[100%] mx-auto">
          <HeroSlider items={todaysWatchable} />
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 pb-16">
        {error && (
          <div className="mt-4 p-3 rounded-md bg-red-500/10 text-red-300 text-sm">
            {"We couldn't load content right now. Please check your connection or try again later."}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-9">
            <section className="mt-8">
              <h2 className="text-xl font-semibold mb-3"><a href="/entertainment/trending" className="hover:underline">Trending Today</a></h2>
              <MediaGrid items={trendingTop5} limit={10} compact={true} />
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold mb-3"><a href="/entertainment/upcoming" className="hover:underline">Upcoming</a></h2>
              <MediaGrid items={upcomingAll} limit={10} compact={true} />
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold mb-3"><a href="/entertainment/anime" className="hover:underline">Anime</a></h2>
              <MediaGrid items={animeTop5} limit={10} compact={true} />
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold mb-3"><a href="/entertainment/web-series" className="hover:underline">Web Series (India)</a></h2>
              <MediaGrid items={webSeriesTop5} limit={10} compact={true} />
            </section>
          </div>

          <aside className="hidden lg:block lg:col-span-3">
            <div className="mt-12 lg:mt-16">
              <UsersPicks inline={true} />
            </div>
          </aside>
        </div>

        <NotificationsClient
          todaysWatchable={todaysWatchable}
          trendingTop5={trendingTop5}
          upcomingAll={upcomingAll}
        />
      </div>
    </main>
  );
}
