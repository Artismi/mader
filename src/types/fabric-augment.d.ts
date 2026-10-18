/**
 * Proprietà e eventi che Creative OS aggiunge agli oggetti di Fabric:
 * nome del livello, filtri e video su qualunque oggetto (vedi
 * studio/extensions/filters.ts), modalità di fusione, eventi del viewport.
 */
import type { TPointerEventInfo } from 'fabric'

declare module 'fabric' {
  interface FabricObject {
    name?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filters?: any[]
    isVideo?: boolean
    blendMode?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyFilters?(filters?: any[]): void
  }
  interface FabricObjectProps {
    name?: string
    blendMode?: string
  }
  interface CanvasEvents {
    'viewport:scaled': Partial<TPointerEventInfo> | undefined
    'viewport:translated': Partial<TPointerEventInfo> | undefined
  }
}
