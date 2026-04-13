import type { NextConfig } from "next";

const securityHeaders = [
  // Impedisce clickjacking
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Blocca sniffing del content type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Referrer policy
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disabilita funzionalità browser non necessarie
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // necessario per Electron (no image optimization server)
  },
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // canvas state + thumbnail base64 può superare 1MB
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
