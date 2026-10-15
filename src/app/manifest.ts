import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LearnLikeADev",
    short_name: "LearnLikeADev",
    description: "Understand the mechanism. Test it. Build something that works.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A121A",
    theme_color: "#0A121A",
    icons: [
      { src: "/brand/app-icon-180.png", sizes: "180x180", type: "image/png" },
      { src: "/brand/app-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/app-icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
