export type MediaType = "movie" | "tv" | "person" | "all";

export type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  media_type?: MediaType;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  original_language?: string;
};

export type TmdbResponse<T = TmdbItem> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

export const img = {
  poster: (path?: string | null, size: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original" = "w500") =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined,
  backdrop: (path?: string | null, size: "w300" | "w780" | "w1280" | "original" = "w780") =>
    path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined,
};

export async function tmdbFetch<T = any>(path: string, search?: Record<string, string | number | boolean>) {
  const url = new URL(`/api/tmdb/${path}`.replace(/\/$/, ""), typeof window === "undefined" ? "http://localhost" : window.location.origin);
  if (search) {
    Object.entries(search).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`TMDB fetch failed: ${res.status}`);
  return (await res.json()) as T;
}

// Minimal genre lookup for chips
export const genreNames: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action",
  10765: "Sci-Fi",
};
