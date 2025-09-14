import LoginClient from "./LoginClient";
import { img, type TmdbResponse, type TmdbItem } from "@/lib/tmdb";

async function fetchInitialPosters(): Promise<string[]> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const collect = async (path: string, qs = "") => {
    const res = await fetch(`${base}/api/tmdb/${path}${qs}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [] as TmdbItem[];
    const data = (await res.json()) as TmdbResponse;
    return (data?.results || []) as TmdbItem[];
  };
  try {
    const [trMovie, trTv, airing, nowMovie] = await Promise.all([
      collect("trending/movie/week", "?page=1"),
      collect("trending/tv/week", "?page=1"),
      collect("tv/airing_today", "?page=1"),
      collect("movie/now_playing", "?page=1"),
    ]);
    const all = [...trMovie, ...trTv, ...airing, ...nowMovie];
    const urls = all.map((it) => (it.poster_path ? img.poster(it.poster_path, "w342") : undefined)).filter(Boolean) as string[];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of urls) { if (!seen.has(u)) { seen.add(u); out.push(u); } if (out.length >= 60) break; }
    return out;
  } catch {
    return [];
  }
}

export default async function LoginPage() {
  const initialPosters = await fetchInitialPosters();
  return (
    <LoginClient initialPosters={initialPosters} />
  );
}
