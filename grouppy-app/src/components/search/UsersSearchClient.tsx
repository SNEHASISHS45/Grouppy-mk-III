"use client";

import React from "react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, startAt, endAt, type QueryDocumentSnapshot, type DocumentData } from "firebase/firestore";
import { rankCandidates } from "@/lib/fuzzy";

export default function UsersSearchClient({ q }: { q: string }) {
  const [loading, setLoading] = React.useState(false);
  const [users, setUsers] = React.useState<Array<any>>([]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!q.trim()) {
        setUsers([]);
        return;
      }
      setLoading(true);
      try {
        const qStr = q.trim();
        const creatorsCol = collection(db, "creators");

        const tasks: Promise<any>[] = [];
        // Search by name prefix
        try {
          const byNameQ = query(
            creatorsCol,
            orderBy("name"),
            startAt(qStr),
            endAt(qStr + "\uf8ff"),
            limit(10)
          );
          tasks.push(getDocs(byNameQ));
        } catch {}
        // Search by username prefix
        try {
          const byUserQ = query(
            creatorsCol,
            orderBy("username"),
            startAt(qStr),
            endAt(qStr + "\uf8ff"),
            limit(10)
          );
          tasks.push(getDocs(byUserQ));
        } catch {}

        const snaps = await Promise.all(tasks);
        const list: any[] = [];
        const seen = new Set<string>();
        for (const snap of snaps) {
          snap.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
            if (!seen.has(doc.id)) {
              seen.add(doc.id);
              list.push({ id: doc.id, ...doc.data() });
            }
          });
        }
        // Fuzzy-rank by name/username to handle typos
        const ranked = rankCandidates(qStr, list, [
          (u) => (u?.name as string | undefined) || "",
          (u) => (u?.username as string | undefined) || "",
        ]).filter(r => r.score > 0.3) // basic cutoff
          .map(r => r.item)
          .slice(0, 20);
        if (!cancelled) setUsers(ranked);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [q]);

  if (!q.trim()) {
    return <div className="text-neutral-400 text-sm">Type a name or username to search users.</div>;
  }

  if (loading) {
    return <div className="text-neutral-400 text-sm">Searching users…</div>;
  }

  if (users.length === 0) {
    return <div className="text-neutral-400 text-sm">No users found.</div>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {users.map((u) => (
        <Link key={u.id} href={`/creator/${u.id}`} className="flex flex-col gap-2 group">
          <div className="relative w-full overflow-hidden rounded-full bg-neutral-900 aspect-square ring-1 ring-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {u.avatar ? (
              <img src={u.avatar} alt={u.name || u.username || "User"} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-xs text-neutral-500">No Avatar</div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold leading-snug line-clamp-1 text-neutral-100 group-hover:text-white">{u.name || "User"}</h3>
            {u.username && <p className="text-xs text-neutral-400 mt-0.5">@{u.username}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
