// Supabase è facoltativo: l'app impacchettata parte senza .env e senza account.
// Chi usa Supabase controlla qui prima di creare un client, invece di farlo fallire.
export function supabaseConfigurato(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export const SUPABASE_NON_CONFIGURATO = 'Account online non configurato: mancano NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
