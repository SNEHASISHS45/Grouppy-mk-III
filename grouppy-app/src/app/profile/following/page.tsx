"use client";

import Header from "@/components/Header";
import FollowList from "@/components/profile/FollowList";

export default function FollowingPage() {
  return (
    <main className="min-h-dvh">
      <Header />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-xl font-semibold mb-4">Following</h1>
        <FollowList kind="following" />
      </div>
    </main>
  );
}
