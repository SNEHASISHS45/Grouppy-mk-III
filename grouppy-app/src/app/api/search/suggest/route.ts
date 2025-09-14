import { NextRequest, NextResponse } from "next/server";
import { rankCandidates } from "@/lib/fuzzy";

const TMDB_BASE = "https://api.themoviedb.org/3";

export const revalidate = 600;

async function tmdb(path: string, search: Record<string, string>) {
  const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY not configured");
  const url = new URL(`${TMDB_BASE}/${path}`);
  Object.entries(search).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("api_key", apiKey);
  if (!url.searchParams.has("language")) url.searchParams.set("language", "en-US");
  if (!url.searchParams.has("region")) url.searchParams.set("region", "IN");
  const isDev = process.env.NODE_ENV !== "production";
  const res = await fetch(url.toString(), {
    ...(isDev ? { cache: "no-store" as const } : { next: { revalidate } }),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TMDB upstream error ${res.status}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("query") || req.nextUrl.searchParams.get("q") || "";
    const page = req.nextUrl.searchParams.get("page") || "1";
    const includeAdult = req.nextUrl.searchParams.get("include_adult") || "false";
    if (!q.trim()) return NextResponse.json({ results: [] });

    const multi = await tmdb("search/multi", { query: q, page, include_adult: includeAdult });
    let results: any[] = Array.isArray(multi?.results) ? multi.results : [];

    if (results.length < 10) {
      const [movies, tv] = await Promise.all([
        tmdb("search/movie", { query: q, page: "1", include_adult: includeAdult }),
        tmdb("search/tv", { query: q, page: "1", include_adult: includeAdult }),
      ]);
      const extra: any[] = [
        ...(Array.isArray(movies?.results) ? movies.results.map((r: any) => ({ ...r, media_type: "movie" })) : []),
        ...(Array.isArray(tv?.results) ? tv.results.map((r: any) => ({ ...r, media_type: "tv" })) : []),
      ];
      const seen = new Set<string>(results.map((r: any) => `${r.media_type}-${r.id}`));
      for (const r of extra) {
        const key = `${r.media_type}-${r.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(r);
        }
      }
    }

    // Fuzzy rank to improve typos and relevance
    const ranked = rankCandidates<any>(q, results, [
      (r) => r.title || r.name || "",
    ]).slice(0, 20).map((r) => r.item);

    return NextResponse.json({ results: ranked });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
