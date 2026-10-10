'use client'

import { useRouter } from 'next/navigation'

/** Cerchio per tornare al guscio: la catena è ancora in memoria, si riprende da dov'eri */
export function StudioReturn() {
  const router = useRouter()
  const back = () => (history.length > 1 ? router.back() : router.push('/os'))
  return (
    <button
      onClick={back}
      aria-label="Torna al guscio"
      title="Torna al guscio"
      style={{
        position: 'fixed', left: 16, bottom: 16, zIndex: 80, width: 52, height: 52, borderRadius: '50%',
        background: '#17150f', color: '#fbfaf7', border: 0, cursor: 'pointer', display: 'grid', placeItems: 'center',
        boxShadow: '0 0 0 4px rgba(255,79,31,.35), 0 12px 28px -12px rgba(0,0,0,.8)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
    </button>
  )
}
