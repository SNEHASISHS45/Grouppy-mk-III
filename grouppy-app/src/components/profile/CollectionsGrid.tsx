"use client";

import React from "react";
import Link from "next/link";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query, where, getDocs } from "firebase/firestore";
import { img } from "@/lib/tmdb";

type Collection = {
  id: string;
  title: string;
  cover?: string | null; // tmdb poster path or full url
  itemsCount?: number;
  updatedAt?: number;
};

function toPoster(p?: string | null) {
  if (!p) return undefined;
  return p.startsWith("http") ? p : img.poster(p, "w342");
}

export default function CollectionsGrid() {
  const { user } = useFirebaseAuth();
  const [cols, setCols] = React.useState<Collection[]>([]);

  React.useEffect(() => {
    if (!user) return;
    // Prefer root 'collections' where userId == current user
    let unsub: undefined | (() => void);
    (async () => {
      try {
        const qRoot = query(collection(db, "collections"), where("userId", "==", user.uid), orderBy("updatedAt", "desc"));
        // One-time fetch to decide if root exists; then attach realtime listener to root or fallback
        const snapRoot = await getDocs(qRoot);
        if (!snapRoot.empty) {
          unsub = onSnapshot(qRoot, (snap) => {
            const list: Collection[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
            setCols(list);
          });
        } else {
          const qUser = query(collection(db, "users", user.uid, "collections"), orderBy("updatedAt", "desc"));
          unsub = onSnapshot(qUser, (snap) => {
            const list: Collection[] = [];
            snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
            setCols(list);
          });
        }
      } catch {
        // Silent fallback to users/{uid}/collections if root fails
        const qUser = query(collection(db, "users", user.uid, "collections"), orderBy("updatedAt", "desc"));
        unsub = onSnapshot(qUser, (snap) => {
          const list: Collection[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
          setCols(list);
        });
      }
    })();
    return () => { if (unsub) unsub(); };
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Collections</h3>
        <Link href="/collections/new" className="text-xs px-3 py-1 rounded-md bg-white text-black font-semibold" title="Create Collection">+ Create</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cols.map((c) => (
          <Link key={c.id} href={`/collections/${c.id}`} className="block group">
            <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {toPoster(c.cover) ? (
                <img src={toPoster(c.cover)} alt={c.title} className="w-full aspect-[2/3] object-cover group-hover:opacity-90 transition-opacity" />
              ) : (
                <div className="w-full aspect-[2/3] bg-white/5" />
              )}
              <div className="p-3">
                <div className="text-sm font-semibold truncate">{c.title}</div>
                <div className="text-[11px] text-neutral-400">{c.itemsCount || 0} items</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {cols.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-neutral-400 mt-2">No collections yet.</div>
      )}
    </div>
  );
}

