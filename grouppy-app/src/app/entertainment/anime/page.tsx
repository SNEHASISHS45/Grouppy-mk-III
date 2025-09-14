import Header from "@/components/Header";
import MediaGrid from "@/components/MediaGrid";
import FilterRail from "@/components/filter/FilterRail";
import { TmdbItem, TmdbResponse } from "@/lib/tmdb";
import { headers } from "next/headers";

export const revalidate = 3600;

async function getBase() {
  const h = (await headers()) as unknown as Headers;
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

async function getJSON<T>(path: string, search?: Record<string, string | number | boolean>): Promise<T> {
  const base = await getBase();
  const url = new URL(`/api/tmdb/${path}`, base);
  if (search) Object.entries(search).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { next: { revalidate } });
  if (!res.ok) throw new Error(`TMDB error ${res.status}`);
  return (await res.json()) as T;
}

export default async function AnimePage({ searchParams }: { searchParams?: { language?: string; original_language?: string; year?: string; network?: string; sort_by?: string } }) {
  const language = searchParams?.language || "en-US";
  const orig = searchParams?.original_language || "ja"; // default Japanese
  const year = searchParams?.year || "";
  const network = searchParams?.network || ""; // TMDB network ID e.g., Crunchyroll id
  const sort_by = searchParams?.sort_by || "popularity.desc";
  const region = "IN";
  let items: TmdbItem[] = [];
  try {
    // Discover animation TV with optional original language filter
    const params: Record<string, string | number | boolean> = {
      with_genres: 16,
      with_original_language: orig,
      sort_by,
      page: 1,
      language,
      region,
    };
    if (year) params["first_air_date_year"] = year;
    if (network) params["with_networks"] = network;
    const data = await getJSON<TmdbResponse>("discover/tv", params);
    items = (data.results || []).map((r: any) => ({ ...r, media_type: "tv" as const }));
  } catch {}

  return (
    <main className="min-h-dvh">
      <Header />
      <div className="max-w-screen-xl mx-auto px-4 pt-24 pb-16">
        <div className="flex items-baseline justify-between mb-4 gap-3">
          <h1 className="text-2xl font-bold">Anime</h1>
        </div>
        <div className="flex gap-6">
          <FilterRail
            groups={[
              { title: "Original Language", param: "original_language", options: [
                { label: "Japanese", value: "ja" },
                { label: "Korean", value: "ko" },
                { label: "Chinese", value: "zh" },
                { label: "English", value: "en" },
              ]},
              { title: "Year", param: "year", options: [
                { label: "2025", value: "2025" },
                { label: "2024", value: "2024" },
                { label: "2023", value: "2023" },
                { label: "2022", value: "2022" },
              ]},
              { title: "Network", param: "network", options: [
                { label: "Crunchyroll", value: "40509" },
                { label: "Netflix", value: "213" },
                { label: "TV Tokyo", value: "98" },
              ]},
              { title: "Sort", param: "sort_by", options: [
                { label: "Popularity", value: "popularity.desc" },
                { label: "Rating", value: "vote_average.desc" },
                { label: "Newest", value: "first_air_date.desc" },
              ]},
            ]}
          />
          <div className="flex-1">
            <MediaGrid items={items} limit={40} compact={true} />
          </div>
        </div>
      </div>
    </main>
  );
}
