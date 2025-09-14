"use client";

import Header from "@/components/Header";
import { db } from "@/lib/firebase";
import { collectionGroup, getDocs, limit, query, where, collection, onSnapshot, orderBy, addDoc, serverTimestamp, doc, deleteDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import Link from "next/link";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { img } from "@/lib/tmdb";

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, signInWithGoogle } = useFirebaseAuth();
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [meta, setMeta] = React.useState<any>(null);
  const [ownerPath, setOwnerPath] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<any[]>([]);

  React.useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const cg = query(collectionGroup(db, "collections"), where("cid", "==", params.id), limit(1));
        const snaps = await getDocs(cg);
        if (!snaps.empty) {
          const d = snaps.docs[0];
          setMeta({ id: d.id, ...(d.data() as any) });
          // parent path like users/{uid}/collections
          const parent = d.ref.parent; // collections
          const uid = parent.parent?.id;
          if (uid) {
            const itemsCol = collection(parent, d.id, "items");
            setOwnerPath(`users/${uid}/collections/${d.id}`);
            unsub = onSnapshot(query(itemsCol, orderBy("addedAt", "desc")), (snap) => {
              const arr: any[] = [];
              snap.forEach((s) => arr.push({ id: s.id, ...(s.data() as any) }));
              setItems(arr);
            });
          }
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, [params.id]);

  async function addCurrentFromClipboard() {
    if (!ownerPath) return;
    if (!user) { await signInWithGoogle(); return; }
    try {
      const text = await navigator.clipboard.readText();
      const [id, title, poster] = text.split("|", 3);
      if (!id || !title) return;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_users, uid, _collections, colId] = ownerPath.split("/");
      await addDoc(collection(db, "users", uid, "collections", colId, "items"), { id: Number(id), title, poster: poster || "", addedAt: serverTimestamp() });
    } catch {}
  }

  async function removeItem(itemId: string) {
    if (!ownerPath) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_users, uid, _collections, colId] = ownerPath.split("/");
      await deleteDoc(doc(db, "users", uid, "collections", colId, "items", itemId));
    } catch {}
  }

  return (
    <main className="min-h-dvh">
      <Header />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">Loading…</div>
        ) : !meta ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">Collection not found.</div>
        ) : (
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold truncate">{meta.title}</h1>
              <Link href="/profile" className="ml-auto text-sm text-neutral-300 hover:text-white">Back to Profile</Link>
              {ownerPath && (
                <button onClick={addCurrentFromClipboard} className="text-xs px-3 py-1 rounded-md bg-white/10 border border-white/10" title="Paste 'id|title|poster' from clipboard to add">Add from Clipboard</button>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((it) => (
                <div key={it.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/5 relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.poster ? (
                    <img src={it.poster.startsWith("http") ? it.poster : img.poster(it.poster, "w342")} alt={it.title} className="w-full aspect-[2/3] object-cover" />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-white/5" />
                  )}
                  <div className="p-2 text-xs font-medium truncate">{it.title}</div>
                  {ownerPath && (
                    <button onClick={() => removeItem(it.id)} className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-black/60 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
                  )}
                </div>
              ))}
            </div>
            {items.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-neutral-400 mt-3">No items yet.</div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
