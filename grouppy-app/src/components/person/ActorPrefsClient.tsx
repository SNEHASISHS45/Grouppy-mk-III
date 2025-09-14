"use client";

import React from "react";

export default function ActorPrefsClient({ personId, sort, dept }: { personId: string; sort: "popularity" | "vote" | "recent"; dept: string }) {
  React.useEffect(() => {
    try {
      const key = `actorPrefs:${personId}`;
      const existing = JSON.parse(localStorage.getItem(key) || "{}");
      const next = { ...existing, sort, dept };
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  }, [personId, sort, dept]);
  return null;
}
