import Header from "@/components/Header";
import { TmdbResponse } from "@/lib/tmdb";
import Image from "next/image";
import { headers } from "next/headers";
import Link from "next/link";
import ActorPrefsClient from "@/components/person/ActorPrefsClient";
import PersonPhotosClient from "@/components/person/PersonPhotosClient";
import PersonVideosClient from "@/components/person/PersonVideosClient";
import SocialEmbedsClient from "@/components/person/SocialEmbedsClient";

export const revalidate = 86400;

async function getJSON<T>(path: string, search?: Record<string, string | number | boolean>): Promise<T> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  const base = `${proto}://${host}`;
  const url = new URL(`/api/tmdb/${path}`, base);
  if (search) Object.entries(search).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), { next: { revalidate } });
  if (!res.ok) throw new Error(`TMDB request failed: ${res.status}`);
  return (await res.json()) as T;
}

function ActorMoviesGrid({ credits, type }: { credits: any; type: "upcoming" | "recent" | "hits" }) {
  const cast: any[] = Array.isArray(credits?.cast) ? credits.cast : [];
  const movies = cast.filter((c) => c.media_type === "movie");
  const now = Date.now();
  const days = (d?: string) => (d ? (new Date(d).getTime() - now) / (1000 * 60 * 60 * 24) : NaN);

  let list = movies.slice();
  if (type === "upcoming") {
    list = list.filter((m) => days(m.release_date) > 0).sort((a, b) => new Date(a.release_date || 0).getTime() - new Date(b.release_date || 0).getTime());
  } else if (type === "recent") {
    list = list
      .filter((m) => {
        const dd = days(m.release_date);
        return dd <= 0 && dd >= -90; // last 90 days
      })
      .sort((a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime());
  } else if (type === "hits") {
    list = list
      .filter((m) => Number(m.vote_average || 0) >= 7.5 && Number(m.vote_count || 0) >= 500)
      .sort((a, b) => Number(b.vote_count || 0) - Number(a.vote_count || 0));
  }

  list = list.slice(0, 12);

  if (list.length === 0) {
    return <div className="text-sm text-neutral-400">No titles to show.</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {list.map((m: any) => {
        const title = m.title || "Untitled";
        const poster = m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : undefined;
        const href = `/movie/${m.id}`;
        return (
          <a key={m.id} href={href} className="flex flex-col gap-2 group">
            <div className="relative w-full overflow-hidden rounded-xl bg-neutral-900 aspect-[2/3] ring-1 ring-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {poster ? <img src={poster} alt={title} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-xs text-neutral-500">No Image</div>}
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-snug line-clamp-1 text-neutral-100 group-hover:text-white">{title}</h3>
              {m.release_date && <p className="text-xs text-neutral-400 mt-0.5">{m.release_date}</p>}
            </div>
          </a>
        );
      })}
    </div>
  );
}

// Client components imported directly. Next.js will render them as client boundaries.

