import { apiUsage } from '@/lib/db'

/**
 * Servizio per il monitoraggio e il controllo del budget delle API.
 * Implementa un "Soft Ceiling" per evitare consumi imprevisti su Anthropic, Google e Notion.
 * App locale a utente singolo: il contatore è per servizio e mese (tabella api_usage_stats).
 */
export const UsageService = {
    /**
     * Verifica se c'è ancora budget per il servizio richiesto e incrementa il contatore.
     * @returns { allowed: boolean, current?: number, limit?: number }
     */
    async checkAndIncrement(service: 'anthropic' | 'google' | 'notion') {
        const now = new Date()
        const monthYear = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`

        try {
            // 1. Recupera le statistiche correnti per questo mese/servizio (nessuna riga = inizio mese)
            const data = apiUsage.get(service, monthYear)
            const currentCount = data?.request_count ?? 0

            // Definiamo limiti di default se non presenti in DB
            // Anthropic: 100 call/mese (molto prudente)
            // Altri: 200 call/mese
            const defaultLimit = service === 'anthropic' ? 100 : 200
            const limit = data?.max_limit ?? defaultLimit

            // 2. Controllo del tetto (Ceiling)
            if (currentCount >= limit) {
                console.warn(`[UsageService] LIMITE RAGGIUNTO per ${service}: ${currentCount}/${limit}`)
                return { allowed: false, current: currentCount, limit }
            }

            // 3. Incremento atomico (INSERT ... ON CONFLICT DO UPDATE)
            apiUsage.increment(service, monthYear, limit)

            return { allowed: true, current: currentCount + 1, limit }

        } catch (err) {
            // In caso di errore DB, permettiamo la chiamata per non bloccare l'utente erroneamente
            console.error(`[UsageService] Errore imprevisto:`, err)
            return { allowed: true }
        }
    }
}
