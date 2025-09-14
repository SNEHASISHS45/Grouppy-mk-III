import React from "react";
import MediaCard from "@/components/MediaCard";
import { TmdbItem } from "@/lib/tmdb";

export default function SectionRow({
  title,
  items,
  badge,
}: {
  title: string;
  items: TmdbItem[];
  badge?: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          {title}
          {badge && <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-neutral-300">{badge}</span>}
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory -mx-4 px-4">
        {items.map((item) => (
          <div key={`${item.media_type}-${item.id}`} className="shrink-0 snap-start w-[42vw] sm:w-[180px]">
            <MediaCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
