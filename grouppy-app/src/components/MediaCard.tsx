import React from "react";
import Image from "next/image";
import Link from "next/link";
import { img, TmdbItem } from "@/lib/tmdb";

function MediaCard({ item, compact = false }: { item: TmdbItem; compact?: boolean }) {
  const title = item.title || item.name || "Untitled";
  // For compact cards, use medium posters: smaller on mobile, larger on desktop
  const poster = img.poster(
    item.poster_path,
    compact ? "w342" : "w500"
  );
  const href = item.media_type === "tv" ? `/tv/${item.id}` : `/movie/${item.id}`;
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const subtitle = item.media_type === "tv" ? (year ? `Series • ${year}` : "Series") : (year ? `Movie • ${year}` : "New Movie");
  return (
    <Link href={href} className="flex flex-col gap-2 group">
      <div className={`relative w-full overflow-hidden rounded-xl bg-neutral-900 aspect-[2/3] shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${compact ? 'ring-1 ring-white/5' : ''}`}>
        {poster && (
          <Image
            src={poster}
            alt={title}
            fill
            sizes={compact ? "(max-width: 640px) 35vw, 200px" : "(max-width: 640px) 45vw, 260px"}
            className={`object-cover transition-transform duration-300 ${compact ? '' : 'group-hover:scale-[1.03]'}`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/30" />
        {(typeof item.vote_average === 'number' && typeof (item as any).vote_count === 'number') && (
          <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 flex items-center gap-2 bg-black/60 backdrop-blur-sm">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M12 2l2.9 6.26 6.9.54-5.2 4.54 1.6 6.66L12 17.77 5.8 20l1.6-6.66L2.2 8.8l6.9-.54L12 2z"/></svg>
              {Math.round((item.vote_average || 0) * 10) / 10}/10
            </span>
            <span className="text-[11px] text-neutral-300">{new Intl.NumberFormat('en', { notation: 'compact' }).format((item as any).vote_count)} votes</span>
          </div>
        )}
      </div>
      <div>
        <h3 className={`${compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} font-semibold leading-snug line-clamp-1 text-neutral-100 group-hover:text-white`}>{title}</h3>
        {!compact && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>
    </Link>
  );
}

export default MediaCard;
