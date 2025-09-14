"use client";

import React from "react";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, collectionGroup, query, where, getDocs, collection } from "firebase/firestore";
import Link from "next/link";

export default function UserProfileCard() {
  const { user } = useFirebaseAuth();
  const [bio, setBio] = React.useState<string>("");
  const [counts, setCounts] = React.useState<{ reviews: number; posts: number; collections: number; followers: number; following: number }>({ reviews: 0, posts: 0, collections: 0, followers: 0, following: 0 });

  React.useEffect(() => {
    let ignore = false;
    (async () => {
      if (!user) return;
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (!ignore && snap.exists()) {
          const d: any = snap.data();
          setBio(d.bio || "Movies are my therapy — a powerful escape, a way to feel, heal, and recharge.");
          setCounts((c) => ({
            ...c,
            followers: Array.isArray(d.followers) ? d.followers.length : (d.followersCount || 0) || 0,
            following: Array.isArray(d.following) ? d.following.length : (d.followingCount || 0) || 0,
          }));
        }
      } catch {}
      // Reviews count: prefer root 'reviews' collection, fallback to collectionGroup
      try {
        let reviewsCount = 0;
        try {
          const qRoot = query(collection(db, "reviews"), where("userId", "==", user!.uid));
          const snapRoot = await getDocs(qRoot);
          reviewsCount = snapRoot.size;
        } catch {}
        if (reviewsCount === 0) {
          try {
            const qCg = query(collectionGroup(db, "reviews"), where("userId", "==", user!.uid));
            const snapCg = await getDocs(qCg);
            reviewsCount = snapCg.size;
          } catch {}
        }
        if (!ignore) setCounts((c) => ({ ...c, reviews: reviewsCount }));
      } catch {}
      // Collections count: prefer root 'collections' where userId, fallback to users/{uid}/collections
      try {
        let colCount = 0;
        try {
          const qCols = query(collection(db, "collections"), where("userId", "==", user!.uid));
          const snapCols = await getDocs(qCols);
          colCount = snapCols.size;
        } catch {}
        if (colCount === 0) {
          try {
            const snapUserCols = await getDocs(collection(db, "users", user!.uid, "collections"));
            colCount = snapUserCols.size;
          } catch {}
        }
        if (!ignore) setCounts((c) => ({ ...c, collections: colCount }));
      } catch {}
      // Posts count: exploreImages where user.uid == current
      try {
        const qPosts = query(collection(db, "exploreImages"), where("user.uid", "==", user!.uid));
        const snapPosts = await getDocs(qPosts);
        if (!ignore) setCounts((c) => ({ ...c, posts: snapPosts.size }));
      } catch {}
    })();
    return () => { ignore = true; };
  }, [user]);

  if (!user) return null;
  const handle = user.email ? `@${user.email.split("@")[0]}` : "@user";

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || "User"} className="h-24 w-24 rounded-full object-cover" />
        ) : (
          <div className="h-24 w-24 rounded-full bg-white/10" />
        )}
        <h2 className="mt-4 text-lg font-semibold">{user.displayName || user.email || "User"}</h2>
        <div className="text-sm text-neutral-400">{handle.toUpperCase()}</div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white/5 border border-white/10 p-3">
          <div className="text-neutral-400 text-xs">Reviews</div>
          <div className="font-semibold">{counts.reviews}</div>
        </div>
        <div className="rounded-lg bg-white/5 border border-white/10 p-3">
          <div className="text-neutral-400 text-xs">Posts</div>
          <div className="font-semibold">{counts.posts}</div>
        </div>
        <div className="rounded-lg bg-white/5 border border-white/10 p-3">
          <div className="text-neutral-400 text-xs">Collections</div>
          <div className="font-semibold">{counts.collections}</div>
        </div>
      </div>

      <p className="mt-5 text-sm text-neutral-300 leading-relaxed">{bio}</p>

      <div className="mt-5 flex items-center justify-center gap-6 text-sm">
        <Link href="/profile/followers" className="text-neutral-300 hover:text-white">
          <span className="font-semibold">{counts.followers}</span> Followers
        </Link>
        <Link href="/profile/following" className="text-neutral-300 hover:text-white">
          <span className="font-semibold">{counts.following}</span> Following
        </Link>
      </div>

      <div className="mt-6">
        <Link href="/profile/edit" className="block w-full px-4 py-2 rounded-md bg-white/10 hover:bg-white/15 border border-white/10 text-sm text-center">Edit Profile</Link>
      </div>
    </aside>
  );
}
