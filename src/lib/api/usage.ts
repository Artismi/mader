import { createClient } from '@/lib/supabase/server'

/**
 * Servizio per il monitoraggio e il controllo del budget delle API.
 * Implementa un "Soft Ceiling" per evitare consumi imprevisti su Anthropic, Google e Notion.
 */
export const UsageService = {
    /**
     * Verifica se l'utente ha ancora budget per il servizio richiesto e incrementa il contatore.
     * @returns { allowed: boolean, current?: number, limit?: number, error?: string }
     */
    async checkAndIncrement(service: 'anthropic' | 'google' | 'notion', userId: string) {
        const supabase = await createClient()
        const now = new Date()
        const monthYear = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`

        try {
            // 1. Recupera le statistiche correnti per questo mese/servizio
            const { data, error } = await supabase
                .from('api_usage_stats')
                .select('*')
                .eq('user_id', userId)
                .eq('service', service)
                .eq('month_year', monthYear)
                .single()

            // PGRST116 indica che non è stata trovata nessuna riga (normale all'inizio del mese)
            if (error && error.code !== 'PGRST116') {
                console.error(`[UsageService] Errore nel recupero stats:`, error)
                // In caso di errore DB, permettiamo la chiamata per non bloccare l'utente erroneamente
                return { allowed: true }
            }

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

            // 3. Incremento atomico tramite upsert
            // Nota: In un sistema ad alto traffico useremmo una funzione RPC per l'incremento atomico,
            // ma per un "Creative OS" freelance l'upsert è sufficientemente sicuro.
            const { error: upsertError } = await supabase
                .from('api_usage_stats')
                .upsert({
                    user_id: userId,
                    service,
                    month_year: monthYear,
                    request_count: currentCount + 1,
                    max_limit: limit,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, service, month_year' })

            if (upsertError) {
                console.error(`[UsageService] Errore nell'aggiornamento contatore:`, upsertError)
                return { allowed: true } // Permettiamo comunque se fallisce il log
            }

            return { allowed: true, current: currentCount + 1, limit }

        } catch (err) {
            console.error(`[UsageService] Errore imprevisto:`, err)
            return { allowed: true }
        }
    }
}
