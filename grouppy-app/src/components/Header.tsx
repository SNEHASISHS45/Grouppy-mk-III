"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SearchOverlay from "@/components/SearchOverlay";
import { useFirebaseAuth } from "@/app/firebase-auth-context";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const { user } = useFirebaseAuth();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-colors text-white ${
        scrolled
          ? "bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/50 shadow-md"
          : "bg-gradient-to-b from-black/70 to-transparent"
      }`}
    >
      <div className="max-w-screen-xl mx-auto px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-2">
          <Link href="/" className="text-lg font-semibold drop-shadow">Grouppy</Link>
          {/* Simple high-quality SVG mark */}
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 opacity-90"><path fill="currentColor" d="M12 2c.7 0 1.3.37 1.66.97l7.02 12.16c.34.59.34 1.31 0 1.9l-1.08 1.86A1.9 1.9 0 0 1 17.9 20H6.1c-.68 0-1.31-.36-1.66-.97L3.36 17c-.34-.59-.34-1.31 0-1.9L10.38 2.97A1.9 1.9 0 0 1 12 2Zm0 4.2L6.86 15.2h10.28L12 6.2Z"/></svg>
        </div>

        {/* Center: Nav */}
        <nav className="justify-self-center flex items-center gap-6 text-sm text-neutral-200">
          <Link href="/entertainment" className="hover:text-white drop-shadow">Entertainment</Link>
          {/* You can add more center items here */}
        </nav>

        {/* Right: Search + Profile */}
        <div className="justify-self-end flex items-center gap-3">
          <SearchOverlay />
          {/* Bell icon to toggle NotificationsClient panel */}
          <button
            onClick={() => window.dispatchEvent(new Event("toggle-notifications"))}
            className="h-8 w-8 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
            title="Notifications"
            aria-label="Notifications"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .53-.21 1.04-.59 1.41L4 17h5"/>
              <path d="M9 17a3 3 0 0 0 6 0"/>
            </svg>
          </button>
          <Link
            href={user ? "/profile" : "/login"}
            className="block"
            aria-label={user ? "Open profile" : "Go to login"}
          >
            <span
              className="inline-flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border border-white/20 bg-black"
            >
              {user && user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt="avatar"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : null}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
