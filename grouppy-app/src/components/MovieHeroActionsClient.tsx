"use client";

import React from "react";
import { db } from "@/lib/firebase";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

export default function MovieHeroActionsClient({ movieId, title, poster }: { movieId: number; title: string; poster?: string }) {
  const { user, signInWithGoogle } = useFirebaseAuth();
  const [watched, setWatched] = React.useState(false);
  const [collected, setCollected] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const userId = user?.uid;

  React.useEffect(() => {
    let ignore = false;
    (async () => {
      if (!userId) return;
      try {
        const wRef = doc(db, "users", userId, "watched", String(movieId));
        const wSnap = await getDoc(wRef);
        if (!ignore) setWatched(wSnap.exists());
        const cRef = doc(db, "users", userId, "collections", String(movieId));
        const cSnap = await getDoc(cRef);
        if (!ignore) setCollected(cSnap.exists());
      } catch {}
    })();
    return () => { ignore = true; };
  }, [userId, movieId]);

  async function toggle(refKind: "watched" | "collections") {
    if (!userId) { await signInWithGoogle(); return; }
    setBusy(true);
    try {
      const ref = doc(db, "users", userId, refKind, String(movieId));
      const isOn = refKind === "watched" ? watched : collected;
      if (isOn) {
        await deleteDoc(ref);
        refKind === "watched" ? setWatched(false) : setCollected(false);
      } else {
        await setDoc(ref, { id: movieId, title, poster: poster || "", at: Date.now() });
        refKind === "watched" ? setWatched(true) : setCollected(true);
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <button
        onClick={() => toggle("watched")}
        disabled={busy}
        className={`px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 ${
          watched
            ? "bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white"
            : "bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white hover:opacity-95"
        }`}
      >
        <span className="text-base leading-none">✓</span>
        <span>{watched ? "Marked as Watched" : "Mark as Watched"}</span>
      </button>
      <button
        onClick={() => toggle("collections")}
        disabled={busy}
        className={`px-5 py-2.5 rounded-full text-sm inline-flex items-center justify-center gap-2 border transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-white/30 ${
          collected ? "bg-white text-black border-white" : "bg-black/30 text-white border-white/20 hover:bg-black/40"
        }`}
      >
        <span className="text-base leading-none">＋</span>
        <span>{collected ? "In Collection" : "Add to Collection"}</span>
      </button>
    </div>
  );
}
