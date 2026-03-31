-- Skills table (personalizzazione Co-Pilot)
CREATE TABLE IF NOT EXISTS public.skills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slug text NOT NULL,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    content text NOT NULL DEFAULT '',
    triggers text[] NOT NULL DEFAULT '{}',
    active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(user_id, slug)
);
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills_own" ON public.skills FOR ALL USING (auth.uid() = user_id);

-- System config (architettura AI)
CREATE TABLE IF NOT EXISTS public.system_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key text NOT NULL,
    value text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    UNIQUE(user_id, key)
);
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_config_own" ON public.system_config FOR ALL USING (auth.uid() = user_id);
