"use client";

import Image from "next/image";
import React from "react";
import { img, TmdbItem, genreNames } from "@/lib/tmdb";
import Link from "next/link";
import UsersPicks, { UserPick } from "@/components/UsersPicks";

export default function HeroSlider({ items, className, usersPicks }: { items: TmdbItem[]; className?: string; usersPicks?: UserPick[] }) {
  const [index, setIndex] = React.useState(0);
  const timer = React.useRef<NodeJS.Timeout | null>(null);

  const next = React.useCallback(() => {
    setIndex((i) => (i + 1) % Math.max(items.length, 1));
  }, [items.length]);

  React.useEffect(() => {
    if (items.length === 0) return;
    timer.current && clearInterval(timer.current);
    timer.current = setInterval(next, 4000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [items.length, next]);

  // Touch swipe
  const startX = React.useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const end = e.changedTouches[0].clientX;
    if (startX.current === null) return;
    const delta = end - startX.current;
    if (Math.abs(delta) > 40) {
      setIndex((i) => (delta > 0 ? (i - 1 + items.length) % items.length : (i + 1) % items.length));
    }
    startX.current = null;
  };

  return (
    <section className={"relative w-full overflow-hidden " + (className || "") }>
      <div className="relative h-[90vh] sm:h-[92vh] lg:h-[95vh] rounded-none overflow-hidden">
        {items.map((it, i) => {
          const active = i === index;
          const src = img.backdrop(it.backdrop_path || it.poster_path, "w1280");
          const title = it.title || it.name || "";
          const genres = (it.genre_ids || []).slice(0, 3).map((g) => genreNames[g]).filter(Boolean);
          const rating = it.vote_average ? Math.round(it.vote_average * 10) / 10 : null;
          return (
            <div
              key={it.id}
              className={`absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100" : "opacity-0"}`}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {src && (
                <Image src={src} alt={title} fill priority={active} className="object-cover" sizes="100vw" />
              )}
              {/* Keep a very light gradient at the very top only for status bar/controls */}
              <div className="absolute inset-x-0 top-0 h-24" />
              <div className="absolute inset-0 flex items-end">
                <div className="p-4 pb-8 sm:p-8 sm:pb-10 lg:px-10 lg:pb-12 flex items-end gap-4 sm:gap-6">
                  {/* Poster on the left */}
                  {it.poster_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.poster(it.poster_path, "w342")!}
                      alt={title}
                      className="h-40 sm:h-48 md:h-56 lg:h-64 w-auto rounded-xl ring-1 ring-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                    />
                  )}
                  {/* Info on the right of poster */}
                  {/* Text block without background/blur */}
                  <div className="max-w-[760px] p-0 sm:p-0">
                    <div className="text-xs sm:text-sm text-neutral-300/90">
                      {(it.media_type || "movie").toString().toUpperCase()} • {(it.release_date || it.first_air_date || "").slice(0,4)} • {it.original_language?.toUpperCase?.() || ""}
                    </div>
                    <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight drop-shadow mt-1">
                      {title}
                    </h2>
                    <p className="mt-2 text-sm sm:text-base text-neutral-200 line-clamp-3 max-w-prose">
                      {it.overview}
                    </p>
                    {genres.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {genres.map((g) => (
                          <span key={g} className="px-2 py-1 rounded-full text-xs bg-white/20 text-neutral-900 dark:text-neutral-100 border border-white/20">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Bottom-right overlay: either UsersPicks (if provided) or thumbnail strip fallback */}
      {usersPicks && usersPicks.length > 0 ? (
        <UsersPicks users={usersPicks} />
      ) : (
        items.length > 0 && (
          <div className="absolute bottom-3 right-4 z-30 hidden sm:flex gap-3 justify-end">
            {items.slice(0, 6).map((it, i) => {
              const src = img.poster(it.poster_path, "w154");
              const active = i === index;
              return (
                <button
                  key={it.id}
                  onClick={() => setIndex(i)}
                  className={`relative overflow-hidden rounded-xl ring-1 transition-transform duration-300 ease-out ${
                    active ? "ring-white scale-110 h-20 w-14" : "ring-white/20 opacity-90 h-16 w-12 hover:scale-105"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                >
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="thumb" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                </button>
              );
            })}
          </div>
        )
      )}
    </section>
  );
}
