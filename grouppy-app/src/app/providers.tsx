"use client";

import React from "react";
import { FirebaseAuthProvider } from "./firebase-auth-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}
