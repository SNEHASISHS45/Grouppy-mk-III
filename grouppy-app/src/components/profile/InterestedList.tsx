"use client";

import React from "react";
import Link from "next/link";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { img } from "@/lib/tmdb";

export type WatchItem = {
  id: number;
  title: string;
  poster?: string;
  addedAt?: number;
};

export default function InterestedList() {
  const { user } = useFirebaseAuth();
  const [items, setItems] = React.useState<WatchItem[]>([]);

  React.useEffect(() => {
    if (!user) return;
    const qy = query(collection(db, "users", user.uid, "watchlist"), orderBy("addedAt", "desc"));
    const unsub = onSnapshot(qy, (snap) => {
      const list: WatchItem[] = [];
      snap.forEach((d) => list.push(d.data() as any));
      setItems(list);
    });
    return () => unsub();
  }, [user]);

  if (!user) return null;

  return (
    <aside className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Interested In</h3>
      </div>
      <div className="space-y-3">
        {items.slice(0, 8).map((m) => (
          <Link key={m.id} href={`/movie/${m.id}`} className="block group">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex gap-3 items-center hover:border-white/20 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {m.poster ? (
                <img src={m.poster.startsWith("http") ? m.poster : img.poster(m.poster, "w185")} alt={m.title} className="h-14 w-10 rounded object-cover" />
              ) : (
                <div className="h-14 w-10 rounded bg-white/10" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{m.title}</div>
                <div className="text-[11px] text-neutral-400">In Watchlist</div>
              </div>
            </div>
          </Link>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-400">
            Your watchlist is empty. Add some titles from movie pages.
          </div>
        )}
      </div>
    </aside>
  );
}
