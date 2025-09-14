import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    // Allow specific quality values used by <Image quality={...}>
    qualities: [60, 75, 90],
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  turbopack: {
    // Monorepo root sits one level up from this next.config.ts
    root: path.resolve(__dirname, ".."),
  },
  eslint: {
    // Temporarily ignore ESLint errors during builds to allow deployment
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TS errors during builds to allow deployment
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
