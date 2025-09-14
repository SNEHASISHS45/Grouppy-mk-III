import React from "react";
import { TmdbItem } from "@/lib/tmdb";
import MediaCard from "@/components/MediaCard";

export default function MediaGrid({
  items,
  limit = 10,
  compact = false,
}: {
  items: TmdbItem[];
  limit?: number;
  compact?: boolean;
}) {
  const data = typeof limit === "number" ? items.slice(0, limit) : items;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {data.map((item, idx) => (
        <div key={`${item.media_type}-${item.id}`} className={idx >= 5 ? "hidden sm:block" : undefined}>
          <MediaCard item={item} compact={compact} />
        </div>
      ))}
    </div>
  );
}
