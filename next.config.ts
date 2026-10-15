import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Do not generate agent instruction files in contributors' checkouts.
  agentRules: false,
  outputFileTracingIncludes: {
    "/learn/[slug]": ["./docs/applied-ai/**/*.md"],
    "/*": ["./certs/supabase-prod-root.crt"],
  },
};

export default nextConfig;
