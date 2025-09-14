"use client";

import React from "react";
import { db } from "@/lib/firebase";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

type Props = {
  movieId: number;
  title: string;
  poster?: string;
  scorePct?: number; // 0-100 TMDB score percentage
};

export default function MovieActionsClient({ movieId, title, poster, scorePct = 0 }: Props) {
  const { user, loading, signInWithGoogle } = useFirebaseAuth();
  const [inWatchlist, setInWatchlist] = React.useState<boolean>(false);
  const [rating, setRating] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);

  const userId = user?.uid;

  React.useEffect(() => {
    let ignore = false;
    (async () => {
      if (!userId) return;
      try {
        const wlRef = doc(db, "users", userId, "watchlist", String(movieId));
        const wlSnap = await getDoc(wlRef);
        if (!ignore) setInWatchlist(wlSnap.exists());

        const rtRef = doc(db, "users", userId, "ratings", String(movieId));
        const rtSnap = await getDoc(rtRef);
        if (!ignore) setRating(rtSnap.exists() ? (rtSnap.data()?.rating ?? null) : null);
      } catch {
        // ignore fetch errors on mount
      }
    })();
    return () => { ignore = true; };
  }, [userId, movieId]);

  async function toggleWatchlist() {
    if (!userId) {
      await signInWithGoogle();
      return;
    }
    setBusy(true);
    try {
      const ref = doc(db, "users", userId, "watchlist", String(movieId));
      if (inWatchlist) {
        await deleteDoc(ref);
        setInWatchlist(false);
      } else {
        await setDoc(ref, { id: movieId, title, poster: poster || "", addedAt: Date.now() });
        setInWatchlist(true);
      }
    } finally {
      setBusy(false);
    }
  }

  async function updateRating(val: number) {
    if (!userId) {
      await signInWithGoogle();
      return;
    }
    setBusy(true);
    try {
      const ref = doc(db, "users", userId, "ratings", String(movieId));
      await setDoc(ref, { id: movieId, title, rating: val, updatedAt: Date.now() });
      setRating(val);
    } finally {
      setBusy(false);
    }
  }

  async function sharePage() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const data = { title: `${title} | Grouppy`, text: `Check out ${title} on Grouppy`, url };
    try {
      if (navigator.share) {
        await navigator.share(data);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard");
      }
    } catch {}
  }

  return (
    <aside className="sticky top-20 space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-neutral-400">Community Score</div>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="relative h-16 w-16 rounded-full grid place-items-center"
            style={{ background: `conic-gradient(#22c55e ${scorePct * 3.6}deg, rgba(255,255,255,0.08) 0)` }}
          >
            <div className="absolute inset-[5px] rounded-full bg-black grid place-items-center">
              <span className="text-base font-bold">{scorePct}<span className="text-[10px]">%</span></span>
            </div>
          </div>
          <div className="text-xs text-neutral-400">Audience meter based on community activity</div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <button
          onClick={toggleWatchlist}
          disabled={busy}
          className={`w-full px-3 py-2 rounded-md text-sm font-semibold ${inWatchlist ? "bg-white/10 border border-white/10" : "bg-white text-black"}`}
        >
          {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
        </button>
        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-300">Your rating</label>
          <select
            className="ml-auto bg-black border border-white/10 rounded px-2 py-1 text-xs"
            value={rating ?? ""}
            onChange={(e) => updateRating(Number(e.target.value))}
          >
            <option value="">—</option>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}/10</option>
            ))}
          </select>
        </div>
        <button onClick={sharePage} className="w-full px-3 py-2 rounded-md text-sm bg-white/10 border border-white/10 hover:bg-white/15">
          Share
        </button>
        {!user && !loading && (
          <button onClick={signInWithGoogle} className="w-full px-3 py-2 rounded-md text-sm bg-white/10 border border-white/10">
            Sign in to save
          </button>
        )}
      </div>
    </aside>
  );
}
