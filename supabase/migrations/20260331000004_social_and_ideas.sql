-- Tabella social_posts per tracciare i contenuti pubblicati su canali esterni
CREATE TABLE IF NOT EXISTS public.social_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    client_id uuid REFERENCES public.clients ON DELETE SET NULL,
    content text NOT NULL,
    subject text,
    platforms text[] NOT NULL DEFAULT '{}',
    status text NOT NULL DEFAULT 'draft',
    external_ids jsonb DEFAULT '{}',
    scheduled_at timestamp with time zone,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own social_posts" ON public.social_posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social_posts" ON public.social_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social_posts" ON public.social_posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social_posts" ON public.social_posts
    FOR DELETE USING (auth.uid() = user_id);

-- Tabella analytics per storicizzare le metriche di engagement
CREATE TABLE IF NOT EXISTS public.post_analytics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id uuid REFERENCES public.social_posts ON DELETE CASCADE,
    platform text NOT NULL,
    metrics jsonb NOT NULL DEFAULT '{}',
    recorded_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

-- Accesso alle analytics tramite la ownership del post parent
CREATE POLICY "Users can view their own post_analytics" ON public.post_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.social_posts
            WHERE social_posts.id = post_analytics.post_id
            AND social_posts.user_id = auth.uid()
        )
    );

CREATE POLICY "Server can insert post_analytics" ON public.post_analytics
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.social_posts
            WHERE social_posts.id = post_analytics.post_id
            AND social_posts.user_id = auth.uid()
        )
    );

-- Aggiunge campi mancanti alla tabella ideas (se non esistono già)
ALTER TABLE public.ideas
    ADD COLUMN IF NOT EXISTS title text,
    ADD COLUMN IF NOT EXISTS platforms text[],
    ADD COLUMN IF NOT EXISTS idea_status text DEFAULT 'idea';

-- Aggiunge campi mancanti alla tabella clients per FigJam e vault
ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS figjam_board_id text,
    ADD COLUMN IF NOT EXISTS canva_brand_kit_id text,
    ADD COLUMN IF NOT EXISTS vault_md_content text,
    ADD COLUMN IF NOT EXISTS drive_progetti_id text,
    ADD COLUMN IF NOT EXISTS drive_asset_id text,
    ADD COLUMN IF NOT EXISTS drive_documenti_id text;
