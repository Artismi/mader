CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    triggers TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, slug)
);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skills_user_policy" ON skills FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, key)
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_config_user_policy" ON system_config FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
