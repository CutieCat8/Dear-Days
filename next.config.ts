import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Memory form sends up to 8 photos × 10 MiB through saveMemoryAction, plus multipart overhead.
      // TODO(R7): drop back toward the 1 MB default if photos move to direct-to-Storage signed uploads.
      bodySizeLimit: "85mb",
    },
  },
};

export default nextConfig;
