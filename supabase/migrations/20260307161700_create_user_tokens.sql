-- Migrazione per tabella user_tokens
create table public.user_tokens (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    provider text not null,
    provider_token text,
    provider_refresh_token text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, provider)
);

-- Abilitazione Row Level Security
alter table public.user_tokens enable row level security;

-- Policy per consentire agli utenti di gestire i propri token
create policy "Users can view their own tokens." on public.user_tokens
    for select using (auth.uid() = user_id);

create policy "Users can insert their own tokens." on public.user_tokens
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own tokens." on public.user_tokens
    for update using (auth.uid() = user_id);
