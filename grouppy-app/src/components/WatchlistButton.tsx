"use client";

import React from "react";
import { db } from "@/lib/firebase";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

export default function WatchlistButton({ movieId, title, poster, className = "" }: { movieId: number; title: string; poster?: string; className?: string }) {
  const { user, signInWithGoogle } = useFirebaseAuth();
  const [inWatchlist, setInWatchlist] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let ignore = false;
    (async () => {
      if (!user?.uid) return;
      try {
        const ref = doc(db, "users", user.uid, "watchlist", String(movieId));
        const snap = await getDoc(ref);
        if (!ignore) setInWatchlist(snap.exists());
      } catch {}
    })();
    return () => { ignore = true; };
  }, [user?.uid, movieId]);

  async function toggle() {
    if (!user?.uid) {
      await signInWithGoogle();
      return;
    }
    setBusy(true);
    try {
      const ref = doc(db, "users", user.uid, "watchlist", String(movieId));
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

  return (
    <button onClick={toggle} disabled={busy} className={className}>
      {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
    </button>
  );
}
