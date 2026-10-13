import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/learn/[slug]": ["./docs/applied-ai/**/*.md"],
    "/*": ["./certs/supabase-prod-root.crt"],
  },
};

export default nextConfig;
