import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Allow the worker to precache the manifest of static assets but skip
  // dev to keep `next dev` reload fast.
  disable: process.env.NODE_ENV === "development",
});

// Standalone single-app repo — no monorepo file-tracing root needed.
const nextConfig: NextConfig = {};

export default withSerwist(nextConfig);
