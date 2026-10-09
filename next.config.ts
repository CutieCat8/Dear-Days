import type { NextConfig } from "next";

// Signed photo URLs come from the project's Storage host; allow exactly that host for next/image.
const supabaseUrl = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
  } catch {
    return null;
  }
})();
const isLocal = supabaseUrl ? ["localhost", "127.0.0.1"].includes(supabaseUrl.hostname) : false;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseUrl
      ? [{ protocol: supabaseUrl.protocol === "http:" ? "http" : "https", hostname: supabaseUrl.hostname, port: supabaseUrl.port, pathname: "/storage/v1/object/sign/**" }]
      : [],
    // only for a local Supabase stack: the optimizer otherwise refuses localhost upstreams
    dangerouslyAllowLocalIP: isLocal,
  },
};

export default nextConfig;
