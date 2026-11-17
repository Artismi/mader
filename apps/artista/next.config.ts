import type { NextConfig } from 'next'
import path from 'path'

// l'app vive dentro il repo di Creative OS: la radice va fissata qui,
// altrimenti Next pesca middleware e instrumentation del progetto principale
const root = path.resolve(__dirname)

const nextConfig: NextConfig = {
  turbopack: { root },
  outputFileTracingRoot: root,
}

export default nextConfig
