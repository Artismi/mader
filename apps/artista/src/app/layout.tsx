import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Artista-osservatore',
  description: 'Un artista procedurale che legge il mondo e risponde con tavole.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
