"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { useRouter } from "next/navigation";

export type UserPick = {
  id: number | string;
  name: string;
  username?: string;
  avatar?: string;
  posters: string[]; // tmdb poster URLs
};

export default function UsersPicks({ users, inline = false }: { users?: UserPick[]; inline?: boolean }) {
  const [fireUsers, setFireUsers] = React.useState<UserPick[] | null>(null);
  const [idx, setIdx] = React.useState(0);
  const router = useRouter();

  // Optional Firestore load when users prop not provided
  React.useEffect(() => {
    if (users && users.length) return; // use provided
    (async () => {
      try {
        // Try users collection first
        const snapUsers = await getDocs(query(collection(db, "users"), limit(50)));
        const arrUsers: UserPick[] = [];
        snapUsers.forEach((d) => {
          const v: any = d.data();
          const posters = Array.isArray(v.posters)
            ? v.posters
            : Array.isArray(v.topPosters)
            ? v.topPosters
            : Array.isArray(v.picks)
            ? v.picks
            : [];
          const emailPart = typeof v.email === "string" ? v.email.split("@")[0] : undefined;
          arrUsers.push({
            id: d.id,
            name: v.displayName || v.name || v.email || "User",
            username: v.username || (emailPart ? `@${emailPart}` : undefined),
            avatar: v.photoURL || v.avatar || undefined,
            posters: posters.slice(0, 5),
          });
        });
        if (arrUsers.length) {
          setFireUsers(arrUsers);
          return;
        }

        // Fallback to creators collection (legacy)
        const snapCreators = await getDocs(query(collection(db, "creators"), limit(50)));
        const arrCreators: UserPick[] = [];
        snapCreators.forEach((d) => {
          const v: any = d.data();
          arrCreators.push({
            id: d.id,
            name: v.name || "Creator",
            username: v.username || undefined,
            avatar: v.avatar || undefined,
            posters: Array.isArray(v.posters) ? v.posters.slice(0, 5) : [],
          });
        });
        if (arrCreators.length) setFireUsers(arrCreators);
      } catch (e) {
        // ignore silently
      }
    })();
  }, [users]);

  // Auto-cycle the front poster index for animation
  React.useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % 5), 4000);
    return () => clearInterval(t);
  }, []);

  const data = (users && users.length ? users : fireUsers) || [];
  // Move signed-in user to top, if present
  const { user: authed } = (() => {
    try { return useFirebaseAuth(); } catch { return { user: null as any }; }
  })();

  const ordered = React.useMemo(() => {
    if (!authed || !data.length) return data;
    const meIndex = data.findIndex((u) => String(u.id) === String((authed as any).uid));
    if (meIndex === -1) return data;
    const arr = [...data];
    const me = arr.splice(meIndex, 1)[0];
    return [me, ...arr];
  }, [authed, data]);

  if (!ordered.length) return null;

  // Normalize poster input (support TMDB paths like "/abc.jpg" or full URLs)
  const toPosterUrl = (p: string | null, name: string) => {
    if (!p) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2a2a2a&color=ffffff`;
    if (p.startsWith("http")) return p;
    // treat as TMDB path
    return `https://image.tmdb.org/t/p/w342${p}`;
  };
  return (
    <div className={`${inline ? "block w-full" : "hidden lg:block absolute bottom-4 right-4 z-40 w-[360px]"} space-y-3`}>
      {ordered.slice(0, 8).map((u, i) => (
        <Link key={u.id} href={`/creator/${u.id}`} className="block group">
          <div className="relative rounded-2xl border border-white/15 bg-[linear-gradient(to_bottom_right,rgba(255,255,255,.06),rgba(255,255,255,.03))] backdrop-blur-md p-3 pr-6 overflow-hidden hover:border-white/25 transition-colors">
            <div className="flex items-center gap-0">
              {/* Left column: avatar, then name + username underneath */}
              <div className="w-[130px] shrink-0">
                <span className="inline-flex h-10 w-10 rounded-full overflow-hidden ring-1 ring-white/20 bg-white/10">
                  {/* Avatar with strong fallback to ui-avatars so it never appears empty */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <Image
                    src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=1f1f1f&color=ffffff`}
                    alt={u.name}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </span>
                <div className="mt-2 min-w-0">
                  <div className="text-sm font-semibold leading-tight truncate">{u.name}</div>
                  {u.username && (
                    <div className="text-xs text-neutral-300/80 truncate">{u.username}</div>
                  )}
                  {i === 0 && authed && String(u.id) === String((authed as any).uid) && (
                    <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-white/15 text-neutral-100 border border-white/10">You</span>
                  )}
                </div>
              </div>
              {/* Poster stack on the right */}
              <div className="relative h-24 w-[210px] shrink-0 -ml-1 pr-3">
                {(() => {
                  const posters = [...(u.posters || []).slice(0, 5)];
                  while (posters.length < 5) posters.push(null as any);
                  return posters;
                })().map((p, i) => {
                  const order = (i - idx + 5) % 5; // rotate
                  const offset = order * 24; // a touch wider
                  const scale = order === 0 ? 1.08 : 1.0;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => { e.preventDefault(); router.push(`/creator/${u.id}`); }}
                      className="absolute bottom-0 transform transition-all duration-500"
                      style={{ right: `${offset + 14}px`, zIndex: 10 - order, transform: `scale(${scale})` }}
                      aria-label={`Open ${u.name}'s profile`}
                    >
                      <Image
                        src={toPosterUrl(p, u.name)}
                        alt="poster"
                        width={order === 0 ? 64 : 56}
                        height={order === 0 ? 96 : 80}
                        className={`object-cover rounded-xl ring-1 ring-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:scale-105 transition-transform ${order === 0 ? 'h-24 w-16' : 'h-20 w-14'}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
