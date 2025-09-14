"use client";

import Header from "@/components/Header";
import FollowList from "@/components/profile/FollowList";

export default function FollowersPage() {
  return (
    <main className="min-h-dvh">
      <Header />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-xl font-semibold mb-4">Followers</h1>
        <FollowList kind="followers" />
      </div>
    </main>
  );
}
