import { NextRequest, NextResponse } from "next/server";

export const revalidate = 600;

const TMDB = "https://api.themoviedb.org/3";
function apiKey() {
  return process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
}

async function fetchJson(url: URL) {
  const res = await fetch(url.toString(), { next: { revalidate } });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const key = apiKey();
    if (!key) return NextResponse.json({ error: "TMDB_API_KEY missing" }, { status: 500 });
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(30, Math.max(1, parseInt(req.nextUrl.searchParams.get("pageSize") || "9", 10)));

    const creditsUrl = new URL(`${TMDB}/person/${params.id}/combined_credits`);
    creditsUrl.searchParams.set("api_key", key);
    const credits = await fetchJson(creditsUrl);
    const cast: any[] = Array.isArray(credits?.cast) ? credits.cast : [];

    // top credits by popularity
    const top = cast
      .slice()
      .sort((a, b) => (Number(b.popularity || 0) - Number(a.popularity || 0)))
      .slice(0, 12);

    const videoFetches = top.map((c) => {
      const url = new URL(`${TMDB}/${c.media_type === "tv" ? "tv" : "movie"}/${c.id}/videos`);
      url.searchParams.set("api_key", key);
      return fetchJson(url).then((v) => ({ v, c })).catch(() => ({ v: { results: [] }, c }));
    });
    const settled = await Promise.all(videoFetches);
    const vids: any[] = [];
    for (const s of settled) {
      const arr = Array.isArray(s.v?.results) ? s.v.results : [];
      const good = arr.filter((x: any) => x.site === "YouTube" && ["Trailer", "Teaser", "Featurette", "Interview", "Clip"].includes(x.type));
      for (const g of good) {
        vids.push({
          key: g.key,
          name: g.name,
          site: g.site,
          type: g.type,
          id: g.id,
          from: { id: s.c.id, title: s.c.title || s.c.name || "", media_type: s.c.media_type, poster_path: s.c.poster_path, popularity: s.c.popularity },
        });
      }
    }

    // Viral-ish order
    const ordered = vids
      .slice()
      .sort((a, b) => (Number(b.from.popularity || 0) - Number(a.from.popularity || 0)) || (a.type === "Trailer" ? -1 : 1));

    const total = ordered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const items = ordered.slice(start, end);
    return NextResponse.json({ page, pageSize, total, results: items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
