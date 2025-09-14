"use client";

import React from "react";
import Link from "next/link";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

export type SimpleUser = {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  username?: string;
  followedAt?: number;
};

export default function FollowList({ kind }: { kind: "followers" | "following" }) {
  const { user } = useFirebaseAuth();
  const [list, setList] = React.useState<SimpleUser[]>([]);

  React.useEffect(() => {
    if (!user) return;
    const qy = query(collection(db, "users", user.uid, kind), orderBy("followedAt", "desc"));
    const unsub = onSnapshot(qy, (snap) => {
      const arr: SimpleUser[] = [];
      snap.forEach((d) => arr.push({ uid: d.id, ...(d.data() as any) }));
      setList(arr);
    });
    return () => unsub();
  }, [user, kind]);

  if (!user) return null;

  return (
    <div className="space-y-3">
      {list.map((u) => {
        const handle = u.username || (u.email ? `@${u.email.split("@")[0]}` : "@user");
        return (
          <Link key={u.uid} href={`/creator/${u.uid}`} className="block group">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-3 hover:border-white/20 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {u.photoURL ? (
                <img src={u.photoURL} alt={u.displayName || handle} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-white/10" />
              )}
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{u.displayName || u.email || "User"}</div>
                <div className="text-[11px] text-neutral-400 truncate">{handle}</div>
              </div>
            </div>
          </Link>
        );
      })}
      {list.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-neutral-400">No {kind} yet.</div>
      )}
    </div>
  );
}
