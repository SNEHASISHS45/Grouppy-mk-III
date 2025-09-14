"use client";

import React from "react";
import { auth, db, googleProvider, authReady } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut, setPersistence, browserSessionPersistence, inMemoryPersistence, type User, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export type FirebaseUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
};

export type FirebaseAuthContextType = {
  user: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const FirebaseAuthContext = React.createContext<FirebaseAuthContextType | undefined>(undefined);

async function ensureUserDoc(u: FirebaseUser) {
  try {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: u.uid,
        displayName: u.displayName || u.email || "User",
        photoURL: u.photoURL || "",
        email: u.email || "",
        joinedClubs: [],
        createdAt: serverTimestamp(),
      });
    } else {
      // Merge minimal info
      await setDoc(ref, { uid: u.uid, displayName: u.displayName || u.email || "User", email: u.email || "" }, { merge: true });
    }
  } catch (e) {
    // Non-fatal
    console.warn("ensureUserDoc failed", e);
  }
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<FirebaseUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      try { await authReady; } catch {}
      unsub = onAuthStateChanged(auth, (u: User | null) => {
        if (u) {
          const simple: FirebaseUser = { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL };
          setUser(simple);
          ensureUserDoc(simple);
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    try {
      await authReady;
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err: any) {
        const code = err?.code || "";
        const popupIssues = new Set([
          "auth/popup-blocked",
          "auth/operation-not-supported-in-this-environment",
          "auth/internal-error",
          "auth/cancelled-popup-request",
          "auth/popup-closed-by-user",
        ]);
        if (popupIssues.has(code)) {
          // Fallback to redirect
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        // Storage/persistence issues: switch persistence and retry once
        if (code === "storage/quota-exceeded" || code === "auth/internal-error") {
          try {
            await setPersistence(auth, browserSessionPersistence);
          } catch {
            await setPersistence(auth, inMemoryPersistence);
          }
          await signInWithPopup(auth, googleProvider);
          return;
        }
        throw err;
      }
    } catch (e) {
      console.error("Google sign-in failed", e);
      throw e;
    }
  }, []);

  const signOut = React.useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const signUpWithEmail = React.useCallback(async (email: string, password: string, displayName?: string) => {
    await authReady;
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const simple: FirebaseUser = { uid: cred.user.uid, displayName: cred.user.displayName || displayName || email, email: cred.user.email, photoURL: cred.user.photoURL };
    setUser(simple);
    await ensureUserDoc(simple);
  }, []);

  const signInWithEmail = React.useCallback(async (email: string, password: string) => {
    await authReady;
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const simple: FirebaseUser = { uid: cred.user.uid, displayName: cred.user.displayName, email: cred.user.email, photoURL: cred.user.photoURL };
    setUser(simple);
    await ensureUserDoc(simple);
  }, []);

  const resetPassword = React.useCallback(async (email: string) => {
    await authReady;
    await sendPasswordResetEmail(auth, email);
  }, []);

  const value = React.useMemo(() => ({ user, loading, signInWithGoogle, signOut, signUpWithEmail, signInWithEmail, resetPassword }), [user, loading, signInWithGoogle, signOut, signUpWithEmail, signInWithEmail, resetPassword]);

  return (
    <FirebaseAuthContext.Provider value={value}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const ctx = React.useContext(FirebaseAuthContext);
  if (!ctx) {
    if (typeof window !== "undefined") {
      console.warn("useFirebaseAuth called outside FirebaseAuthProvider. Returning safe defaults.");
    }
    return {
      user: null,
      loading: true,
      signInWithGoogle: async () => {},
      signOut: async () => {},
      signUpWithEmail: async () => {},
      signInWithEmail: async () => {},
      resetPassword: async () => {},
    } as FirebaseAuthContextType;
  }
  return ctx;
}
