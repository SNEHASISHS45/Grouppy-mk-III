import { NextResponse } from "next/server";

export async function GET() {
  const env = process.env;
  return NextResponse.json({
    // TMDB
    TMDB_API_KEY_present: Boolean(env.TMDB_API_KEY),
    VITE_TMDB_API_KEY_present: Boolean(env.VITE_TMDB_API_KEY),
    TMDB_ACCESS_TOKEN_present: Boolean(env.TMDB_ACCESS_TOKEN),
    // NextAuth
    NEXTAUTH_SECRET_present: Boolean(env.NEXTAUTH_SECRET),
    NEXTAUTH_URL_present: Boolean(env.NEXTAUTH_URL),
    GOOGLE_CLIENT_ID_present: Boolean(env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET_present: Boolean(env.GOOGLE_CLIENT_SECRET),
    // Firebase (client-side keys must be NEXT_PUBLIC_*)
    NEXT_PUBLIC_FIREBASE_API_KEY_present: Boolean(env.NEXT_PUBLIC_FIREBASE_API_KEY),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_present: Boolean(env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID_present: Boolean(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_present: Boolean(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_present: Boolean(env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    NEXT_PUBLIC_FIREBASE_APP_ID_present: Boolean(env.NEXT_PUBLIC_FIREBASE_APP_ID),
  });
}
