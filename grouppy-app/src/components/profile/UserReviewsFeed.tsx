"use client";

import React from "react";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { db } from "@/lib/firebase";
import { collectionGroup, onSnapshot, orderBy, query, where, collection } from "firebase/firestore";
import CollectionsGrid from "@/components/profile/CollectionsGrid";

export type Verdict = "skip" | "timepass" | "go" | "perfect";

export type ReviewItem = {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  createdAt?: any;
  likesCount?: number;
  commentsCount?: number;
  verdict?: Verdict | null;
};

function timeAgo(ts: Date | number | undefined) {
  if (!ts) return "just now";
  const d = typeof ts === "number" ? new Date(ts) : ts;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function UserReviewsFeed() {
  const { user } = useFirebaseAuth();
  const [items, setItems] = React.useState<ReviewItem[]>([]);
  const [activeTab, setActiveTab] = React.useState<"reviews" | "posts" | "collections">("reviews");
  const [verdictFilter, setVerdictFilter] = React.useState<null | Verdict>(null);
  const [view, setView] = React.useState<"list" | "grid">("list");

  React.useEffect(() => {
    if (!user) return;
    let unsub: undefined | (() => void);
    // Try root 'reviews' collection first
    try {
      const qRoot = query(collection(db, "reviews"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
      unsub = onSnapshot(qRoot, (snap) => {
        const list: ReviewItem[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setItems(list);
      }, () => {
        // Fallback to collectionGroup on error
        try {
          const qCg = query(collectionGroup(db, "reviews"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
          unsub = onSnapshot(qCg, (snap2) => {
            const list: ReviewItem[] = [];
            snap2.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
            setItems(list);
          });
        } catch {}
      });
    } catch {
      // If root fails synchronously, fallback to collectionGroup
      try {
        const qCg = query(collectionGroup(db, "reviews"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
        unsub = onSnapshot(qCg, (snap2) => {
          const list: ReviewItem[] = [];
          snap2.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
          setItems(list);
        });
      } catch {}
    }
    return () => { if (unsub) unsub(); };
  }, [user]);

  const filtered = React.useMemo(() => {
    return verdictFilter ? items.filter((i) => (i.verdict || "timepass") === verdictFilter) : items;
  }, [items, verdictFilter]);

  const verdictChips: { key: Verdict | null; label: string }[] = [
    { key: null, label: "All" },
    { key: "skip", label: "Skip" },
    { key: "timepass", label: "Timepass" },
    { key: "go", label: "Go For It" },
    { key: "perfect", label: "Perfection" },
  ];

  return (
    <section>
      {/* Top tabs + view toggle */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-2 flex items-center gap-1 text-sm">
        {(["reviews", "posts", "collections"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 py-1.5 rounded-md ${activeTab === t ? "bg-white text-black font-semibold" : "text-neutral-300"}`}
          >
            {t === "reviews" ? "Reviews" : t === "posts" ? "Posts" : "Collections"}
          </button>
        ))}
        <div className="ml-auto inline-flex items-center overflow-hidden rounded-md border border-white/10">
          <button
            onClick={() => setView("list")}
            className={`px-2 py-1 ${view === "list" ? "bg-white text-black" : "text-neutral-300"}`}
            aria-label="List view"
            title="List view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="4" y="6" width="16" height="2" rx="1" />
              <rect x="4" y="11" width="16" height="2" rx="1" />
              <rect x="4" y="16" width="16" height="2" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setView("grid")}
            className={`px-2 py-1 ${view === "grid" ? "bg-white text-black" : "text-neutral-300"}`}
            aria-label="Grid view"
            title="Grid view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="5" y="5" width="6" height="6" rx="1" />
              <rect x="13" y="5" width="6" height="6" rx="1" />
              <rect x="5" y="13" width="6" height="6" rx="1" />
              <rect x="13" y="13" width="6" height="6" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {activeTab === "reviews" && (
        <div className="mt-4">
          {/* Verdict chips */}
          <div className="flex items-center gap-2 mb-3">
            {verdictChips.map((v) => (
              <button
                key={String(v.key)}
                onClick={() => setVerdictFilter(v.key)}
                className={`text-xs px-3 py-1 rounded-full border ${verdictFilter === v.key ? "bg-white text-black border-white" : "border-white/10 text-neutral-300"}`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Reviews list/grid */}
          <ul className={`${view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}`}>
            {filtered.map((r) => {
              const created = (r as any).createdAt?.toDate ? (r as any).createdAt.toDate() as Date : undefined;
              const verdictLabel: Record<Verdict, string> = { skip: "Skip", timepass: "Timepass", go: "Go For It", perfect: "Perfection" };
              const badgeColor: Record<Verdict, string> = { skip: "bg-neutral-600", timepass: "bg-yellow-400 text-black", go: "bg-emerald-500", perfect: "bg-indigo-500" };
              const vKey = (r.verdict || "timepass") as Verdict;
              return (
                <li key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start gap-3">
                    {r.userPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.userPhoto} alt={r.userName} className="h-10 w-10 rounded-full" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-white/10" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold">{r.userName}</div>
                        <div className="text-xs text-neutral-400">• {timeAgo(created)}</div>
                        <div className={`ml-auto text-xs px-3 py-1 rounded-full ${badgeColor[vKey]}`}>{verdictLabel[vKey]}</div>
                      </div>
                      <div className="mt-2 text-sm text-neutral-200 whitespace-pre-wrap">{r.content}</div>
                    </div>
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-neutral-400">No reviews yet.</li>
            )}
          </ul>
        </div>
      )}

      {activeTab === "collections" && (
        <div className="mt-4">
          <CollectionsGrid />
        </div>
      )}

      {activeTab === "posts" && (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-neutral-400">
          Posts coming soon.
        </div>
      )}
    </section>
  );
}
