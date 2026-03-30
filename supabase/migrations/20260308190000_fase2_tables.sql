-- Migrazione per Fase 2: Tabelle Portale Base
-- Definisce clients, tasks, ideas, context_instructions con RLS.

---------------------------
-- 1. Table: clients
---------------------------
create table public.clients (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    name text not null,
    vault_path text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.clients enable row level security;

create policy "Users can view their own clients" on public.clients
    for select using (auth.uid() = user_id);

create policy "Users can insert their own clients" on public.clients
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own clients" on public.clients
    for update using (auth.uid() = user_id);

create policy "Users can delete their own clients" on public.clients
    for delete using (auth.uid() = user_id);


---------------------------
-- 2. Table: tasks
---------------------------
create table public.tasks (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    client_id uuid references public.clients on delete cascade,
    title text not null,
    type text not null, -- es. 'design', 'dev', 'bando', 'social'
    deadline timestamp with time zone,
    status text default 'todo' not null, -- 'todo', 'in_progress', 'done'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;

create policy "Users can view their own tasks" on public.tasks
    for select using (auth.uid() = user_id);

create policy "Users can insert their own tasks" on public.tasks
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own tasks" on public.tasks
    for update using (auth.uid() = user_id);

create policy "Users can delete their own tasks" on public.tasks
    for delete using (auth.uid() = user_id);


---------------------------
-- 3. Table: ideas
---------------------------
create table public.ideas (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    client_id uuid references public.clients on delete cascade,
    text text not null,
    assigned boolean default false not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ideas enable row level security;

create policy "Users can view their own ideas" on public.ideas
    for select using (auth.uid() = user_id);

create policy "Users can insert their own ideas" on public.ideas
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own ideas" on public.ideas
    for update using (auth.uid() = user_id);

create policy "Users can delete their own ideas" on public.ideas
    for delete using (auth.uid() = user_id);


---------------------------
-- 4. Table: context_instructions
---------------------------
create table public.context_instructions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users not null,
    file_path text not null,
    instructions text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, file_path)
);

alter table public.context_instructions enable row level security;

create policy "Users can view their own context_instructions" on public.context_instructions
    for select using (auth.uid() = user_id);

create policy "Users can insert their own context_instructions" on public.context_instructions
    for insert with check (auth.uid() = user_id);

create policy "Users can update their own context_instructions" on public.context_instructions
    for update using (auth.uid() = user_id);

create policy "Users can delete their own context_instructions" on public.context_instructions
    for delete using (auth.uid() = user_id);
