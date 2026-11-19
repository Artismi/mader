'use client'

import { useEffect } from 'react'
import { StudioAgent } from '@/components/studio-agent/StudioAgent'

export default function Page() {
  // per il giro senza schermo: chi apre la pagina in un Chrome invisibile trova qui le funzioni da chiamare
  useEffect(() => { import('@/lib/studio-agent/giro').then(g => { (window as unknown as { __artista: unknown }).__artista = g }) }, [])
  return <main className="h-screen"><StudioAgent /></main>
}
