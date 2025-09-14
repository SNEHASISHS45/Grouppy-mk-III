"use client";

import React from "react";

export default function SocialEmbedsClient({ twitterHandle, instagramHandle }: { twitterHandle?: string; instagramHandle?: string }) {
  if (!twitterHandle && !instagramHandle) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      {twitterHandle && (
        <a
          href={`https://twitter.com/${twitterHandle}`}
          target="_blank"
          rel="noreferrer"
          className="px-2 py-1 rounded-md bg-white/10 border border-white/10 text-neutral-200 hover:bg-white/15"
        >
          Twitter
        </a>
      )}
      {instagramHandle && (
        <a
          href={`https://instagram.com/${instagramHandle}`}
          target="_blank"
          rel="noreferrer"
          className="px-2 py-1 rounded-md bg-white/10 border border-white/10 text-neutral-200 hover:bg-white/15"
        >
          Instagram
        </a>
      )}
    </div>
  );
}
