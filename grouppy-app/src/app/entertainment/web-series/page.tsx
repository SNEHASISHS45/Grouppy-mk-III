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

export default async function WebSeriesPage({ searchParams }: { searchParams?: { language?: string; original_language?: string; onair?: string } }) {
  const language = searchParams?.language || "en-US";
  const orig = searchParams?.original_language || "hi"; // prefer Hindi by default for India
  const onair = searchParams?.onair === "1"; // filter on-the-air
  const region = "IN";
  let items: TmdbItem[] = [];
  try {
    const baseQuery: Record<string, string | number | boolean> = { page: 1, language, region };
    if (onair) {
      const data = await getJSON<TmdbResponse>("tv/on_the_air", baseQuery);
      items = (data.results || []).map((r: any) => ({ ...r, media_type: "tv" as const }));
    } else {
      // Trending TV in India
      const data = await getJSON<TmdbResponse>("trending/tv/day", baseQuery);
      items = (data.results || []).map((r: any) => ({ ...r, media_type: "tv" as const }));
    }
    // Optional original language filter
    if (orig) items = items.filter((r: any) => (r.original_language || "").toLowerCase() === orig.toLowerCase());
  } catch {}

  return (
    <main className="min-h-dvh">
      <Header />
      <div className="max-w-screen-xl mx-auto px-4 pt-24 pb-16">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h1 className="text-2xl font-bold">Web Series (India)</h1>
          <form method="get" className="flex items-center gap-2">
            <select name="original_language" defaultValue={orig} className="bg-white/10 text-sm rounded px-2 py-1 border border-white/10">
              <option value="">All Languages</option>
              <option value="hi">Hindi</option>
              <option value="en">English</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
              <option value="ml">Malayalam</option>
            </select>
            <select name="language" defaultValue={language} className="bg-white/10 text-sm rounded px-2 py-1 border border-white/10">
              <option value="en-US">UI: English</option>
              <option value="hi-IN">UI: Hindi</option>
            </select>
            <label className="flex items-center gap-1 text-sm text-neutral-300">
              <input type="checkbox" name="onair" value="1" defaultChecked={onair} className="accent-white" /> On the air
            </label>
            <button className="px-3 py-1.5 bg-white text-black rounded text-sm">Apply</button>
          </form>
        </div>
        <MediaGrid items={items} limit={40} compact={true} />
      </div>
    </main>
  );
}
