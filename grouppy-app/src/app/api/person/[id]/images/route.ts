import { NextRequest, NextResponse } from "next/server";

export const revalidate = 600;

async function tmdb(path: string, search: Record<string, string | number> = {}) {
  const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "TMDB_API_KEY missing" }, { status: 500 });
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  Object.entries(search).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  url.searchParams.set("api_key", apiKey);
  const res = await fetch(url.toString(), { next: { revalidate } });
  if (!res.ok) return NextResponse.json({ error: `TMDB error ${res.status}` }, { status: res.status });
  return NextResponse.json(await res.json());
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("pageSize") || "20", 10)));
  const resp = await tmdb(`person/${p.id}/images`);
  if ((resp as any).status && (resp as any).status !== 200) return resp as NextResponse;
  const json = await (resp as NextResponse).json();
  const profiles: any[] = Array.isArray(json?.profiles) ? json.profiles : [];
  const total = profiles.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = profiles.slice(start, end);
  return NextResponse.json({ page, pageSize, total, results: items });
}
