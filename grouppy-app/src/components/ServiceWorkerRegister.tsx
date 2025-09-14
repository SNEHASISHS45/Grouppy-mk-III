"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      const register = async () => {
        try {
          await navigator.serviceWorker.register("/sw.js");
          // console.log("SW registered");
        } catch (e) {
          // console.warn("SW registration failed", e);
        }
      };
      register();
    }
  }, []);
  return null;
}
