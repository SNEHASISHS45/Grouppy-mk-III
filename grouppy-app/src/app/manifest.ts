import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Grouppy Entertainment",
    short_name: "Grouppy",
    description: "Daily watchable picks, trending, and upcoming content",
    start_url: "/entertainment",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/favicon.ico", sizes: "64x64 32x32 24x24 16x16", type: "image/x-icon" },
      { src: "/next.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/globe.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }
    ],
  };
}
