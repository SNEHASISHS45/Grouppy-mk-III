import Header from "@/components/Header";
import Image from "next/image";
import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "TV Show | Grouppy",
};

async function getBase() {
  const h = await headers();
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

function formatRuntime(mins?: number) {
  if (!mins && mins !== 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h > 0 ? `${h}h ` : ""}${m}m`;
}

export default async function TvDetail({ params }: { params: Promise<{ id: string }> }) {
  let error: string | null = null;
  let tv: any = null;
  let providers: any = null;
  let videos: any = null;
  let credits: any = null;
  let images: any = null;
  let ratings: any = null;
  try {
    const p = await params;
    [tv, providers, videos, credits, images, ratings] = await Promise.all([
      getJSON(`tv/${p.id}`, { language: "en-US", append_to_response: "recommendations,similar" }),
      getJSON(`tv/${p.id}/watch/providers`),
      getJSON(`tv/${p.id}/videos`, { language: "en-US" }),
      getJSON(`tv/${p.id}/credits`),
      getJSON(`tv/${p.id}/images`, { include_image_language: "en,null" }),
      getJSON(`tv/${p.id}/content_ratings`),
    ]);
  } catch (e: any) {
    error = e?.message || "Could not load TV show";
  }

  const backdrop = tv?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tv.backdrop_path}` : undefined;
  const trailer = Array.isArray(videos?.results)
    ? videos.results.find((v: any) => v.site === "YouTube" && v.type?.toLowerCase().includes("trailer"))
    : null;
  const inIN = providers?.results?.IN || providers?.results?.US;
  const flatrate = inIN?.flatrate || [];
  const rent = inIN?.rent || [];
  const buy = inIN?.buy || [];

  // Indian rating (content ratings)
  let certification: string | null = null;
  const rt = ratings?.results || [];
  const ind = rt.find((r: any) => r.iso_3166_1 === "IN");
  if (ind?.rating) certification = ind.rating;

  const episodeMinutes = Array.isArray(tv?.episode_run_time) && tv.episode_run_time.length ? tv.episode_run_time[0] : null;
  const runtime = formatRuntime(episodeMinutes || undefined);
  const language = (tv?.original_language || "").toUpperCase();
  const firstAirYear = (tv?.first_air_date || "").slice(0, 4);
  const poster = tv?.poster_path ? `https://image.tmdb.org/t/p/w500${tv.poster_path}` : undefined;
  const genres = (tv?.genres || []).map((g: any) => g.name).slice(0, 3);
  const topCast = Array.isArray(credits?.cast) ? credits.cast.slice(0, 6) : [];
  const networks = (tv?.networks || []).map((n: any) => n.name).join(', ');
  const seasonsCount = tv?.number_of_seasons;
  const episodesCount = tv?.number_of_episodes;

  return (
    <main className="min-h-dvh">
      <Header />
      <div className="max-w-screen-xl mx-auto px-4 pb-16">
        {error && (
          <div className="mt-4 p-3 rounded-md bg-red-500/10 text-red-300 text-sm">{error}</div>
        )}

        <div className="relative h-[54vw] max-h-[520px] rounded-xl overflow-hidden">
          {backdrop && (
            <Image src={backdrop} alt={tv?.name || "TV"} fill className="object-cover" sizes="100vw" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute inset-0 flex items-end">
            <div className="p-4 sm:p-6 lg:p-8 flex items-end gap-4">
              {poster && (
                <Image src={poster} alt={tv?.name || "TV"} width={140} height={210} className="rounded-xl ring-1 ring-white/20" />
              )}
              <div className="max-w-[820px]">
                <div className="text-xs text-neutral-300">Series • {firstAirYear} {runtime ? `• ${runtime}/ep` : ""} • {language}</div>
                <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">{tv?.name}</h1>
                <p className="text-sm text-neutral-300 line-clamp-3 mt-2">{tv?.overview}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {genres.map((g: string) => (
                    <span key={g} className="px-2 py-1 rounded-full text-xs bg-white/10 border border-white/10">{g}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {trailer && (
          <div className="mt-6 aspect-video w-full rounded-lg overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}`}
              title="Trailer"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        )}

        <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Key facts */}
          <div className="rounded-xl border border-white/10 p-4 bg-white/5">
            <h2 className="text-lg font-semibold mb-2">Key Facts</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              {certification && (<><dt className="text-neutral-400">Rating (IN)</dt><dd className="font-medium">{certification}</dd></>)}
              {runtime && (<><dt className="text-neutral-400">Runtime</dt><dd className="font-medium">{runtime}/ep</dd></>)}
              {seasonsCount && (<><dt className="text-neutral-400">Seasons</dt><dd className="font-medium">{seasonsCount}</dd></>)}
              {episodesCount && (<><dt className="text-neutral-400">Episodes</dt><dd className="font-medium">{episodesCount}</dd></>)}
              <dt className="text-neutral-400">Network</dt>
              <dd className="font-medium">{networks || '—'}</dd>
              <dt className="text-neutral-400">Genres</dt>
              <dd className="font-medium">{genres.join(', ') || '—'}</dd>
              <dt className="text-neutral-400">Language</dt>
              <dd className="font-medium">{language || '—'}</dd>
              <dt className="text-neutral-400">First Aired</dt>
              <dd className="font-medium">{tv?.first_air_date || '—'}</dd>
            </dl>
          </div>

          {/* Middle: Watch Providers (India prioritized) */}
          <div className="rounded-xl border border-white/10 p-4 bg-white/5">
            <h2 className="text-lg font-semibold mb-2">Where to Watch (IN)</h2>
            <div className="text-sm text-neutral-300">
              {flatrate.length === 0 && rent.length === 0 && buy.length === 0 ? (
                <p>No providers available for your region.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {flatrate.map((p: any) => (
                    <span key={p.provider_id} className="px-2 py-1 bg-white/10 rounded">{p.provider_name}</span>
                  ))}
                  {rent.map((p: any) => (
                    <span key={p.provider_id} className="px-2 py-1 bg-white/10 rounded">Rent: {p.provider_name}</span>
                  ))}
                  {buy.map((p: any) => (
                    <span key={p.provider_id} className="px-2 py-1 bg-white/10 rounded">Buy: {p.provider_name}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Top Cast */}
          <div className="rounded-xl border border-white/10 p-4 bg-white/5">
            <h2 className="text-lg font-semibold mb-2">Top Cast</h2>
            <ul className="grid grid-cols-3 gap-3">
              {topCast.map((p: any) => (
                <li key={p.id} className="text-center">
                  {p.profile_path ? (
                    <Image src={`https://image.tmdb.org/t/p/w185${p.profile_path}`} alt={p.name} width={80} height={80} className="rounded-full mx-auto" />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-white/10 mx-auto" />
                  )}
                  <div className="text-xs font-medium mt-1 line-clamp-1">{p.name}</div>
                  <div className="text-[11px] text-neutral-400 line-clamp-1">{p.character}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="mt-8">
          <Link href="/entertainment" className="text-sm text-neutral-300 hover:text-white">← Back to Explore</Link>
        </div>
      </div>
    </main>
  );
}
