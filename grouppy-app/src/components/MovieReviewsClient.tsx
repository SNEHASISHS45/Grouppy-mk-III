"use client";

import React from "react";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";

type Verdict = "skip" | "timepass" | "go" | "perfect";

export type Review = {
  id?: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating?: number | null;
  verdict?: Verdict;
  spoiler?: boolean;
  likesCount?: number;
  commentsCount?: number;
  content: string;
  createdAt: any;
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

export default function MovieReviewsClient({ movieId }: { movieId: number }) {
  const { user, signInWithGoogle } = useFirebaseAuth();
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [content, setContent] = React.useState("");
  const [rating, setRating] = React.useState<number | "">("");
  const [verdict, setVerdict] = React.useState<Verdict | null>("timepass");
  const [spoiler, setSpoiler] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  // Filters
  const [sort, setSort] = React.useState<"latest" | "liked">("latest");
  const [showSpoilers, setShowSpoilers] = React.useState(false);
  const [followingOnly, setFollowingOnly] = React.useState(false);

  React.useEffect(() => {
    const col = collection(db, "movies", String(movieId), "reviews");
    const qy = query(col, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qy, (snap) => {
      const next: Review[] = [];
      snap.forEach((docSnap) => next.push({ id: docSnap.id, ...(docSnap.data() as any) }));
      setReviews(next);
    });
    return () => unsub();
  }, [movieId]);

  const sortedFiltered = React.useMemo(() => {
    let list = reviews.slice();
    if (!showSpoilers) list = list.filter((r) => !r.spoiler);
    // followingOnly placeholder: without a graph, keep all
    if (sort === "liked") list.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    return list;
  }, [reviews, showSpoilers, sort]);

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      await signInWithGoogle();
      return;
    }
    const text = content.trim();
    if (!text) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "movies", String(movieId), "reviews"), {
        userId: user.uid,
        userName: user.displayName || user.email || "User",
        userPhoto: user.photoURL || "",
        rating: rating === "" ? null : Number(rating),
        verdict: verdict || null,
        spoiler,
        likesCount: 0,
        commentsCount: 0,
        content: text.slice(0, 1000),
        createdAt: serverTimestamp(),
      });
      setContent("");
      setRating("");
      setVerdict("timepass");
      setSpoiler(false);
    } finally {
      setBusy(false);
    }
  }

  async function deleteOwnReview(id?: string) {
    if (!id || !user) return;
    setBusy(true);
    try {
      await deleteDoc(doc(db, "movies", String(movieId), "reviews", id));
    } finally {
      setBusy(false);
    }
  }

  async function toggleLike(reviewId: string) {
    if (!user) { await signInWithGoogle(); return; }
    const likeRef = doc(db, "movies", String(movieId), "reviews", reviewId, "likes", user.uid);
    const revRef = doc(db, "movies", String(movieId), "reviews", reviewId);
    const existing = await getDoc(likeRef);
    if (existing.exists()) {
      await deleteDoc(likeRef);
      await updateDoc(revRef, { likesCount: increment(-1) });
    } else {
      await setDoc(likeRef, { userId: user.uid, at: Date.now() });
      await updateDoc(revRef, { likesCount: increment(1) });
    }
  }

  const verdictItems: { key: Verdict; label: string }[] = [
    { key: "skip", label: "Skip" },
    { key: "timepass", label: "Timepass" },
    { key: "go", label: "Go for it" },
    { key: "perfect", label: "Perfection" },
  ];

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="inline-flex items-center text-xs bg-white/5 border border-white/10 rounded-full overflow-hidden">
          <button onClick={() => setSort("liked")} className={`px-3 py-1 ${sort === "liked" ? "bg-white/10" : ""}`}>Most Liked</button>
          <button onClick={() => setSort("latest")} className={`px-3 py-1 ${sort === "latest" ? "bg-white/10" : ""}`}>Latest</button>
        </div>
        <button onClick={() => setShowSpoilers((s) => !s)} className={`text-xs px-3 py-1 rounded-full border ${showSpoilers ? "border-purple-400 text-purple-300" : "border-white/10 text-neutral-300"}`}>Show Spoilers</button>
        <button onClick={() => setFollowingOnly((s) => !s)} className={`text-xs px-3 py-1 rounded-full border ${followingOnly ? "border-purple-400 text-purple-300" : "border-white/10 text-neutral-300"}`}>Following Only</button>
      </div>

      {/* Composer */}
      <form onSubmit={submitReview} className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt={user.displayName || "User"} className="h-10 w-10 rounded-full" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-white/10" />)
          }
          <div>
            <div className="text-sm font-semibold">{user?.displayName || user?.email || "Guest"}</div>
            {user?.email && <div className="text-[11px] text-neutral-400">@{(user.email.split("@")[0] || "user").toUpperCase()}</div>}
          </div>
          <div className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 px-2 py-1">
            {verdictItems.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setVerdict(v.key)}
                className={`text-xs px-3 py-1 rounded-full ${verdict === v.key ? "bg-yellow-400 text-black font-semibold" : "text-neutral-300"}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 relative">
          <textarea
            className="w-full bg-black border-0 border-b border-white/10 focus:outline-none focus:ring-0 rounded-none p-0 pb-8 text-sm placeholder-neutral-500"
            placeholder="Write your review here..."
            maxLength={1000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="absolute bottom-1 right-0 text-[11px] text-neutral-500">{content.length}/1000</div>
        </div>

        <div className="mt-3 flex items-center gap-3 justify-end">
          <label className="text-xs text-neutral-300 flex items-center gap-2 select-none">
            <input type="checkbox" className="accent-purple-400" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
            Contains spoilers
          </label>
          {!user && (
            <button type="button" onClick={signInWithGoogle} className="px-4 py-2 rounded-full text-sm bg-white/10 border border-white/10">Sign in</button>
          )}
          <button type="submit" disabled={busy || !content.trim()} className="px-5 py-2 rounded-full text-sm bg-white text-black font-semibold disabled:opacity-50">Post</button>
        </div>
      </form>

      {/* Reviews list */}
      <ul className="mt-6 space-y-6">
        {sortedFiltered.map((r) => {
          const created = (r as any).createdAt?.toDate ? (r as any).createdAt.toDate() as Date : undefined;
          const isMine = user?.uid === r.userId;
          const badgeMap: Record<Verdict, string> = { skip: "Skip", timepass: "Timepass", go: "Go For It", perfect: "Perfection" };
          const badgeColor: Record<Verdict, string> = { skip: "bg-neutral-600", timepass: "bg-yellow-400 text-black", go: "bg-emerald-500", perfect: "bg-indigo-500" };
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
                    <div className={`ml-auto text-xs px-3 py-1 rounded-full ${badgeColor[(r.verdict || "timepass") as Verdict]}`}>{badgeMap[(r.verdict || "timepass") as Verdict]}</div>
                  </div>
                  <div className="mt-2 text-sm text-neutral-200 whitespace-pre-wrap">
                    {r.spoiler && !showSpoilers ? (
                      <span className="italic text-neutral-400">Spoiler hidden. Enable "Show Spoilers" to view.</span>
                    ) : (
                      r.content
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-6 text-sm text-neutral-400">
                    <button onClick={() => r.id && toggleLike(r.id)} className="flex items-center gap-2 hover:text-white">
                      <span>❤</span>
                      <span>{r.likesCount || 0}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <span>💬</span>
                      <span>{r.commentsCount || 0}</span>
                    </div>
                    {isMine && (
                      <button onClick={() => deleteOwnReview(r.id)} className="ml-auto text-xs text-red-300 hover:text-red-200">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
