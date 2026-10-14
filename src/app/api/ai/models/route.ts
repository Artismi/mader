import { NextResponse } from 'next/server'
import { checkModelIds, registrySummary } from '@/lib/ai/model-registry'
import { catalogInfo, refreshCatalog, type CatalogProvider } from '@/lib/ai/model-catalog'

/**
 * Stato dei modelli: chiavi, ordine per compito, elenchi dei fornitori e ID
 * ritirati. GET /api/ai/models?aggiorna=1 riscarica subito gli elenchi.
 */
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get('aggiorna')) {
    await Promise.all((['openrouter', 'anthropic', 'google'] as CatalogProvider[]).map(p => refreshCatalog(p)))
  }
  const ids = checkModelIds()
  return NextResponse.json({
    ...registrySummary(),
    cataloghi: catalogInfo(),
    ids,
    ritirati: ids.filter(i => i.stato === 'ritirato'),
  })
}
