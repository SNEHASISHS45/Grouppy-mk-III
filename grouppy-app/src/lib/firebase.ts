import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Ensure env vars are provided at build time
const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

const missing: string[] = [];
for (const [k, v] of Object.entries(cfg)) {
  if (!v) missing.push(k);
}
if (missing.length) {
  const msg = `Firebase config missing required env vars: ${missing.join(", ")}. Define them in grouppy-app/.env.local`;
  // Throwing early gives a clear message instead of Firebase auth/invalid-api-key
  throw new Error(msg);
}

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(cfg as any);
} else {
  app = getApps()[0]!;
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Configure Google provider with account chooser always shown
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Prepare persistence to be resilient across webviews
export const authReady: Promise<void> = (async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    try {
      await setPersistence(auth, browserSessionPersistence);
    } catch {
      await setPersistence(auth, inMemoryPersistence);
    }
  }
})();
