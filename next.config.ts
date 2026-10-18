import type { NextConfig } from "next";
import path from "path";

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
  // Server autonomo in .next/standalone: è quello che Electron avvia nel pacchetto
  output: 'standalone',
  // Radice esplicita: senza, Next sale fino al repo principale (lockfile più in alto)
  // e annida lo standalone sotto .claude/worktrees/… quando si costruisce da un worktree
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
  images: {
    unoptimized: true, // necessario per Electron (no image optimization server)
  },
  // pptxgenjs importa 'node:https' in modo dinamico: Turbopack su Windows ne fa un
  // chunk "[externals]_node:https…" (i due punti non sono validi nei nomi file)
  serverExternalPackages: ['pptxgenjs'],
  // Il tracciamento segue process.cwd() e trascinerebbe nello standalone tutto il
  // progetto: chiavi, dati, cartelle di lavoro. public/ lo copia prepara-pacchetto.
  outputFileTracingExcludes: {
    '*': [
      './.env*', './data/**', './data-prova/**', './.claude/**', './scratch/**', './vault/**',
      './graphify-out/**', './crew/**', './supabase/**', './docs/**', './knowledge/**',
      './extension/**', './scripts/**', './src/**', './electron/**', './public/**', './dist/**',
      './.pacchetto/**', './__MACOSX/**', './*.zip', './*.md', './next.config.ts',
      './tsconfig*', './eslint.config.mjs', './postcss.config.mjs', './instrumentation.ts',
      './package-lock.json',
    ],
  },
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
