import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,

  disable: false,
  workboxOptions: {
    disableDevLogs: true,
  },
});

// Disable strict type checking for rapid prototype deployments on Vercel
// Disable strict type checking for rapid prototype deployments on Vercel
const nextConfig: NextConfig = {
    env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://hfqvpnqtdgniilentrfw.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_CeUTopZVuWVEwtUnvpMvgg_ORForazi"
    }
};

// export default withPWA(nextConfig);
export default nextConfig;
