import type { NextConfig } from "next";

// INTERNAL_API_URL may end with '/api' (used by lib/api.ts for SSR fetches).
// Strip the trailing '/api' so we can append '/:path*' ourselves.
const BACKEND_ORIGIN =
  (process.env.INTERNAL_API_URL ?? "http://127.0.0.1:8000/api")
    .replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  // Standalone output bundles only the files needed to run the app —
  // required for the minimal Docker image (see frontend/Dockerfile).
  output: "standalone",

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
