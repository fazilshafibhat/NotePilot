import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // Hide the "N" dev-tools button (dev only). Compile and runtime errors
  // still show as an overlay.
  devIndicators: false,
  cacheComponents: true,
  // Forward /api/* to the Express server so the auth cookie and Google
  // sign-in redirect stay on this origin.
  async rewrites() {
    const apiUrl = process.env.API_URL ?? "http://localhost:8081";
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
