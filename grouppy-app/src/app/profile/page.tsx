"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { useRouter } from "next/navigation";
import UserProfileCard from "@/components/profile/UserProfileCard";
import UserReviewsFeed from "@/components/profile/UserReviewsFeed";
import InterestedList from "@/components/profile/InterestedList";

export default function ProfilePage() {
  const { user, loading, signOut } = useFirebaseAuth();
  const router = useRouter();

  return (
    <main className="min-h-dvh">
      <Header />
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        {loading ? (
          <div className="rounded-xl border border-white/10 p-6 bg-white/5">Loading…</div>
        ) : !user ? (
          <div className="max-w-screen-sm mx-auto rounded-xl border border-white/10 p-6 bg-white/5">
            <h1 className="text-xl font-semibold">You are not signed in</h1>
            <p className="text-sm text-neutral-400 mt-1">Sign in with Google to personalise your experience.</p>
            <Link href="/login" className="inline-block mt-4 px-4 py-2 rounded bg-white text-black text-sm font-medium">
              Go to Login
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Profile card */}
            <div className="lg:col-span-3">
              <UserProfileCard />
              <div className="mt-4 flex gap-3">
                <Link href="/entertainment" className="px-4 py-2 rounded bg-white text-black text-sm font-medium">Back to Explore</Link>
                <button
                  onClick={async () => { try { await signOut(); } finally { router.replace('/login'); } }}
                  className="px-4 py-2 rounded bg-white/10 text-white text-sm font-medium border border-white/20"
                >
                  Sign out
                </button>
              </div>
            </div>

            {/* Center: Reviews / Posts / Collections */}
            <div className="lg:col-span-6">
              <UserReviewsFeed />
            </div>

            {/* Right: Interested In */}
            <div className="lg:col-span-3">
              <InterestedList />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

