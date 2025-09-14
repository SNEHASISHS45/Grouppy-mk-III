"use client";

import { useFirebaseAuth } from "@/app/firebase-auth-context";
import { useRouter } from "next/navigation";

export default function AuthButtons() {
  const { user, loading, signInWithGoogle, signOut } = useFirebaseAuth();
  const router = useRouter();
  const onSignOut = async () => {
    try { await signOut(); } finally { router.replace('/login'); }
  };
  if (loading) return null;
  return (
    <div className="flex items-center gap-2">
      {user ? (
        <>
          <span className="text-sm text-neutral-300 hidden sm:block">Hi, {(user.displayName || user.email || "").split(" ")[0]}</span>
          <button
            onClick={onSignOut}
            className="px-3 py-1.5 rounded-md bg-white/10 text-white text-sm hover:bg-white/20"
          >
            Sign out
          </button>
        </>
      ) : (
        <button
          onClick={() => signInWithGoogle()}
          className="px-3 py-1.5 rounded-md bg-white text-black text-sm font-medium"
        >
          Sign in with Google
        </button>
      )}
    </div>
  );
}
