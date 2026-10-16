import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// Lets a phone on the same Wi-Fi open the dev server via this laptop's IP
// (e.g. http://192.168.1.5:3000). Only affects `npm run dev`.
const lanAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

const securityHeaders = [
  // no other site may show this app inside a frame (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: lanAddresses,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Every page is per-admin and session-based, so Cache Components is left off:
  // pages render dynamically on each request.
  serverExternalPackages: ["exceljs"],
  experimental: {
    serverActions: {
      // allow employee photo uploads (images are limited to 5 MB in storage)
      bodySizeLimit: "6mb",
    },
  },
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
