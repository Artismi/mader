-- Table: api_usage_stats
-- Traccia il numero di chiamate API effettuate per evitare spese eccessive.
create table public.api_usage_stats (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    service text not null, -- 'anthropic', 'google', 'notion'
    month_year text not null, -- formato 'MM-YYYY'
    request_count integer default 0 not null,
    max_limit integer default 100 not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, service, month_year)
);

-- Abilitazione RLS
alter table public.api_usage_stats enable row level security;

-- Policy per consentire agli utenti di vedere i propri consumi
create policy "Users can view their own API stats" on public.api_usage_stats
    for select using (auth.uid() = user_id);

-- Policy per consentire al server (service_role) di aggiornare i contatori
-- NOTA: In Supabase, le query lato server con service_role saltano i RLS, 
-- ma qui aggiungiamo policy esplicite per chiarezza se usate con anon/authenticated.
create policy "Users can update their own API stats" on public.api_usage_stats
    for update using (auth.uid() = user_id);

create policy "Users can insert their own API stats" on public.api_usage_stats
    for insert with check (auth.uid() = user_id);

-- Funzione helper per incrementare o inizializzare il contatore (Upsert atomico)
-- Questo previene race conditions se ci sono più chiamate parallele.
-- (Verrà chiamata tramite .rpc() o operazione atomica in Supabase adapter)