export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams?: Promise<{ t?: string, s?: string, sort?: string, dept?: string }> }) {
  const { id } = await params;
  const sp = (await (searchParams || Promise.resolve({}))) as { t?: string, s?: string, sort?: string, dept?: string };
  const t = (sp.t || "all").toLowerCase();
  const tab: "all" | "movies" | "tv" = t === "movies" ? "movies" : t === "tv" ? "tv" : "all";
  const section = (sp.s || "overview").toLowerCase();
  const sec: "overview" | "photos" | "videos" | "timeline" = section === "photos" ? "photos" : section === "videos" ? "videos" : section === "timeline" ? "timeline" : "overview";
  const sortKey = (sp.sort || "popularity").toLowerCase();
  const sortMode: "popularity" | "vote" | "recent" = sortKey === "vote" ? "vote" : sortKey === "recent" ? "recent" : "popularity";
  let person: any = null;
  let credits: any = null;
  let externals: any = null;
  let images: any = null;
  let videos: { key: string; name: string; site: string; type: string; id: string; from: { id: number; title: string; media_type: string; poster_path?: string | null; popularity?: number } }[] = [];
  let newTrailers: { key: string; name: string; id: string; from: { id: number; title: string; release_date?: string | null; poster_path?: string | null } }[] = [];
  try {
    person = await getJSON<any>(`person/${id}`);
    credits = await getJSON<any>(`person/${id}/combined_credits`);
    externals = await getJSON<any>(`person/${id}/external_ids`);
    images = await getJSON<any>(`person/${id}/images`);
    // Build videos list from top credits
    const cast: any[] = Array.isArray(credits?.cast) ? credits.cast : [];
    const crew: any[] = Array.isArray(credits?.crew) ? credits.crew : [];
    // Sort by popularity desc, then take top 6
    const top = cast
      .slice()
      .sort((a, b) => (Number(b.popularity || 0) - Number(a.popularity || 0)))
      .slice(0, 6);
    const videoFetches = top.map((c) => (
      c.media_type === "tv"
        ? getJSON<any>(`tv/${c.id}/videos`).then((v) => ({ v, c }))
        : getJSON<any>(`movie/${c.id}/videos`).then((v) => ({ v, c }))
    ));
    const settled = await Promise.allSettled(videoFetches);
    const vids: typeof videos = [];
    for (const s of settled) {
      if (s.status === "fulfilled") {
        const arr = Array.isArray(s.value?.v?.results) ? s.value.v.results : [];
        const good = arr.filter((x: any) =>
          x.site === "YouTube" && ["Trailer", "Teaser", "Featurette", "Interview", "Clip"].includes(x.type)
        );
        for (const g of good.slice(0, 2)) {
          vids.push({
            key: g.key,
            name: g.name,
            site: g.site,
            type: g.type,
            id: g.id,
            from: { id: s.value.c.id, title: s.value.c.title || s.value.c.name || "", media_type: s.value.c.media_type, poster_path: s.value.c.poster_path, popularity: s.value.c.popularity },
          });
        }
      }
    }
    // Viral videos approximation: sort by source popularity then by Trailer first
    videos = vids
      .slice()
      .sort((a, b) => (Number(b.from.popularity || 0) - Number(a.from.popularity || 0)) || (a.type === "Trailer" ? -1 : 1))
      .slice(0, 12);

    // Upcoming, recent, and hit movies
    const now = Date.now();
    const days = (d?: string) => (d ? (new Date(d).getTime() - now) / (1000 * 60 * 60 * 24) : NaN);
    const movies = cast.filter((c) => c.media_type === "movie");
    const upcomingMovies = movies
      .filter((m) => days(m.release_date) > 0)
      .slice()
      .sort((a, b) => new Date(a.release_date || 0).getTime() - new Date(b.release_date || 0).getTime())
      .slice(0, 12);
    const recentMovies = movies
      .filter((m) => {
        const dd = days(m.release_date);
        return dd <= 0 && dd >= -90; // last 90 days
      })
      .slice()
      .sort((a, b) => new Date(b.release_date || 0).getTime() - new Date(a.release_date || 0).getTime())
      .slice(0, 12);
    const hitMovies = movies
      .filter((m) => Number(m.vote_average || 0) >= 7.5 && Number(m.vote_count || 0) >= 500)
      .slice()
      .sort((a, b) => Number(b.vote_count || 0) - Number(a.vote_count || 0))
      .slice(0, 12);

    // New trailers from upcoming and recent movies
    const pool = [...upcomingMovies.slice(0, 6), ...recentMovies.slice(0, 6)];
    const trailerFetches = pool.map((m) => getJSON<any>(`movie/${m.id}/videos`).then((v) => ({ v, m })).catch(() => null));
    const trSet = await Promise.all(trailerFetches);
    const tlist: typeof newTrailers = [];
    for (const x of trSet) {
      if (!x) continue;
      const arr = Array.isArray(x.v?.results) ? x.v.results : [];
      const trailer = arr.find((vv: any) => vv.site === "YouTube" && vv.type === "Trailer" && (vv.official || true));
      if (trailer) {
        tlist.push({ key: trailer.key, name: trailer.name, id: trailer.id, from: { id: x.m.id, title: x.m.title || "", release_date: x.m.release_date, poster_path: x.m.poster_path } });
      }
    }
    newTrailers = tlist.slice(0, 12);
  } catch {}

  const profile = person?.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : undefined;
  let knownFor = Array.isArray(credits?.cast) ? credits.cast : [];
  if (tab === "movies") knownFor = knownFor.filter((k: any) => k.media_type === "movie");
  if (tab === "tv") knownFor = knownFor.filter((k: any) => k.media_type === "tv");
  // Sorting for Known For
  if (sortMode === "popularity") {
    knownFor = knownFor.slice().sort((a: any, b: any) => Number(b.popularity || 0) - Number(a.popularity || 0));
  } else if (sortMode === "vote") {
    knownFor = knownFor.slice().sort((a: any, b: any) => Number(b.vote_average || 0) - Number(a.vote_average || 0));
  } else if (sortMode === "recent") {
    const getDate = (x: any) => new Date(x.release_date || x.first_air_date || 0).getTime();
    knownFor = knownFor.slice().sort((a: any, b: any) => getDate(b) - getDate(a));
  }
  knownFor = knownFor.slice(0, 20);

  return (
    <main className="min-h-dvh">
      <Header />
      <div className="-mt-[56px] pt-[56px]" />
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <ActorPrefsClient personId={id} sort={sortMode} dept={(sp.dept || "all") as string} />
        {!person ? (
          <div className="rounded-xl border border-white/10 p-6 bg-white/5">Person not found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
            <div>
              <div className="relative w-[220px] h-[330px] overflow-hidden rounded-xl bg-neutral-900 ring-1 ring-white/10">
                {profile ? (
                  <Image src={profile} alt={person.name} fill className="object-cover" sizes="220px" />
                ) : null}
              </div>
              {externals?.twitter_id && (
                <div className="mt-3">
                  <SocialEmbedsClient twitterHandle={externals.twitter_id} instagramHandle={externals.instagram_id} />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">{person.name}</h1>
              {person.known_for_department && (
                <div className="text-sm text-neutral-400 mt-1">{person.known_for_department}</div>
              )}
              {/* External links */}
              <div className="mt-3 flex items-center gap-3 text-sm">
                {externals?.imdb_id && (
                  <a href={`https://www.imdb.com/name/${externals.imdb_id}/`} target="_blank" rel="noreferrer" className="text-neutral-300 hover:text-white underline">IMDb</a>
                )}
                <a href={`https://www.themoviedb.org/person/${id}`} target="_blank" rel="noreferrer" className="text-neutral-300 hover:text-white underline">TMDB</a>
                {externals?.instagram_id && (
                  <a href={`https://instagram.com/${externals.instagram_id}`} target="_blank" rel="noreferrer" className="text-neutral-300 hover:text-white underline">Instagram</a>
                )}
                {externals?.twitter_id && (
                  <a href={`https://twitter.com/${externals.twitter_id}`} target="_blank" rel="noreferrer" className="text-neutral-300 hover:text-white underline">Twitter</a>
                )}
                {externals?.facebook_id && (
                  <a href={`https://facebook.com/${externals.facebook_id}`} target="_blank" rel="noreferrer" className="text-neutral-300 hover:text-white underline">Facebook</a>
                )}
              </div>
              {/* Section tabs */}
              <div className="mt-5 flex items-center gap-2 text-sm">
                {([
                  { key: "overview", label: "Overview" },
                  { key: "photos", label: "Photos" },
                  { key: "videos", label: "Videos" },
                  { key: "timeline", label: "Timeline" },
                ] as const).map((x) => (
                  <Link key={x.key} href={{ pathname: `/person/${id}`, query: { t: tab, s: x.key } }} className={`px-3 py-1 rounded-md border ${sec === x.key ? "bg-white/20 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>{x.label}</Link>
                ))}
              </div>

              {/* Tabs for filmography */}
              <div className="mt-4 flex items-center gap-2 text-sm">
                {([
                  { key: "all", label: "All" },
                  { key: "movies", label: "Movies" },
                  { key: "tv", label: "TV" },
                ] as const).map((x) => (
                  <Link key={x.key} href={{ pathname: `/person/${id}`, query: { t: x.key, s: sec } }} className={`px-3 py-1 rounded-md border ${tab === x.key ? "bg-white/20 border-white/20" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>{x.label}</Link>
                ))}
              </div>

              {sec === "overview" && (
                <>
                  {person.biography && (
                    <p className="mt-4 text-sm text-neutral-200 whitespace-pre-line leading-relaxed max-w-prose">
                      {person.biography}
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <div className="text-neutral-400">Birthday</div>
                      <div className="text-neutral-200">{person.birthday || "–"}{person.deathday ? `  –  ${person.deathday}` : ""}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-neutral-400">Place of Birth</div>
                      <div className="text-neutral-200">{person.place_of_birth || "–"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-neutral-400">Also Known As</div>
                      <div className="text-neutral-200">{Array.isArray(person.also_known_as) && person.also_known_as.length ? person.also_known_as.join(", ") : "–"}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-neutral-400">Known Credits</div>
                      <div className="text-neutral-200">{Array.isArray(credits?.cast) ? credits.cast.length : 0}</div>
                    </div>
                  </div>

                  {/* Known For sort toggles */}
                  <div className="mt-4 flex items-center gap-2 text-xs">
                    {([
                      { k: "popularity", label: "Popularity" },
                      { k: "vote", label: "Vote Avg" },
                      { k: "recent", label: "Recent" },
                    ] as const).map((o) => (
                      <Link key={o.k} href={{ pathname: `/person/${id}`, query: { t: tab, s: sec, sort: o.k } }} className={`px-2 py-1 rounded-full border ${sortMode === o.k ? "bg-white/15 border-white/20 text-white" : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"}`}>{o.label}</Link>
                    ))}
                  </div>

                  {knownFor.length > 0 && (
                    <section className="mt-8">
                      <h2 className="text-lg font-semibold mb-3">Known For</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {knownFor.map((k: any) => {
                          const title = k.title || k.name || "Untitled";
                          const poster = k.poster_path ? `https://image.tmdb.org/t/p/w342${k.poster_path}` : undefined;
                          const href = k.media_type === "tv" ? `/tv/${k.id}` : `/movie/${k.id}`;
                          return (
                            <a key={`${k.media_type}-${k.id}`} href={href} className="flex flex-col gap-2 group">
                              <div className="relative w-full overflow-hidden rounded-xl bg-neutral-900 aspect-[2/3] ring-1 ring-white/5">
                                {poster ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={poster} alt={title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full grid place-items-center text-xs text-neutral-500">No Image</div>
                                )}
                              </div>
                              <div>
                                <h3 className="text-sm font-semibold leading-snug line-clamp-1 text-neutral-100 group-hover:text-white">{title}</h3>
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* Popular Photos preview */}
                  {Array.isArray(images?.profiles) && images.profiles.length > 0 && (
                    <section className="mt-10">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold">Popular Photos</h2>
                        <Link href={{ pathname: `/person/${id}`, query: { t: tab, s: "photos" } }} className="text-sm text-neutral-300 hover:text-white">See all</Link>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {images.profiles
                          .slice()
                          .sort((a: any, b: any) => Number(b.vote_count || 0) - Number(a.vote_count || 0))
                          .slice(0, 10)
                          .map((p: any, i: number) => (
                            <div key={i} className="relative w-full overflow-hidden rounded-xl bg-neutral-900 aspect-[2/3] ring-1 ring-white/5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`https://image.tmdb.org/t/p/w500${p.file_path}`} alt={`popular-${i}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                      </div>
                    </section>
                  )}

                  {/* Viral Videos preview (by source popularity) */}
                  {videos.length > 0 && (
                    <section className="mt-10">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold">Viral Videos</h2>
                        <Link href={{ pathname: `/person/${id}`, query: { t: tab, s: "videos" } }} className="text-sm text-neutral-300 hover:text-white">See all</Link>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {videos.slice(0, 6).map((v) => (
                          <a key={v.id} href={`https://www.youtube.com/watch?v=${v.key}`} target="_blank" rel="noreferrer" className="group block">
                            <div className="relative w-full overflow-hidden rounded-xl bg-neutral-900 aspect-video ring-1 ring-white/5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`https://img.youtube.com/vi/${v.key}/hqdefault.jpg`} alt={v.name} className="w-full h-full object-cover group-hover:opacity-90" />
                              <div className="absolute bottom-0 left-0 right-0 p-2 text-xs bg-gradient-to-t from-black/70 to-transparent">
                                <span className="text-neutral-100 line-clamp-2">{v.name}</span>
                                <div className="text-neutral-400 mt-1">{v.from.title}</div>
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Upcoming, New, Hits, New Trailers */}
                  {Array.isArray(credits?.cast) && (
                    <section className="mt-10 space-y-8">
                      {/* Upcoming Movies */}
                      <div>
                        <h2 className="text-lg font-semibold mb-3">Upcoming Movies</h2>
                        <ActorMoviesGrid credits={credits} type="upcoming" />
                      </div>
                      {/* New Movies */}
                      <div>
                        <h2 className="text-lg font-semibold mb-3">New Movies</h2>
                        <ActorMoviesGrid credits={credits} type="recent" />
                      </div>
                      {/* Hit Movies */}
                      <div>
                        <h2 className="text-lg font-semibold mb-3">Hit Movies</h2>
                        <ActorMoviesGrid credits={credits} type="hits" />
                      </div>
                      {/* New Trailers */}
                      {newTrailers.length > 0 && (
                        <div>
                          <h2 className="text-lg font-semibold mb-3">New Trailers</h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {newTrailers.slice(0, 9).map((tr) => (
                              <a key={tr.id} href={`https://www.youtube.com/watch?v=${tr.key}`} target="_blank" rel="noreferrer" className="group block">
                                <div className="relative w-full overflow-hidden rounded-xl bg-neutral-900 aspect-video ring-1 ring-white/5">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={`https://img.youtube.com/vi/${tr.key}/hqdefault.jpg`} alt={tr.name} className="w-full h-full object-cover group-hover:opacity-90" />
                                  <div className="absolute bottom-0 left-0 right-0 p-2 text-xs bg-gradient-to-t from-black/70 to-transparent">
                                    <span className="text-neutral-100 line-clamp-2">{tr.name}</span>
                                    <div className="text-neutral-400 mt-1">{tr.from.title} {tr.from.release_date ? `· ${tr.from.release_date}` : ""}</div>
                                  </div>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}

              {sec === "photos" && (
                <section className="mt-6">
                  <h2 className="text-lg font-semibold mb-3">Photos</h2>
                  {Array.isArray(images?.profiles) && images.profiles.length ? (
                    <PersonPhotosClient personId={id} />
                  ) : (
                    <div className="text-sm text-neutral-400">No photos available.</div>
                  )}
                </section>
              )}

              {sec === "timeline" && (
                <section className="mt-6">
                  <h2 className="text-lg font-semibold mb-3">Credits Timeline</h2>
                  {/* Department filters */}
                  <div className="mb-3 flex items-center gap-2 text-xs">
                    {([
                      { k: "all", label: "All" },
                      { k: "Acting", label: "Acting" },
                      { k: "Directing", label: "Directing" },
                      { k: "Writing", label: "Writing" },
                      { k: "Production", label: "Production" },
                      { k: "Crew", label: "Crew" },
                    ] as const).map((d) => (
                      <Link key={d.k} href={{ pathname: `/person/${id}`, query: { t: tab, s: sec, dept: d.k } }} className={`px-2 py-1 rounded-full border ${((sp.dept || "all") === d.k ? "bg-white/15 border-white/20 text-white" : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10")}`}>{d.label}</Link>
                    ))}
                  </div>
                  {(() => {
                    const cast: any[] = Array.isArray(credits?.cast) ? credits.cast : [];
                    const crew: any[] = Array.isArray(credits?.crew) ? credits.crew : [];
                    const deptSel = sp.dept || "all";
                    let entries: any[] = [];
                    if (deptSel === "all") {
                      entries = [...cast, ...crew];
                    } else if (deptSel === "Acting") {
                      entries = cast;
                    } else {
                      entries = crew.filter((c: any) => c.department === deptSel);
                    }
                    if (!entries.length) return <div className="text-sm text-neutral-400">No credits available.</div>;
                    return (
                      <div className="space-y-4">
                        {Object.entries(
                          entries.reduce((acc: Record<string, any[]>, c: any) => {
                            const year = (c.release_date || c.first_air_date || "").slice(0, 4) || "Unknown";
                            acc[year] = acc[year] || [];
                            acc[year].push(c);
                            return acc;
                          }, {})
                        )
                          .sort(([y1], [y2]) => y2.localeCompare(y1))
                          .map(([year, items]) => (
                            <div key={year}>
                              <div className="text-sm text-neutral-400 mb-2">{year}</div>
                              <ul className="space-y-2">
                                {(items as any[])
                                  .slice()
                                  .sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""))
                                  .map((c) => {
                                    const title = c.title || c.name || "Untitled";
                                    const href = c.media_type === "tv" ? `/tv/${c.id}` : `/movie/${c.id}`;
                                    const badge = c.character ? `as ${c.character}` : (c.job ? c.job : undefined);
                                    return (
                                      <li key={`${c.media_type}-${c.id}-${c.job || c.character || ""}`} className="flex items-center gap-2 text-sm">
                                        <a href={href} className="text-neutral-200 hover:text-white underline">{title}</a>
                                        {badge && (
                                          <span className="px-2 py-0.5 text-xs rounded-full bg-white/10 border border-white/10 text-neutral-300">{badge}</span>
                                        )}
                                        <span className="ml-auto text-xs text-neutral-500">{c.media_type}</span>
                                      </li>
                                    );
                                  })}
                              </ul>
                            </div>
                          ))}
                      </div>
                    );
                  })()}
                </section>
              )}

              {sec === "videos" && (
                <section className="mt-6">
                  <h2 className="text-lg font-semibold mb-3">Videos</h2>
                  {videos.length ? (
                    <PersonVideosClient personId={id} />
                  ) : (
                    <div className="text-sm text-neutral-400">No videos available.</div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
