import Header from "@/components/Header";
import MediaGrid from "@/components/MediaGrid";
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

export default async function UpcomingPage({ searchParams }: { searchParams?: { language?: string } }) {
  const language = searchParams?.language || "en-US";
  const region = "IN";
  let items: TmdbItem[] = [];
  try {
    const [movies, tv] = await Promise.all([
      getJSON<TmdbResponse>("movie/upcoming", { page: 1, language, region }),
      getJSON<TmdbResponse>("tv/on_the_air", { page: 1, language, region }),
    ]);
    items = [
      ...(movies.results || []).map((r: any) => ({ ...r, media_type: "movie" as const })),
      ...(tv.results || []).map((r: any) => ({ ...r, media_type: "tv" as const })),
    ];
  } catch {}

  return (
    <main className="min-h-dvh">
      <Header />
      <div className="max-w-screen-xl mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Upcoming</h1>
          <form method="get" className="flex items-center gap-2">
            <select name="language" defaultValue={language} className="bg-white/10 text-sm rounded px-2 py-1 border border-white/10">
              <option value="en-US">English</option>
              <option value="hi-IN">Hindi</option>
              <option value="ta-IN">Tamil</option>
              <option value="te-IN">Telugu</option>
              <option value="ml-IN">Malayalam</option>
              <option value="bn-IN">Bengali</option>
            </select>
            <button className="px-3 py-1.5 bg-white text-black rounded text-sm">Apply</button>
          </form>
        </div>
        <MediaGrid items={items} limit={40} compact={true} />
      </div>
    </main>
  );
}
