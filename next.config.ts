// next.config.ts
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// ✅ Konfigurasi PWA yang VALID
const withPWA = withPWAInit({
  dest: "public",                    // ✅ Folder output service worker
  cacheOnFrontEndNav: true,          // ✅ Cache saat navigasi frontend
  aggressiveFrontEndNavCaching: true, // ✅ Cache lebih agresif
  reloadOnOnline: true,              // ✅ Reload saat online kembali
  //swcMinify: true,                   // ✅ Gunakan SWC minify (Next.js native)
  disable: process.env.NODE_ENV === "development", // ✅ Nonaktifkan PWA saat dev (opsional)
  
  // ✅ Workbox options untuk custom caching
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-cache",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24, // 24 jam
          },
        },
      },
    ],
  },
});

// ✅ Konfigurasi Next.js utama
const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // ✅ Penting untuk PWA static export compatibility
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  turbopack: {}, // ✅ Silence Turbopack warning
};

// ✅ Wrap config Next.js dengan PWA plugin
export default withPWA(nextConfig);