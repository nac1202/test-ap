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
const nextConfig: NextConfig = {};

// export default withPWA(nextConfig);
export default nextConfig;
