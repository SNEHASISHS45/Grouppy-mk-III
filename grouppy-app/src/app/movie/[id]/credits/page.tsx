import Header from "@/components/Header";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";

export const revalidate = 86400;

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

export default async function MovieCreditsPage({ params }: { params: { id: string } }) {
  let movie: any = null;
  let credits: any = null;
  try {
    [movie, credits] = await Promise.all([
      getJSON(`movie/${params.id}`, { language: "en-US" }),
      getJSON(`movie/${params.id}/credits`),
    ]);
  } catch (e) {
    // ignore, show minimal
  }

  const cast = Array.isArray(credits?.cast) ? credits.cast : [];
  // Group crew by department
  const crewByDept: Record<string, any[]> = {};
  (Array.isArray(credits?.crew) ? credits.crew : []).forEach((c: any) => {
    const key = c.department || "Other";
    (crewByDept[key] ||= []).push(c);
  });

  return (
    <main className="min-h-dvh">
      <Header />
      <div className="max-w-screen-xl mx-auto px-4 pb-16">
        <div className="mt-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Full Credits</h1>
          <Link href={`/movie/${params.id}`} className="text-sm text-neutral-300 hover:text-white">← Back to Movie</Link>
        </div>

        {/* Cast */}
        <section className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-lg font-semibold mb-2">Cast</h2>
          <div className="border-t border-white/10 -mx-4 mb-4" />
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {cast.map((p: any) => (
              <li key={p.id} className="text-center">
                <Link href={`/person/${p.id}`} className="inline-block">
                  {p.profile_path ? (
                    <Image src={`https://image.tmdb.org/t/p/w185${p.profile_path}`} alt={p.name} width={120} height={120} className="rounded-full mx-auto object-cover" />
                  ) : (
                    <div className="h-28 w-28 rounded-full mx-auto grid place-items-center" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), rgba(255,255,255,0.02))' }}>
                      <span className="text-xl font-semibold">{String(p.name || '?').trim().charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="text-sm font-semibold mt-2 leading-tight flex items-center justify-center gap-1">
                    {p.name}
                    {p.popularity > 15 && <span title="Verified" className="text-emerald-400">✓</span>}
                  </div>
                  <div className="text-xs text-neutral-400 leading-tight">{p.character || p.known_for_department || 'Actor'}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Crew by department */}
        {Object.entries(crewByDept).map(([dept, list]) => (
          <section key={dept} className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-lg font-semibold mb-2">{dept}</h2>
            <div className="border-t border-white/10 -mx-4 mb-4" />
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {list.map((c: any) => (
                <li key={`${c.id}-${c.credit_id}`} className="flex items-center gap-3">
                  <Link href={`/person/${c.id}`} className="flex items-center gap-3">
                    {c.profile_path ? (
                      <Image src={`https://image.tmdb.org/t/p/w185${c.profile_path}`} alt={c.name} width={56} height={56} className="rounded-full object-cover" />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-white/10 grid place-items-center">
                        <span className="text-sm font-semibold">{String(c.name || '?').trim().charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold leading-tight">{c.name}</div>
                      <div className="text-xs text-neutral-400 leading-tight">{c.job || c.department}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
