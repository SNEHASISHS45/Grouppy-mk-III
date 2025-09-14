"use client";

import Header from "@/components/Header";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp, updateDoc } from "firebase/firestore";
import React from "react";
import { useRouter } from "next/navigation";

export default function NewCollectionPage() {
  const { user, loading, signInWithGoogle } = useFirebaseAuth();
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [cover, setCover] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { await signInWithGoogle(); return; }
    const name = title.trim();
    if (!name) return;
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, "users", user.uid, "collections"), {
        title: name,
        cover: cover || null,
        itemsCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: Date.now(),
      });
      // store cid for collectionGroup lookup by route id
      await updateDoc(ref, { cid: ref.id });
      router.replace(`/collections/${ref.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh">
      <Header />
      <div className="max-w-xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-xl font-semibold mb-4">Create Collection</h1>
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">Loading…</div>
        ) : !user ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm">
            Please sign in to create a collection.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-5">
            <div>
              <label className="text-sm text-neutral-300">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full bg-black border border-white/10 rounded px-3 py-2 text-sm" placeholder="My Favorites" />
            </div>
            <div>
              <label className="text-sm text-neutral-300">Cover poster path or URL</label>
              <input value={cover} onChange={(e) => setCover(e.target.value)} className="mt-1 w-full bg-black border border-white/10 rounded px-3 py-2 text-sm" placeholder="/abc.jpg or https://..." />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={busy || !title.trim()} className="px-4 py-2 rounded-md bg-white text-black text-sm font-semibold disabled:opacity-50">Create</button>
              <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md bg-white/10 border border-white/10 text-sm">Cancel</button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
