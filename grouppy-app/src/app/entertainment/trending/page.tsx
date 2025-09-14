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

export default async function TrendingPage({ searchParams }: { searchParams?: { language?: string; type?: "all" | "movie" | "tv" } }) {
  const language = searchParams?.language || "en-US";
  const type = (searchParams?.type as any) || "all";
  const region = "IN";
  let items: TmdbItem[] = [];
  try {
    const data = await getJSON<TmdbResponse>("trending/all/day", { page: 1, language, region });
    items = (data.results || []).map((r: any) => ({ ...r, media_type: (r.title ? "movie" : "tv") as any }));
    if (type === "movie") items = items.filter((r) => r.media_type === "movie");
    if (type === "tv") items = items.filter((r) => r.media_type === "tv");
  } catch {}

  return (
    <main className="min-h-dvh">
      <Header />
      <div className="max-w-screen-xl mx-auto px-4 pt-24 pb-16">
        <div className="flex items-baseline justify-between mb-4">
          <h1 className="text-2xl font-bold">Trending Today</h1>
        </div>
        <div className="flex gap-6">
          <FilterRail
            groups={[
              {
                title: "Type",
                param: "type",
                options: [
                  { label: "All", value: "all" },
                  { label: "Movies", value: "movie" },
                  { label: "TV", value: "tv" },
                ],
              },
              {
                title: "Language",
                param: "language",
                options: [
                  { label: "English", value: "en-US" },
                  { label: "Hindi", value: "hi-IN" },
                  { label: "Tamil", value: "ta-IN" },
                  { label: "Telugu", value: "te-IN" },
                  { label: "Malayalam", value: "ml-IN" },
                  { label: "Bengali", value: "bn-IN" },
                ],
              },
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
