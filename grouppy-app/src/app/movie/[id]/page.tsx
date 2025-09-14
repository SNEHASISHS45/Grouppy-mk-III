import Header from "@/components/Header";
import Image from "next/image";
import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import MediaGrid from "@/components/MediaGrid";
import MovieActionsClient from "@/components/MovieActionsClient";
import MovieReviewsClient from "@/components/MovieReviewsClient";
import WatchlistButton from "@/components/WatchlistButton";
import MovieHeroActionsClient from "@/components/MovieHeroActionsClient";
import ReviewMeterClient from "@/components/ReviewMeterClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Movie | Grouppy",
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
  if (!res.ok) {
    try {
      const data = await res.json();
      const hint = data?.hint ? ` - ${data.hint}` : "";
      throw new Error(`TMDB error ${res.status}${hint}`);
    } catch {
      throw new Error(`TMDB error ${res.status}`);
    }
  }
  return (await res.json()) as T;
}

function formatRuntime(mins?: number) {
  if (!mins && mins !== 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h > 0 ? `${h}h ` : ""}${m}m`;
}

export default async function MovieDetail({ params }: { params: Promise<{ id: string }> }) {
  let error: string | null = null;
  let movie: any = null;
  let providers: any = null;
  let videos: any = null;
  let credits: any = null;
  let images: any = null;
  try {
    const p = await params;
    [movie, providers, videos, credits, images] = await Promise.all([
      getJSON(`movie/${p.id}`, { language: "en-US", append_to_response: "release_dates,recommendations,similar" }),
      getJSON(`movie/${p.id}/watch/providers`),
      getJSON(`movie/${p.id}/videos`, { language: "en-US" }),
      getJSON(`movie/${p.id}/credits`),
      getJSON(`movie/${p.id}/images`, { include_image_language: "en,null" }),
    ]);
  } catch (e: any) {
    error = e?.message || "Could not load movie";
  }

  const poster = movie?.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : undefined;
  const backdrop = movie?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : undefined;
  const trailer = Array.isArray(videos?.results)
    ? videos.results.find((v: any) => v.site === "YouTube" && v.type?.toLowerCase().includes("trailer"))
    : null;
  const inIN = providers?.results?.IN || providers?.results?.US;
  const flatrate = inIN?.flatrate || [];
  const rent = inIN?.rent || [];
  const buy = inIN?.buy || [];

  // Indian certification from release_dates
  let certification: string | null = null;
  const rel = movie?.release_dates?.results || [];
  const india = rel.find((r: any) => r.iso_3166_1 === "IN");
  if (india?.release_dates?.length) {
    const sorted = india.release_dates.sort((a: any, b: any) => (b.certification?.length || 0) - (a.certification?.length || 0));
    certification = sorted[0]?.certification || null;
  }

  const director = Array.isArray(credits?.crew) ? credits.crew.find((p: any) => p.job === "Director") : null;
  const topCast = Array.isArray(credits?.cast) ? credits.cast.slice(0, 12) : [];
  // Group crew by person and aggregate jobs
  type CrewAccum = Record<number, { id: number; name: string; profile_path?: string; jobs: Set<string> }>;
  const crewPeople: Array<{ id: number; name: string; profile_path?: string; jobs: string[] }> = Array.isArray(credits?.crew)
    ? Object.values(
        (credits.crew as any[]).reduce((acc: CrewAccum, c: any) => {
          const id = Number(c.id);
          if (!acc[id]) acc[id] = { id, name: String(c.name || ""), profile_path: c.profile_path, jobs: new Set<string>() };
          if (c.job) acc[id].jobs.add(String(c.job));
          return acc;
        }, {} as CrewAccum)
      ).map((p) => ({ id: p.id, name: p.name, profile_path: p.profile_path, jobs: Array.from(p.jobs.values()).slice(0, 3) }))
    : [];
  const genres = (movie?.genres || []).map((g: any) => g.name).slice(0, 3);
  const runtime = formatRuntime(movie?.runtime);
  const language = (movie?.original_language || "").toUpperCase();
  const releaseYear = (movie?.release_date || "").slice(0, 4);
  const voteAvg = Math.round((movie?.vote_average || 0) * 10); // percentage
  const recs = (movie?.recommendations?.results || []).map((r: any) => ({ ...r, media_type: "movie" as const }));
  const country = Array.isArray(movie?.production_countries) && movie.production_countries.length ? movie.production_countries[0].name : undefined;

  return (
    <main className="min-h-dvh overflow-x-hidden">
      <Header />
      {/* Full-width hero (full-bleed) */}
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
        <div className="relative h-[54vw] max-h-[520px] overflow-hidden">
          {backdrop && (
            <Image src={backdrop} alt={movie?.title || "Movie"} fill className="object-cover" sizes="100vw" priority quality={90} />
          )}
          {/* Base vignette (no blur to keep cover sharp) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          {/* Stronger bottom fade for readability */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />

          {/* Center play button overlay (links only the button, not the whole hero) */}
          {trailer && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <a
                href={`https://www.youtube.com/watch?v=${trailer.key}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Play trailer"
                className="pointer-events-auto h-14 w-14 rounded-full bg-black/50 border border-white/20 grid place-items-center text-white"
              >
                ▶
              </a>
            </div>
          )}

          {/* Top-right release date badge */}
          {movie?.release_date && (
            <div className="absolute top-20 right-4 z-10">
              <div className="px-3 py-1 rounded-full text-xs text-white/120 bg-black/40 border border-white/20 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                Releases on <span className="font-medium text-white">{movie.release_date}</span>
              </div>
            </div>
          )}

          {/* Bottom-left poster + info block */}
          <div className="absolute inset-0 flex items-end">
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex items-end gap-4 max-w-screen-xl mx-auto w-full">
              {poster && (
                <Image src={poster} alt={movie?.title || "Movie"} width={170} height={250} style={{ height: "auto" }} className="rounded-xl ring-1 ring-white/20 shadow-[0_15px_40px_rgba(0,0,0,0.6)]" />
              )}
              <div className="max-w-[820px]">
                <div className="text-xs text-neutral-300">Movie • {releaseYear} {runtime ? `• ${runtime}` : ""} • {language}</div>
                <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">{movie?.title}</h1>
                {movie?.release_date && (
                  <div className="mt-3 text-xs text-neutral-300">Releases on <span className="font-medium text-white">{movie.release_date}</span></div>
                )}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-neutral-300">
                  <div>
                    <div>Directed By</div>
                    <div className="text-white font-semibold">{director?.name || '—'}</div>
                  </div>
                  <div>
                    <div>Country</div>
                    <div className="text-white font-semibold">{country || '—'}</div>
                  </div>
                  <div>
                    <div>Language</div>
                    <div className="text-white font-semibold">{language || '—'}</div>
                  </div>
                  <div>
                    <div>Age Rating</div>
                    <div className="text-white font-semibold">{certification || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom-right floating hero actions */}
          <div className="absolute bottom-4 right-4 z-10">
            <MovieHeroActionsClient movieId={movie?.id} title={movie?.title || 'Untitled'} poster={poster} />
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 pb-16">
        {error && (
          <div className="mt-4 p-3 rounded-md bg-red-500/10 text-red-300 text-sm">{error}</div>
        )}

        {/* Overview + Genres (moved out of hero) */}
        {(movie?.overview || genres.length > 0) && (
          <section className="mt-6">
            {movie?.overview && (
              <p className="text-sm sm:text-base text-neutral-300 max-w-3xl">{movie.overview}</p>
            )}
            {genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {genres.map((g: string) => (
                  <span key={g} className="px-2 py-1 rounded-full text-xs bg-white/10 border border-white/10">{g}</span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Main grid with sticky actions sidebar */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-9">
            {/* Key facts + Providers + Cast */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Key facts */}
              <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                <h2 className="text-lg font-semibold mb-2">Key Facts</h2>
                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                  {certification && (<><dt className="text-neutral-400">Certification (IN)</dt><dd className="font-medium">{certification}</dd></>)}
                  {runtime && (<><dt className="text-neutral-400">Runtime</dt><dd className="font-medium">{runtime}</dd></>)}
                  {director && (<><dt className="text-neutral-400">Director</dt><dd className="font-medium">{director.name}</dd></>)}
                  <dt className="text-neutral-400">Genres</dt>
                  <dd className="font-medium">{genres.join(', ') || '—'}</dd>
                  <dt className="text-neutral-400">Language</dt>
                  <dd className="font-medium">{language || '—'}</dd>
                  <dt className="text-neutral-400">Release</dt>
                  <dd className="font-medium">{movie?.release_date || '—'}</dd>
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

              {/* Right: Top Cast (rounded avatars) */}
              <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold">Cast</h2>
                  <Link href={`/movie/${movie?.id}/credits`} className="text-xs text-neutral-300 hover:text-white">View all</Link>
                </div>
                <div className="border-t border-white/10 -mx-4 mb-4" />
                <ul className="flex gap-6 overflow-x-auto scrollbar-none sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible">
                  {topCast.map((p: any) => (
                    <li key={p.id} className="text-center shrink-0 w-[136px] sm:w-auto">
                      <Link href={`/person/${p.id}`} className="inline-block">
                        {p.profile_path ? (
                          <Image src={`https://image.tmdb.org/t/p/w185${p.profile_path}`} alt={p.name} width={112} height={112} style={{ height: "auto" }} className="rounded-full mx-auto object-cover" />
                        ) : (
                          <div className="h-28 w-28 rounded-full mx-auto grid place-items-center" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), rgba(255,255,255,0.02))' }}>
                            <span className="text-lg font-semibold">{String(p.name || '?').trim().charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="text-sm font-semibold mt-2 leading-tight flex items-center justify-center text-white">
                          {p.name}
                        </div>
                        <div className="text-xs text-neutral-400 leading-tight">{p.character || p.known_for_department || 'Actor'}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Crew + Production + Audience Meter */}
            <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                <h2 className="text-lg font-semibold mb-2">Crew</h2>
                <div className="border-t border-white/10 -mx-4 mb-4" />
                <ul className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                  {crewPeople.slice(0, 6).map((c: any) => (
                    <li key={c.id} className="text-center">
                      <Link href={`/person/${c.id}`} className="inline-block">
                        {c.profile_path ? (
                          <Image src={`https://image.tmdb.org/t/p/w185${c.profile_path}`} alt={c.name} width={96} height={96} style={{ height: "auto" }} className="rounded-full mx-auto object-cover" />
                        ) : (
                          <div className="h-24 w-24 rounded-full mx-auto bg-white/10" />
                        )}
                        <div className="text-sm font-semibold mt-2 leading-tight text-white">{c.name}</div>
                        <div className="text-xs text-neutral-400 leading-tight">{c.jobs.join(', ')}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                <h2 className="text-lg font-semibold mb-2">Production Houses</h2>
                <ul className="grid grid-cols-2 gap-3">
                  {(movie?.production_companies || []).slice(0, 8).map((pc: any) => (
                    <li key={pc.id} className="flex items-center gap-3">
                      {pc.logo_path ? (
                        <Image src={`https://image.tmdb.org/t/p/w185${pc.logo_path}`} alt={pc.name} width={44} height={24} style={{ height: "auto" }} className="object-contain" />
                      ) : (
                        <div className="h-6 w-11 bg-white/10 rounded" />
                      )}
                      <div className="text-sm">{pc.name}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/10 p-4 bg-white/5">
                <h2 className="text-lg font-semibold mb-4">Audience Meter</h2>
                <div className="flex items-center gap-4">
                  <div
                    className="relative h-24 w-24 rounded-full grid place-items-center"
                    style={{ background: `conic-gradient(#22c55e ${voteAvg * 3.6}deg, rgba(255,255,255,0.08) 0)` }}
                  >
                    <div className="absolute inset-[6px] rounded-full bg-black grid place-items-center">
                      <span className="text-xl font-bold">{voteAvg}<span className="text-xs">%</span></span>
                    </div>
                  </div>
                  <div className="text-sm text-neutral-300">
                    Based on community activity.
                    <div className="mt-1 text-xs">Reactions: {movie?.vote_count || 0}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Review Meter (aggregated from site reviews) */}
            <section className="mt-8">
              <ReviewMeterClient movieId={movie?.id} />
            </section>

            {/* Reviews (site users) */}
            <section className="mt-8">
              <h2 className="text-xl font-semibold mb-3">Reviews</h2>
              <MovieReviewsClient movieId={movie?.id} />
            </section>

            {/* Recommendations */}
            {recs.length > 0 && (
              <section className="mt-8">
                <h2 className="text-xl font-semibold mb-3">Recommended</h2>
                <MediaGrid items={recs} limit={10} compact={true} />
              </section>
            )}

            <div className="mt-8">
              <Link href="/entertainment" className="text-sm text-neutral-300 hover:text-white">← Back to Explore</Link>
            </div>
          </div>
          <aside className="hidden lg:block lg:col-span-3">
            <MovieActionsClient movieId={movie?.id} title={movie?.title || "Untitled"} poster={poster} scorePct={voteAvg} />
          </aside>
        </div>
      </div>
    </main>
  );
}
