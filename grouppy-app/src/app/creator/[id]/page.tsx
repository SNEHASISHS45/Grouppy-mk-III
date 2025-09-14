"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Image from "next/image";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, DocumentData, collection, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import Link from "next/link";
import { useFirebaseAuth } from "@/app/firebase-auth-context";

export default function CreatorPage() {
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState<any>(null);
  const { user } = useFirebaseAuth();
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        // Try creators first
        const ref = doc(db, "creators", params.id);
        let snap = await getDoc(ref);
        let data: DocumentData | null = null;
        if (snap.exists()) {
          data = { id: snap.id, ...snap.data() };
        } else {
          // Fall back to users collection
          const uref = doc(db, "users", params.id);
          const usnap = await getDoc(uref);
          if (usnap.exists()) {
            data = { id: usnap.id, ...usnap.data(), __source: "users" };
          }
        }
        if (data) setCreator(data);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  // follow state + counts
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const fs = await getDocs(collection(db, "users", params.id, "followers"));
        if (!ignore) setFollowersCount(fs.size);
      } catch {}
      if (!user) return;
      try {
        const myFollowing = await getDoc(doc(db, "users", user.uid, "following", String(params.id)));
        if (!ignore) setIsFollowing(myFollowing.exists());
      } catch {}
    })();
    return () => { ignore = true; };
  }, [user, params.id]);

  async function toggleFollow() {
    if (!user) return; // optionally prompt sign-in elsewhere
    try {
      const fRef = doc(db, "users", user.uid, "following", String(params.id));
      const rRef = doc(db, "users", String(params.id), "followers", user.uid);
      if (isFollowing) {
        await deleteDoc(fRef);
        await deleteDoc(rRef);
        setIsFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
      } else {
        await setDoc(fRef, { uid: String(params.id), followedAt: Date.now() });
        await setDoc(rRef, { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL, followedAt: Date.now() });
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
      }
    } catch {}
  }

  const posters: string[] = Array.isArray(creator?.posters) ? creator.posters : Array.isArray(creator?.topPosters) ? creator.topPosters : [];
  const avatar: string | undefined = (creator?.avatar || creator?.photoURL) as string | undefined;
  const name: string = (creator?.name || creator?.displayName || creator?.username || creator?.handle || "Creator") as string;
  const username: string | undefined = (creator?.username || creator?.handle) as string | undefined;

  return (
    <main className="min-h-dvh">
      <Header />
      <div className="max-w-screen-lg mx-auto px-4 pt-24 pb-16">
        {loading ? (
          <div className="rounded-xl border border-white/10 p-6 bg-white/5">Loading…</div>
        ) : !creator ? (
          <div className="rounded-xl border border-white/10 p-6 bg-white/5">Creator not found.</div>
        ) : (
          <div>
            <div className="flex items-center gap-4">
              <span className="inline-flex h-16 w-16 rounded-full overflow-hidden ring-1 ring-white/20 bg-white/10">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt={name} className="h-full w-full object-cover" />
                ) : null}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight truncate">{name}</h1>
                {username && (
                  <div className="text-sm text-neutral-400 truncate">{username}</div>
                )}
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="text-sm text-neutral-300"><span className="font-semibold">{followersCount}</span> Followers</div>
                {user && user.uid !== params.id && (
                  <button
                    onClick={toggleFollow}
                    className={`px-4 py-2 rounded-md text-sm font-semibold ${isFollowing ? "bg-white/10 border border-white/10" : "bg-white text-black"}`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            </div>

            <section className="mt-6">
              <h2 className="text-lg font-semibold mb-3">Top Picks</h2>
              {posters.length === 0 ? (
                <div className="text-sm text-neutral-400">No picks added.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {posters.slice(0, 20).map((p: string, i: number) => (
                    <div key={i} className="relative aspect-[2/3] overflow-hidden rounded-xl ring-1 ring-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p} alt={`pick-${i}`} className="absolute inset-0 h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-8">
              <Link href="/entertainment" className="text-sm text-neutral-300 hover:text-white">← Back to Explore</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
