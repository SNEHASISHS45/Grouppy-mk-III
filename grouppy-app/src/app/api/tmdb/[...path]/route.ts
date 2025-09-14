import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { redisGetJSON, redisSetJSON } from "@/lib/redis";

// Simple proxy to TMDB to avoid client-side API key exposure and help with ISP blocks
// Usage: /api/tmdb/<path>?<originalQuery>
// Example: /api/tmdb/trending/all/day

const TMDB_BASE = "https://api.themoviedb.org/3";

// Simple in-memory cache for resilience. Survives per-server process lifetime.
type CacheEntry = { data: any; storedAt: number };
const memoryCache = new Map<string, CacheEntry>();
const STALE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Disk cache helpers
const DISK_CACHE_DIR = path.join(process.cwd(), ".cache", "tmdb");
function keyToFilename(key: string) {
  const hash = crypto.createHash("sha1").update(key).digest("hex");
  return path.join(DISK_CACHE_DIR, `${hash}.json`);
}
async function readDiskCache(key: string): Promise<CacheEntry | null> {
  try {
    const file = keyToFilename(key);
    const buf = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(buf) as CacheEntry;
    if (parsed && typeof parsed.storedAt === "number") return parsed;
    return null;
  } catch {
    return null;
  }
}
async function writeDiskCache(key: string, data: any): Promise<void> {
  try {
    await fs.mkdir(DISK_CACHE_DIR, { recursive: true });
    const file = keyToFilename(key);
    const payload: CacheEntry = { data, storedAt: Date.now() };
    await fs.writeFile(file, JSON.stringify(payload), "utf8");
  } catch {
    // ignore disk write errors (read-only envs, etc.)
  }
}

export const revalidate = 86400; // 24 hours for ISR-like caching (prod)

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
    const accessToken = process.env.TMDB_ACCESS_TOKEN; // Optional v4 bearer token
    if (!apiKey && !accessToken) {
      return NextResponse.json({ error: "TMDB credentials not configured", hint: "Set TMDB_API_KEY (v3) or TMDB_ACCESS_TOKEN (v4) in grouppy-app/.env.local" }, { status: 500 });
    }

    const path = params.path?.join("/") || "";

    const url = new URL(`${TMDB_BASE}/${path}`);
    // pass through all original query params
    const original = new URL(req.url);
    original.searchParams.forEach((value, key) => url.searchParams.set(key, value));
    // ensure credentials present
    if (apiKey) {
      url.searchParams.set("api_key", apiKey);
    }
    // language and region defaults for better relevance
    if (!url.searchParams.has("language")) url.searchParams.set("language", "en-US");
    if (!url.searchParams.has("region")) url.searchParams.set("region", "IN");

    const isDev = process.env.NODE_ENV !== "production";
    const fetchUrl = url.toString();
    // First try Redis cache (fresh within TTL)
    const redisCached = await redisGetJSON<any>(fetchUrl);
    if (redisCached && Date.now() - redisCached.storedAt < STALE_TTL_MS) {
      return NextResponse.json(redisCached.data, { status: 200, headers: { "X-Cache": "redis" } });
    }

    const res = await fetch(fetchUrl, {
      ...(isDev ? { cache: "no-store" as const } : { next: { revalidate } }),
      headers: {
        Accept: "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      // Serve stale disk cache first
      const disk = await readDiskCache(fetchUrl);
      if (disk && Date.now() - disk.storedAt < STALE_TTL_MS) {
        return NextResponse.json(disk.data, {
          status: 200,
          headers: { Warning: `199 - Served stale TMDB disk cache due to upstream ${res.status}` },
        });
      }
      // Then serve memory cache if present
      const cached = memoryCache.get(fetchUrl);
      if (cached && Date.now() - cached.storedAt < STALE_TTL_MS) {
        return NextResponse.json(cached.data, {
          status: 200,
          headers: { Warning: `199 - Served stale TMDB cache due to upstream ${res.status}` },
        });
      }
      // Common helpful hints
      const hint = res.status === 401 ? "Invalid TMDB credentials: check TMDB_API_KEY / TMDB_ACCESS_TOKEN" : (res.status === 404 ? "Invalid path or parameters" : undefined);
      return NextResponse.json({ error: "TMDB upstream error", status: res.status, hint, body: text.slice(0, 500) }, { status: 502 });
    }

    const data = await res.json();
    // Update all caches on success
    const entry = { data, storedAt: Date.now() };
    memoryCache.set(fetchUrl, entry);
    writeDiskCache(fetchUrl, data).catch(() => {});
    redisSetJSON(fetchUrl, entry, Math.floor(STALE_TTL_MS / 1000)).catch(() => {});
    // In dev, skip cache headers so changes reflect instantly
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json(data, { status: 200 });
    }
    return NextResponse.json(data, { status: 200, headers: { "Cache-Control": `public, s-maxage=${revalidate}, stale-while-revalidate=${revalidate}` } });
  } catch (err: any) {
    // On unexpected errors, try serving stale cache too
    try {
      const original = new URL(req.url);
      const attemptedUrl = `${TMDB_BASE}/${(params.path?.join("/") || "")}${original.search}`;
      // Try Redis first
      const r = await redisGetJSON<any>(attemptedUrl);
      if (r && Date.now() - r.storedAt < STALE_TTL_MS) {
        return NextResponse.json(r.data, { status: 200, headers: { Warning: "199 - Served stale TMDB redis cache due to internal error" } });
      }
      // Then disk
      const disk = await readDiskCache(attemptedUrl);
      if (disk && Date.now() - disk.storedAt < STALE_TTL_MS) {
        return NextResponse.json(disk.data, { status: 200, headers: { Warning: "199 - Served stale TMDB disk cache due to internal error" } });
      }
      const cached = memoryCache.get(attemptedUrl);
      if (cached && Date.now() - cached.storedAt < STALE_TTL_MS) {
        return NextResponse.json(cached.data, { status: 200, headers: { Warning: "199 - Served stale TMDB cache due to internal error" } });
      }
    } catch {}
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
