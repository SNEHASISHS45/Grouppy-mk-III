"use client";

import { useEffect } from "react";
import { pushRecent } from "@/components/search/RecentSearchesClient";

export default function SearchQueryRecorder({ q, tab }: { q?: string; tab?: "movies" | "tv" | "people" | "users" }) {
  useEffect(() => {
    if (q && q.trim()) {
      pushRecent({ q: q.trim(), tab: (tab || "movies") as any });
    }
  }, [q, tab]);
  return null;
}
